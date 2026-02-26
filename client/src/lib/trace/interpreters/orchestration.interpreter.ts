/**
 * Orchestration Interpreter
 *
 * Handles the OrchestrationActionHandler which manages step transitions
 * in the B2C user journey flow. This is the primary handler for tracking
 * which orchestration step (ORCH_CS) the journey is executing.
 *
 * Responsibilities:
 * - Detects step transitions via ORCH_CS statebag changes
 * - Creates new TraceSteps when orchestration step changes
 * - Extracts statebag and claims snapshots
 * - Detects errors from Exception in HandlerResult
 * - Handles retries (same step, new timestamp) as new interactions
 * - Detects SubJourney completion via ORCH_CS signals and pops the journey stack
 *
 * SubJourney Pop Detection:
 *
 * Rule 1 — "No ORCH_CS" pop:
 *   When OrchestrationManager fires with NO ORCH_CS in its HandlerResult
 *   AND we're in a SubJourney, the SubJourney has completed. Pop it and
 *   inherit the child's lastOrchStep into the parent (B2C ORCH_CS is global).
 *
 * Rule 2 — Gap detection (ORCH_CS increases, diff > 1):
 *   Walk up ancestors looking for one where currentOrchStep - ancestor.lastOrchStep == 1.
 *   If found, pop down to that ancestor. If not found, assume steps were skipped
 *   (preconditions etc.) at the current level.
 *
 * Rule 3 — ORCH_CS decrease:
 *   Pop the current SubJourney, then keep popping while currentOrchStep < parent.lastOrchStep.
 *   Step belongs to the first context where currentOrchStep >= lastOrchStep.
 */

import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import { ORCHESTRATION_MANAGER } from "../constants/handlers";
import { StatebagKey, extractTechnicalProfileFromCTP } from "../constants/keys";

/**
 * Threshold in milliseconds to distinguish between log entries belonging 
 * to the same interaction vs. a retry/new interaction.
 */
const NEW_INTERACTION_THRESHOLD_MS = 1000;

/**
 * Interprets OrchestrationActionHandler clips.
 *
 * The orchestration handler is responsible for:
 * 1. Incrementing ORCH_CS (orchestration current step)
 * 2. Managing the overall journey flow
 * 3. Coordinating between different step types
 * 4. Detecting retries based on timestamp gaps
 * 5. Detecting SubJourney completions and popping the journey stack
 */
export class OrchestrationInterpreter extends BaseInterpreter {
    readonly handlerNames = [ORCHESTRATION_MANAGER] as const;

