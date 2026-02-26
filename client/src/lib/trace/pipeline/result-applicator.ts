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
import type {
    FlowNode,
    FlowNodeContext,
    StepFlowData,
    TechnicalProfileFlowData,
    ClaimsTransformationFlowData,
    HomeRealmDiscoveryFlowData,
    DisplayControlFlowData,
} from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";
import type { FlowTreeBuilder } from "../domain/flow-tree-builder";
import { DEDUP_THRESHOLD_MS, StatebagKey, extractTechnicalProfileFromCTP } from "../constants/keys";
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

        const needsPop = result.popSubJourney != null && result.popSubJourney > 0;

        // ─── Step creation path ─────────────────────────────────────────
        if (result.createStep) {
            // 1. Finalize the PREVIOUS step in its CURRENT context (before any pops)
            //    This ensures the previous step is placed in the correct FlowTree parent.
            this.finalizeCurrentStep(ctx);

            // 2. Pop SubJourneys AFTER finalizing (Rules 2/3).
            //    The NEW step belongs to the parent context.
            if (needsPop) {
                this.popSubJourneys(result.popSubJourney!, ctx);
            }

            // 3. Sync orchStep from ORCH_CS (after pops, before step creation)
            this.syncOrchStepFromStatebag(result, ctx);

            // 4. Clear statebag and create new step
            ctx.statebag.clearStatebagKeepClaims();

            if (result.statebagUpdates) {
                ctx.statebag.applyUpdates(result.statebagUpdates);
            }

            if (result.claimsUpdates) {
                ctx.statebag.applyClaimsUpdates(result.claimsUpdates);
            }

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

            if (result.statebagUpdates) {
                const ctpValue = result.statebagUpdates[StatebagKey.CTP];
                if (ctpValue) {
                    const tp = extractTechnicalProfileFromCTP(ctpValue);
                    if (tp) {
                        ctx.currentStepBuilder.addTechnicalProfile(tp);
                    }
                }
            }

            if (result.stepResult === "Error" && result.error) {
                ctx.currentStepBuilder.withError(result.error, result.errorHResult);
            } else if (result.stepResult) {
                ctx.currentStepBuilder.withResult(result.stepResult);
            }
        } else {
            // ─── Non-step-creating: apply statebag updates ──────────────
            if (result.statebagUpdates) {
                ctx.statebag.applyUpdates(result.statebagUpdates);
            }

            if (result.claimsUpdates) {
                ctx.statebag.applyClaimsUpdates(result.claimsUpdates);
            }

            if (ctx.currentStepBuilder && result.stepResult === "Error") {
                if (result.error) {
                    ctx.currentStepBuilder.withError(result.error, result.errorHResult);
                } else {
                    ctx.currentStepBuilder.withResult("Error");
                }
            }
        }

        // ─── Push SubJourney ────────────────────────────────────────────
        if (result.pushSubJourney) {
            // Finalize the current step BEFORE pushing so it's placed in
            // the correct FlowTree parent (the current context, not the
            // SubJourney we're about to enter).
            this.finalizeCurrentStep(ctx);

            ctx.journeyStack.push({
                journeyId: result.pushSubJourney.journeyId,
                journeyName: result.pushSubJourney.journeyName,
                timestamp: ctx.currentTimestamp,
            });

            const sjContext = ctx.journeyStack.current();
            ctx.flowTreeBuilder.pushSubJourney(
                result.pushSubJourney.journeyId,
                result.pushSubJourney.journeyName,
                sjContext.lastOrchStep,
                this.buildFlowNodeContext(ctx),
            );
        }

        // ─── Finalize step ──────────────────────────────────────────────
        if (result.finalizeStep && ctx.currentStepBuilder) {
            if (result.stepResult) {
                ctx.currentStepBuilder.withResult(result.stepResult);
            }
            if (result.error) {
                ctx.currentStepBuilder.withError(result.error, result.errorHResult);
            }
            this.finalizeCurrentStep(ctx);
        }

        // ─── Pop-after-finalize: for finalizeStep + pop (Rule 1) ────────
        if (needsPop && !result.createStep) {
            this.popSubJourneys(result.popSubJourney!, ctx);
        }
    }

    /**
     * Pops N SubJourney levels from both JourneyStack and FlowTreeBuilder.
     * After all pops, the parent inherits the last popped child's orchStep
     * because B2C ORCH_CS is a global shared statebag value.
     */
    private popSubJourneys(count: number, ctx: ClipProcessingContext): void {
        let lastPoppedOrchStep = 0;
        for (let i = 0; i < count; i++) {
            const popped = ctx.journeyStack.pop();
            ctx.flowTreeBuilder.popSubJourney();
            if (popped) {
                lastPoppedOrchStep = popped.lastOrchStep;
            }
        }
        ctx.journeyStack.current().lastOrchStep = lastPoppedOrchStep;
    }

    /**
     * Updates the journey stack's orchStep from ORCH_CS in the result's statebag updates.
     * Replaces the direct `journeyStack.updateOrchStep()` that was previously called
     * by OrchestrationInterpreter. Must run AFTER pops and BEFORE step creation.
     */
    private syncOrchStepFromStatebag(result: InterpretResult, ctx: ClipProcessingContext): void {
        if (result.statebagUpdates) {
            const orchCSValue = result.statebagUpdates[StatebagKey.ORCH_CS];
            if (orchCSValue) {
                const orchStep = parseInt(orchCSValue, 10);
                if (!isNaN(orchStep) && orchStep > 0) {
                    ctx.journeyStack.updateOrchStep(orchStep);
                }
            }
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

            // Record this step in the flow tree.
            // Skip steps that are SubJourney invocations — the SubJourney
            // node represents that step in the tree.
            if (!step.subJourneyId) {
                const flowCtx = this.buildFlowNodeContext(ctx);
                const stepData = this.buildStepFlowData(step, ctx.traceSteps.length - 1);
                const stepNode = ctx.flowTreeBuilder.addStep(stepData, flowCtx);
                this.populateStepChildren(stepNode, step, ctx.flowTreeBuilder, flowCtx);
            }
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

    /**
     * Creates a FlowNodeContext snapshot from the current processing context.
     */
    private buildFlowNodeContext(ctx: ClipProcessingContext): FlowNodeContext {
        return {
            timestamp: ctx.currentTimestamp,
            sequenceNumber: ctx.sequenceNumber,
            logId: ctx.currentLogId,
            eventType: ctx.currentEventType,
            statebagSnapshot: ctx.statebag.getStatebagSnapshot(),
            claimsSnapshot: ctx.statebag.getClaimsSnapshot(),
        };
    }

    /**
     * Transcribes a TraceStep into a StepFlowData payload for the FlowNode tree.
     */
    private buildStepFlowData(step: TraceStep, stepIndex: number): StepFlowData {
        return {
            type: FlowNodeType.Step,
            stepIndex,
            stepOrder: step.stepOrder,
            currentJourneyName: step.currentJourneyName,
            result: step.result,
            duration: step.duration,
            errorMessage: step.errorMessage,
            errorHResult: step.errorHResult,
            actionHandler: step.actionHandler,
            uiSettings: step.uiSettings,
            selectableOptions: [...step.selectableOptions],
            selectedOption: step.selectedOption,
            backendApiCalls: step.backendApiCalls,
        };
    }

    /**
     * Builds child FlowNodes (TP, CT, HRD, DC) from TraceStep data
     * and attaches them to the step FlowNode.
     */
    private populateStepChildren(
        stepNode: FlowNode,
        step: TraceStep,
        builder: FlowTreeBuilder,
        context: FlowNodeContext,
    ): void {
        // Build TechnicalProfile children from technicalProfileDetails
        if (step.technicalProfileDetails) {
            for (const tpDetail of step.technicalProfileDetails) {
                const tpData: TechnicalProfileFlowData = {
                    type: FlowNodeType.TechnicalProfile,
                    technicalProfileId: tpDetail.id,
                    providerType: tpDetail.providerType,
                    protocolType: tpDetail.protocolType,
                    claimsSnapshot: tpDetail.claimsSnapshot,
                    claimMappings: undefined,
                };
                const tpNode = builder.addTechnicalProfile(stepNode, tpData, context);

                // Nested CTs under this TP
                if (tpDetail.claimsTransformations) {
                    for (const ct of tpDetail.claimsTransformations) {
                        builder.addClaimsTransformation(tpNode, {
                            type: FlowNodeType.ClaimsTransformation,
                            transformationId: ct.id,
                            inputClaims: ct.inputClaims,
                            inputParameters: ct.inputParameters,
                            outputClaims: ct.outputClaims,
                        }, context);
                    }
                }
            }
        }

        // Build Validation TP children (as TechnicalProfile FlowNodes nested under their parent TP)
        // Note: validationTechnicalProfiles are TP IDs, they don't have full detail yet
        // They will become richer when interpreters are enhanced
        if (step.validationTechnicalProfiles) {
            // Find the parent TP node (the self-asserted TP that invoked validations)
            // Typically, the last TP in the step is the self-asserted one
            const parentTpNode = stepNode.children.find(
                (c) => c.type === FlowNodeType.TechnicalProfile
            );
            if (parentTpNode) {
                for (const vtpId of step.validationTechnicalProfiles) {
                    // Only add if not already present (some vtps may already be in technicalProfileDetails)
                    const alreadyExists = parentTpNode.children.some(
                        (c) => c.data.type === FlowNodeType.TechnicalProfile
                              && c.data.technicalProfileId === vtpId
                    );
                    if (!alreadyExists) {
                        builder.addTechnicalProfile(parentTpNode, {
                            type: FlowNodeType.TechnicalProfile,
                            technicalProfileId: vtpId,
                            providerType: "Unknown", // will be enriched when interpreters improve
                        }, context);
                    }
                }
            }
        }

        // Build orphan ClaimsTransformation children (CTs not under a TP)
        // These are CTs in claimsTransformationDetails that aren't nested in any TP
        const tpCTIds = new Set<string>();
        if (step.technicalProfileDetails) {
            for (const tp of step.technicalProfileDetails) {
                if (tp.claimsTransformations) {
                    for (const ct of tp.claimsTransformations) {
                        tpCTIds.add(ct.id);
                    }
                }
            }
        }
        for (const ct of step.claimsTransformationDetails) {
            if (!tpCTIds.has(ct.id)) {
                builder.addClaimsTransformation(stepNode, {
                    type: FlowNodeType.ClaimsTransformation,
                    transformationId: ct.id,
                    inputClaims: ct.inputClaims,
                    inputParameters: ct.inputParameters,
                    outputClaims: ct.outputClaims,
                }, context);
            }
        }

        // Build HRD child if step has selectable options
        if (step.selectableOptions.length > 0) {
            builder.addHomeRealmDiscovery(stepNode, {
                type: FlowNodeType.HomeRealmDiscovery,
                selectableOptions: [...step.selectableOptions],
                selectedOption: step.selectedOption,
                uiSettings: step.uiSettings,
            }, context);
        }

        // Build DisplayControl children
        for (const dcAction of step.displayControlActions) {
            const dcData: DisplayControlFlowData = {
                type: FlowNodeType.DisplayControl,
                displayControlId: dcAction.displayControlId,
                action: dcAction.action,
                resultCode: dcAction.resultCode,
                claimMappings: dcAction.claimMappings,
            };
            const dcNode = builder.addDisplayControl(stepNode, dcData, context);

            // Build TP children under DC
            if (dcAction.technicalProfiles) {
                for (const dcTp of dcAction.technicalProfiles) {
                    const dcTpNode = builder.addTechnicalProfile(dcNode, {
                        type: FlowNodeType.TechnicalProfile,
                        technicalProfileId: dcTp.technicalProfileId,
                        providerType: "DisplayControlProvider",
                        claimMappings: dcTp.claimMappings,
                    }, context);

                    // CTs under DC TP
                    if (dcTp.claimsTransformations) {
                        for (const ct of dcTp.claimsTransformations) {
                            builder.addClaimsTransformation(dcTpNode, {
                                type: FlowNodeType.ClaimsTransformation,
                                transformationId: ct.id,
                                inputClaims: ct.inputClaims,
                                inputParameters: ct.inputParameters,
                                outputClaims: ct.outputClaims,
                            }, context);
                        }
                    }
                }
            }
        }

        // Build claim mappings on step-level TP nodes (from validationTechnicalProfile results)
        if (step.claimMappings && step.claimMappings.length > 0) {
            // Find the primary TP or last validation TP to attach mappings
            const tpNodes = stepNode.children.filter(
                (c) => c.type === FlowNodeType.TechnicalProfile
            );
            if (tpNodes.length > 0) {
                const lastTp = tpNodes[tpNodes.length - 1];
                if (lastTp.data.type === FlowNodeType.TechnicalProfile) {
                    (lastTp.data as { claimMappings: typeof step.claimMappings }).claimMappings = step.claimMappings;
                }
            }
        }
    }
}
