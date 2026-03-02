/**
 * Step Lifecycle Manager
 *
 * Orchestrates step creation, finalization, and SubJourney push/pop
 * in response to InterpretResult signals from interpreters.
 *
 * Builds StepFlowData directly from the pipeline context and
 * PendingStepData — no TraceStep or TraceStepBuilder intermediary.
 * Child FlowNodes come from `ctx.pendingFlowChildren` (populated by
 * interpreters via `FlowNodeChild[]`).
 */

import type { InterpretResult } from "../interpreters/base-interpreter";
import type { ClipProcessingContext } from "./clip-processing-context";
import { createDefaultPendingStepData } from "./clip-processing-context";
import type {
    FlowNodeContext,
    FlowNodeChild,
    StepFlowData,
    StepError,
    HomeRealmDiscoveryFlowData,
    TechnicalProfileFlowData,
    ClaimsTransformationFlowData,
} from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";
import { DEDUP_THRESHOLD_MS, StatebagKey } from "../constants/keys";

export class StepLifecycleManager {
    /** Tracks whether a step is currently being accumulated */
    private hasActiveStep = false;
    /** Journey context ID for the active step (for dedup) */
    private activeJourneyId = "";
    /** Orch step for the active step */
    private activeOrchStep = 0;
    /** Sequence number assigned to the active step */
    private activeSequenceNumber = 0;
    /** Timestamp of the active step */
    private activeTimestamp = new Date();
    /** Log ID captured at step creation time */
    private activeLogId = "";
    /** Event type captured at step creation time */
    private activeEventType = "";