    private lastTimestamp: number | null = null;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerResult, journeyStack, timestamp, stepBuilder } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        // ─── Rule 1: "No ORCH_CS" → SubJourney completed ────────────────────
        // When OrchestrationManager fires with NO ORCH_CS in its result AND we're
        // inside a SubJourney, the current SubJourney has no more steps → pop it.
        // The parent inherits the global ORCH_CS (child's last value) because
        // B2C statebag ORCH_CS is a single shared value across all contexts.
        const hasNewOrchCS = StatebagKey.ORCH_CS in statebagUpdates;

        if (!hasNewOrchCS && journeyStack.isInSubJourney()) {
            return this.successFinalizeStep({ statebagUpdates, claimsUpdates, popSubJourney: 1 });
        }

        const currentOrchStep = this.extractOrchStep({
            ...context.statebag,
            ...statebagUpdates,
        });

        // Extract CTP (Current Technical Profile) ONLY if it was set in THIS handler's result.
        // This prevents leakage of CTP from previous steps to subsequent steps.
        // The CTP persists in statebag across steps, but should only be associated
        // with the step where it was SET, not all subsequent steps.
        const technicalProfile = this.extractCurrentTechnicalProfile(statebagUpdates);

        // Check for exception
        const hasException = !!handlerResult.Exception;
        const errorMessage = handlerResult.Exception?.Message;

        // Check if this is a new interaction based on timestamp gap
        const currentTimestamp = timestamp.getTime();
        const isNewInteraction = this.lastTimestamp !== null && 
            (currentTimestamp - this.lastTimestamp) > NEW_INTERACTION_THRESHOLD_MS;
        
        // Reset state if this is a new interaction (scoped to current context)
        if (isNewInteraction) {
            journeyStack.current().lastOrchStep = 0;
        }

        const contextLastOrchStep = journeyStack.current().lastOrchStep;
        const stepChanged = currentOrchStep > 0 && currentOrchStep !== contextLastOrchStep;

        if (stepChanged) {
            let popCount = 0;

            // ─── Rule 3: ORCH_CS decrease → pop until valid context ──────────
            if (currentOrchStep < contextLastOrchStep && journeyStack.isInSubJourney()) {
                const fullStack = journeyStack.getFullStack();
                popCount = 1; // At least pop the current SubJourney
                // Walk upward: keep popping while the ancestor's lastOrchStep > currentOrchStep
                for (let i = fullStack.length - 2; i >= 1; i--) {
                    if (currentOrchStep < fullStack[i].lastOrchStep) {
                        popCount++;
                    } else {
                        break;
                    }
                }
            }
            // ─── Rule 2: Gap detection (increase, diff > 1) ─────────────────
            else if (currentOrchStep > contextLastOrchStep) {
                const diff = currentOrchStep - contextLastOrchStep;
                if (diff > 1 && journeyStack.isInSubJourney()) {
                    popCount = this.computeGapPopCount(journeyStack, currentOrchStep);
                }
            }

            this.lastTimestamp = currentTimestamp;

            return this.successCreateStep({
                statebagUpdates,
                claimsUpdates,
                actionHandler: ORCHESTRATION_MANAGER,
                stepResult: hasException ? "Error" : "Success",
                error: errorMessage,
                popSubJourney: popCount > 0 ? popCount : undefined,
            });
        }

        // Update timestamp even if step didn't change
        this.lastTimestamp = currentTimestamp;

        // Apply technical profile directly to step builder for non-createStep cases
        if (technicalProfile) {
            stepBuilder.addTechnicalProfile(technicalProfile);
        }

        // Even if step didn't change, check for error on current step
        if (hasException) {
            return this.successNoOp({
                statebagUpdates,
                claimsUpdates,
                stepResult: "Error",
                error: errorMessage,
            });
        }

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
        });
    }

    /**
     * Rule 2 implementation: walk the stack read-only looking for an ancestor where
     * `currentOrchStep - ancestor.lastOrchStep == 1`. Returns the number of levels to pop.
     */
    private computeGapPopCount(
        journeyStack: InterpretContext["journeyStack"],
        currentOrchStep: number,
    ): number {
        const fullStack = journeyStack.getFullStack();
        for (let i = fullStack.length - 2; i >= 0; i--) {
            if (currentOrchStep - fullStack[i].lastOrchStep === 1) {
                return fullStack.length - 1 - i;
            }
        }
        return 0; // No ancestor matched → assume skipped steps, don't pop
    }

    /**
     * Extracts the current technical profile from CTP statebag entry.
     * Handles both full statebag format (from context.statebag) and
     * flattened format (from extractStatebagFromResult).
     */
    private extractCurrentTechnicalProfile(statebag: Record<string, unknown>): string | null {
        const ctp = statebag[StatebagKey.CTP];
        if (!ctp) {
            return null;
        }

        // Handle flattened format: just the value string
        if (typeof ctp === "string") {
            return extractTechnicalProfileFromCTP(ctp);
        }

        // Handle full format: { v: "...", k: "...", ... }
        if (typeof ctp === "object") {
            const ctpEntry = ctp as { v?: string };
            if (ctpEntry.v) {
                return extractTechnicalProfileFromCTP(ctpEntry.v);
            }
        }

        return null;
    }

    reset(): void {
        this.lastTimestamp = null;
    }
}

/**
 * Factory function for creating OrchestrationInterpreter instances.
 */
export function createOrchestrationInterpreter(): OrchestrationInterpreter {
    return new OrchestrationInterpreter();
}
