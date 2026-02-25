/**
 * Result Applicator
 *
 * Applies InterpretResult from interpreters to the ClipProcessingContext.
 * This is a mechanical extraction of the applyInterpretResult, finalizeCurrentStep,
 * and mergeWithExistingStep methods from the old TraceParser, adapted to work
 * with ClipProcessingContext instead of the parser's internal state.
 *
 * IMPORTANT: The logic in this file should match the original trace-parser.ts
 * behavior exactly. Changes should only be made to adapt the state access pattern.
 */

import type { TraceStep } from "@/types/trace";
import type { InterpretResult } from "../interpreters/base-interpreter";
import type { ClipProcessingContext } from "./clip-processing-context";
import { DEDUP_THRESHOLD_MS } from "../constants/keys";
import { TraceStepBuilder } from "../domain/trace-step-builder";

export class ResultApplicator {
    /**
     * Applies an InterpretResult to the processing context.
     * Extracted from TraceParser.applyInterpretResult.
     */
    apply(result: InterpretResult, ctx: ClipProcessingContext): void {
        if (!result.success) {
            if (result.error) {
                ctx.errors.push(result.error);
            }
            return;
        }

        // Handle step creation BEFORE applying statebag updates
        // This ensures the step gets the statebag state from BEFORE the current handler
        if (result.createStep) {
            // Finalize current step if it has a valid stepOrder
            this.finalizeCurrentStep(ctx);

            // Clear the statebag but keep claims - B2C statebag is step-scoped
            // but claims (Complex-CLMS) persist across steps
            ctx.statebag.clearStatebagKeepClaims();

            // Now apply statebag updates for this new step
            if (result.statebagUpdates) {
                ctx.statebag.applyUpdates(result.statebagUpdates);
            }

            if (result.claimsUpdates) {
                ctx.statebag.applyClaimsUpdates(result.claimsUpdates);
            }

            // Create the new step builder with the data from the interpreter
            const context = ctx.journeyStack.current();
            ctx.currentStepBuilder = TraceStepBuilder.create()
                .withSequence(ctx.sequenceNumber++)
                .withTimestamp(ctx.currentTimestamp)
                .withLogId(ctx.currentLogId)
                .withEventType(ctx.currentEventType)
                .withJourneyContext(context.journeyId, context.journeyName)
                .withOrchStep(context.lastOrchStep)
                .withActionHandler(result.actionHandler ?? "")
                .calculateGraphNodeId();

            // Apply any error from the result
            if (result.stepResult === "Error" && result.error) {
                ctx.currentStepBuilder.withError(result.error, result.errorHResult);
            } else if (result.stepResult) {
                ctx.currentStepBuilder.withResult(result.stepResult);
            }
        } else {
            // For non-step-creating results, apply statebag updates normally
            if (result.statebagUpdates) {
                ctx.statebag.applyUpdates(result.statebagUpdates);
            }

            if (result.claimsUpdates) {
                ctx.statebag.applyClaimsUpdates(result.claimsUpdates);
            }

            // Apply error state to current step even without creating a new step
            if (ctx.currentStepBuilder && result.stepResult === "Error") {
                if (result.error) {
                    ctx.currentStepBuilder.withError(result.error, result.errorHResult);
                } else {
                    ctx.currentStepBuilder.withResult("Error");
                }
            }
        }

        if (result.pushSubJourney) {
            ctx.journeyStack.push({
                journeyId: result.pushSubJourney.journeyId,
                journeyName: result.pushSubJourney.journeyName,
                timestamp: ctx.currentTimestamp,
            });
        }

        if (result.popSubJourney) {
            ctx.journeyStack.pop();
        }

        // Apply technical profiles and selectable options to current step
        if (ctx.currentStepBuilder) {
            // Clear selectable options when a TP is definitively triggered
            // This prevents HRD options from leaking to ClaimsExchange steps
            if (result.clearSelectableOptions) {
                ctx.currentStepBuilder.clearSelectableOptions();
            }

            if (result.technicalProfiles) {
                const tpSnapshot = ctx.statebag.getClaimsSnapshot();
                for (const tp of result.technicalProfiles) {
                    ctx.currentStepBuilder.addTechnicalProfile(tp);
                    // Auto-create detail with snapshot so per-TP diff works
                    // even for interpreters that don't produce full details.
                    // addTechnicalProfileDetail handles merge if detail already exists.
                    ctx.currentStepBuilder.addTechnicalProfileDetail({
                        id: tp,
                        providerType: "",
                        claimsSnapshot: tpSnapshot,
                    });
                }
            }

            if (result.selectableOptions) {
                for (const option of result.selectableOptions) {
                    ctx.currentStepBuilder.addSelectableOption(option);
                }
                if (result.selectableOptions.length > 1) {
                    ctx.currentStepBuilder.asInteractiveStep();
                }
            }

            if (result.isInteractive) {
                ctx.currentStepBuilder.asInteractiveStep();
            }

            if (result.subJourneyId) {
                ctx.currentStepBuilder.withSubJourneyId(result.subJourneyId);
            }

            // Apply new fields for backend API calls, UI settings, SSO, and verification
            if (result.backendApiCalls) {
                for (const call of result.backendApiCalls) {
                    ctx.currentStepBuilder.addBackendApiCall(call);
                }
            }

            if (result.uiSettings) {
                ctx.currentStepBuilder.withUiSettings(result.uiSettings);
            }

            if (result.ssoSessionParticipant !== undefined) {
                ctx.currentStepBuilder.withSsoSessionParticipant(result.ssoSessionParticipant);
            }

            if (result.ssoSessionActivated !== undefined) {
                ctx.currentStepBuilder.withSsoSessionActivated(result.ssoSessionActivated);
            }

            if (result.isVerificationStep) {
                ctx.currentStepBuilder.asVerificationStep();
            }

            if (result.hasVerificationContext !== undefined) {
                ctx.currentStepBuilder.withVerificationContext(result.hasVerificationContext);
            }

            if (result.interactionResult) {
                ctx.currentStepBuilder.withInteractionResult(result.interactionResult);
            }

            if (result.submittedClaims) {
                ctx.currentStepBuilder.withSubmittedClaims(result.submittedClaims);
            }

            if (result.technicalProfileDetails) {
                const snapshot = ctx.statebag.getClaimsSnapshot();
                for (const detail of result.technicalProfileDetails) {
                    detail.claimsSnapshot = snapshot;
                    ctx.currentStepBuilder.addTechnicalProfileDetail(detail);
                }
            }

            if (result.claimsTransformations) {
                for (const ct of result.claimsTransformations) {
                    ctx.currentStepBuilder.addClaimsTransformationDetail(ct);
                }
            }
        }

        if (result.finalizeStep && ctx.currentStepBuilder) {
            if (result.stepResult) {
                ctx.currentStepBuilder.withResult(result.stepResult);
            }
            if (result.error) {
                ctx.currentStepBuilder.withError(result.error, result.errorHResult);
            }
            this.finalizeCurrentStep(ctx);
        }
    }

