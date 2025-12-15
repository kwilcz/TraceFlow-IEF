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
 */
export class OrchestrationInterpreter extends BaseInterpreter {
    readonly handlerNames = [ORCHESTRATION_MANAGER] as const;

    private lastOrchStep = 0;
    private lastTimestamp: number | null = null;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerResult, journeyStack, timestamp } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

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
        
        // Reset state if this is a new interaction
        if (isNewInteraction) {
            this.lastOrchStep = 0;
        }

        const stepChanged = currentOrchStep > 0 && currentOrchStep !== this.lastOrchStep;

        if (stepChanged) {
            this.lastOrchStep = currentOrchStep;
            this.lastTimestamp = currentTimestamp;
            journeyStack.updateOrchStep(currentOrchStep);

            return this.successCreateStep({
                statebagUpdates,
                claimsUpdates,
                actionHandler: ORCHESTRATION_MANAGER,
                stepResult: hasException ? "Error" : "Success",
                error: errorMessage,
                technicalProfiles: technicalProfile ? [technicalProfile] : undefined,
            });
        }

        // Update timestamp even if step didn't change
        this.lastTimestamp = currentTimestamp;

        // Even if step didn't change, check for error on current step
        if (hasException) {
            return this.successNoOp({
                statebagUpdates,
                claimsUpdates,
                stepResult: "Error",
                error: errorMessage,
                technicalProfiles: technicalProfile ? [technicalProfile] : undefined,
            });
        }

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            technicalProfiles: technicalProfile ? [technicalProfile] : undefined,
        });
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
        this.lastOrchStep = 0;
        this.lastTimestamp = null;
    }
}

/**
 * Factory function for creating OrchestrationInterpreter instances.
 */
export function createOrchestrationInterpreter(): OrchestrationInterpreter {
    return new OrchestrationInterpreter();
}