    /**
     * Applies an InterpretResult to the processing context.
     * Handles step creation, SubJourney push/pop, and finalization.
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
            this.finalizeCurrentStep(ctx);

            // 2. Pop SubJourneys AFTER finalizing (Rules 2/3).
            if (needsPop) {
                this.popSubJourneys(result.popSubJourney!, ctx);
            }

            // 3. Sync orchStep from ORCH_CS (after pops, before step creation)
            this.syncOrchStepFromStatebag(result, ctx);

            // 4. Clear statebag and create new step data
            ctx.statebag.clearStatebagKeepClaims();

            if (result.statebagUpdates) {
                ctx.statebag.applyUpdates(result.statebagUpdates);
            }

            if (result.claimsUpdates) {
                ctx.statebag.applyClaimsUpdates(result.claimsUpdates);
            }

            // Reset pending step data for the new step
            ctx.pendingStepData = createDefaultPendingStepData();
            ctx.pendingStepData.actionHandler = result.actionHandler ?? undefined;

            // Track active step metadata
            const context = ctx.journeyStack.current();
            this.hasActiveStep = true;
            this.activeJourneyId = context.journeyId;
            this.activeOrchStep = context.lastOrchStep;
            this.activeSequenceNumber = ctx.sequenceNumber++;
            this.activeTimestamp = ctx.currentTimestamp;
            this.activeLogId = ctx.currentLogId;
            this.activeEventType = ctx.currentEventType;

            if (result.stepResult === "Error" && result.error) {
                ctx.pendingStepData.result = "Error";
                ctx.pendingStepData.errorMessage = result.error;
                ctx.pendingStepData.errorHResult = result.errorHResult;
            } else if (result.stepResult) {
                ctx.pendingStepData.result = result.stepResult;
            }
        } else {
            // ─── Non-step-creating: apply statebag updates ──────────────
            if (result.statebagUpdates) {
                ctx.statebag.applyUpdates(result.statebagUpdates);
            }

            if (result.claimsUpdates) {
                ctx.statebag.applyClaimsUpdates(result.claimsUpdates);
            }

            if (this.hasActiveStep && result.stepResult === "Error") {
                if (result.error) {
                    ctx.pendingStepData.result = "Error";
                    ctx.pendingStepData.errorMessage = result.error;
                    ctx.pendingStepData.errorHResult = result.errorHResult;
                } else {
                    ctx.pendingStepData.result = "Error";
                }
            }
        }

        // ─── Push SubJourney ────────────────────────────────────────────
        if (result.pushSubJourney) {
            // Discard the invocation step — it only exists to push the SubJourney
            // and should not appear as a visible Step node in the FlowNode tree.
            this.resetActiveStep(ctx);

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
        if (result.finalizeStep && this.hasActiveStep) {
            if (result.stepResult) {
                ctx.pendingStepData.result = result.stepResult;
            }
            if (result.error) {
                ctx.pendingStepData.result = "Error";
                ctx.pendingStepData.errorMessage = result.error;
                ctx.pendingStepData.errorHResult = result.errorHResult;
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
     * Finalizes the current step and adds it to the FlowNode tree.
     *
     * Builds StepFlowData directly from ctx.pendingStepData and pipeline context.
     * No TraceStep intermediary.
     */
    finalizeCurrentStep(ctx: ClipProcessingContext): void {
        if (!this.hasActiveStep) return;

        const orchStep = this.activeOrchStep;
        const journeyId = this.activeJourneyId;
        const pending = ctx.pendingStepData;

        // Only add steps with valid stepOrder (skip step 0) UNLESS it's an error step
        const isErrorStep = pending.result === "Error" && pending.errorMessage;
        if (orchStep <= 0 && !isErrorStep) {
            this.resetActiveStep(ctx);
            return;
        }

        const currentJourney = ctx.journeyStack.current();
        const stepKey = `${journeyId}-${orchStep}`;
        const lastTimestamp = ctx.lastStepTimestamps.get(stepKey);
        const currentTimestamp = this.activeTimestamp.getTime();
        const isNewInteraction = !lastTimestamp || currentTimestamp - lastTimestamp > DEDUP_THRESHOLD_MS;

        if (ctx.processedStepKeys.has(stepKey) && !isNewInteraction) {
            // Duplicate step within dedup window — skip (FlowNode tree already has this step)
            this.resetActiveStep(ctx);
            return;
        }

        ctx.processedStepKeys.add(stepKey);
        ctx.lastStepTimestamps.set(stepKey, currentTimestamp);

        // Build StepFlowData directly from pending step data
        const errors: StepError[] = [...ctx.pendingStepErrors];
        if (pending.errorMessage) {
            const alreadyPresent = errors.some(e => e.message === pending.errorMessage);
            if (!alreadyPresent) {
                errors.push({
                    kind: "Unhandled",
                    hResult: pending.errorHResult ?? "",
                    message: pending.errorMessage,
                });
            }
        }

        // Extract selectableOptions from pending HRD flow children
        // (StepInvokeInterpreter puts them on HRD FlowNodeChild, not on pendingStepData)
        for (const child of ctx.pendingFlowChildren) {
            if (child.data.type === FlowNodeType.HomeRealmDiscovery) {
                const hrdData = child.data as HomeRealmDiscoveryFlowData;
                for (const opt of hrdData.selectableOptions) {
                    if (!pending.selectableOptions.includes(opt)) {
                        pending.selectableOptions.push(opt);
                    }
                }
            }
        }

        const stepData: StepFlowData = {
            type: FlowNodeType.Step,
            stepOrder: orchStep,
            currentJourneyName: currentJourney.journeyName,
            result: pending.result,
            errors,
            actionHandler: pending.actionHandler,
            uiSettings: pending.uiSettings,
            selectableOptions: [...pending.selectableOptions],
            selectedOption: pending.selectedOption,
            backendApiCalls: pending.backendApiCalls.length > 0 ? pending.backendApiCalls : undefined,
        };

        // Add step to the flow tree
        const flowCtx = this.buildFlowNodeContext(ctx);
        const stepNode = ctx.flowTreeBuilder.addStep(stepData, flowCtx);

        // Add to execution map using the FlowNode.id so lookups match
        ctx.executionMap.addStep({
            graphNodeId: stepNode.id,
            result: pending.result,
            sequenceNumber: this.activeSequenceNumber,
        });

        // Attach accumulated children from interpreters (deduplicated)
        if (ctx.pendingFlowChildren.length > 0) {
            const deduped = this.deduplicateFlowChildren(ctx.pendingFlowChildren);
            ctx.flowTreeBuilder.attachChildren(stepNode, deduped, flowCtx);
        }

        this.resetActiveStep(ctx);
    }