    /**
     * Finalizes the current step and adds it to the trace.
     * Only adds steps with valid stepOrder > 0.
     * Uses timestamp-based deduplication to distinguish between
     * the same step in different user interactions.
     *
     * Extracted from TraceParser.finalizeCurrentStep.
     */
    finalizeCurrentStep(ctx: ClipProcessingContext): void {
        const builder = ctx.currentStepBuilder;
        if (!builder) return;

        builder
            .withStatebag(ctx.statebag.getStatebagSnapshot())
            .withClaims(ctx.statebag.getClaimsSnapshot());

        const step = builder.build();

        // Only add steps with valid stepOrder (skip step 0) UNLESS it's an error step
        // Error steps with stepOrder 0 represent early validation failures before orchestration starts
        const isErrorStep = step.result === "Error" && step.errorMessage;
        if (step.stepOrder <= 0 && !isErrorStep) {
            ctx.currentStepBuilder = null;
            return;
        }

        const stepKey = `${step.journeyContextId}-${step.stepOrder}`;
        const lastTimestamp = ctx.lastStepTimestamps.get(stepKey);
        const currentTimestamp = step.timestamp.getTime();

        // Steps more than DEDUP_THRESHOLD_MS apart are considered separate interactions
        const isNewInteraction = !lastTimestamp || currentTimestamp - lastTimestamp > DEDUP_THRESHOLD_MS;

        if (ctx.processedStepKeys.has(stepKey) && !isNewInteraction) {
            this.mergeWithExistingStep(step, ctx);
        } else {
            ctx.processedStepKeys.add(stepKey);
            ctx.lastStepTimestamps.set(stepKey, currentTimestamp);
            ctx.traceSteps.push(step);
            ctx.executionMap.addStep(step);
        }

        ctx.currentStepBuilder = null;
    }

    /**
     * Merges a duplicate step with an existing one.
     * Extracted from TraceParser.mergeWithExistingStep.
     */
    private mergeWithExistingStep(step: TraceStep, ctx: ClipProcessingContext): void {
        const existing = ctx.traceSteps.find(
            (s) => s.journeyContextId === step.journeyContextId && s.stepOrder === step.stepOrder,
        );

        if (!existing) return;

        for (const tp of step.technicalProfiles) {
            if (!existing.technicalProfiles.includes(tp)) {
                existing.technicalProfiles.push(tp);
            }
        }

        // Also merge technicalProfileDetails to preserve per-TP snapshots
        if (step.technicalProfileDetails) {
            if (!existing.technicalProfileDetails) {
                existing.technicalProfileDetails = [];
            }
            for (const detail of step.technicalProfileDetails) {
                if (!existing.technicalProfileDetails.some((d) => d.id === detail.id)) {
                    existing.technicalProfileDetails.push(detail);
                }
            }
        }

        existing.statebagSnapshot = step.statebagSnapshot;
        existing.claimsSnapshot = step.claimsSnapshot;
    }
}