    /**
     * Resets the active step tracking state.
     */
    private resetActiveStep(ctx: ClipProcessingContext): void {
        this.hasActiveStep = false;
        this.activeJourneyId = "";
        this.activeOrchStep = 0;
        this.activeLogId = "";
        this.activeEventType = "";
        ctx.pendingStepData = createDefaultPendingStepData();
        ctx.pendingFlowChildren = [];
        ctx.pendingStepErrors = [];
    }

    /**
     * Creates a FlowNodeContext snapshot using creation-time metadata
     * for identity fields (timestamp, sequenceNumber, logId, eventType)
     * and current-time snapshots for statebag/claims.
     */
    private buildFlowNodeContext(ctx: ClipProcessingContext): FlowNodeContext {
        return {
            timestamp: this.activeTimestamp,
            sequenceNumber: this.activeSequenceNumber,
            logId: this.activeLogId,
            eventType: this.activeEventType,
            statebagSnapshot: ctx.statebag.getStatebagSnapshot(),
            claimsSnapshot: ctx.statebag.getClaimsSnapshot(),
        };
    }

    /**
     * Deduplicates FlowNodeChild entries.
     *
     * Multiple interpreters in the clip pipeline independently extract the
     * same TechnicalProfile from different clips within the same step
     * (OrchestrationInterpreter from CTP, StepInvokeInterpreter from
     * EnabledForUserJourneysTrue, ClaimsExchangeInterpreter from
     * InitiatingClaimsExchange, etc.). This produces 2-4 copies of the
     * same TP in `pendingFlowChildren`.
     *
     * Dedup strategy:
     * - TPs: keep first occurrence per technicalProfileId, merge richer metadata
     * - HRDs: keep first occurrence, merge selectableOptions
     * - All others (CT, DC, SendClaims): keep as-is
     */
    private deduplicateFlowChildren(children: FlowNodeChild[]): FlowNodeChild[] {
        const result: FlowNodeChild[] = [];
        const seenTps = new Map<string, FlowNodeChild>();
        let seenHrd: FlowNodeChild | null = null;

        for (const child of children) {
            if (child.data.type === FlowNodeType.TechnicalProfile) {
                const tpData = child.data as TechnicalProfileFlowData;
                const existing = seenTps.get(tpData.technicalProfileId);
                if (!existing) {
                    seenTps.set(tpData.technicalProfileId, child);
                    result.push(child);
                } else {
                    // Merge: prefer specific providerType / protocolType over empty or "Unknown"
                    const existingData = existing.data as unknown as { providerType: string; protocolType?: string };
                    const isEmptyProvider = !existingData.providerType || existingData.providerType === "Unknown" || existingData.providerType === "";
                    if (isEmptyProvider && tpData.providerType && tpData.providerType !== "Unknown") {
                        existingData.providerType = tpData.providerType;
                    }
                    if (!existingData.protocolType && tpData.protocolType) {
                        existingData.protocolType = tpData.protocolType;
                    }
                    // Merge nested children (e.g., CTs under TP) from later occurrences
                    if (child.children?.length) {
                        const existingChildren = existing.children ?? [];
                        for (const nested of child.children) {
                            const isDup = existingChildren.some(
                                (ec) =>
                                    ec.data.type === nested.data.type &&
                                    (ec.data.type === FlowNodeType.ClaimsTransformation
                                        ? ec.data.transformationId === (nested.data as ClaimsTransformationFlowData).transformationId
                                        : ec.data.type === FlowNodeType.TechnicalProfile
                                            ? ec.data.technicalProfileId === (nested.data as TechnicalProfileFlowData).technicalProfileId
                                            : false),
                            );
                            if (!isDup) {
                                existingChildren.push(nested);
                            }
                        }
                        (existing as { children: FlowNodeChild[] }).children = existingChildren;
                    }
                }
            } else if (child.data.type === FlowNodeType.HomeRealmDiscovery) {
                if (!seenHrd) {
                    seenHrd = child;
                    result.push(child);
                } else {
                    // Merge selectableOptions from duplicate HRD entries
                    const existingData = seenHrd.data as HomeRealmDiscoveryFlowData;
                    const newData = child.data as HomeRealmDiscoveryFlowData;
                    for (const opt of newData.selectableOptions) {
                        if (!existingData.selectableOptions.includes(opt)) {
                            existingData.selectableOptions.push(opt);
                        }
                    }
                }
            } else {
                result.push(child);
            }
        }

        return result;
    }
}
