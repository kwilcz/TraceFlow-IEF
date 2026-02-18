/**
 * Flow Analyzer Service
 *
 * Analyzes and groups logs into distinct user flows.
 * A user flow is bounded by correlationId and step 0 (flow initialization).
 * Multiple flows can share the same correlationId if the journey restarts.
 *
 * Refactored from flow-utils.ts with improved structure and clarity.
 */

import type { LogRecord } from "@/types/logs";
import type { UserFlow } from "@/types/trace";
import type {
    HandlerResultClip,
    Statebag,
    RecorderRecord,
} from "@/types/journey-recorder";
import {
    isActionClip,
    isHandlerResultClip,
    isStatebagEntry,
} from "@/types/journey-recorder";
import {
    ENQUEUE_NEW_JOURNEY,
    SEND_CLAIMS,
} from "../constants/handlers";
import { StatebagKey, RecorderRecordKey } from "../constants/keys";

/**
 * Information extracted from a log record for flow grouping.
 */
interface LogStepInfo {
    /** Current orchestration step number (final value seen in log) */
    orchStep: number;
    /** Whether step 0 (flow initialization) was seen anywhere in this log */
    hasStep0: boolean;
    /** The minimum step number seen in this log */
    minStep: number;
    /** All unique orchestration step numbers seen in this log */
    seenSteps: Set<number>;
    /** Whether an error occurred */
    hasError: boolean;
    /** SubJourney ID if one was invoked */
    subJourneyId: string | null;
    /** Whether a SubJourney was just enqueued */
    enqueuedSubJourney: boolean;
    /** Whether the journey completed */
    isJourneyComplete: boolean;
    /** Whether SendClaims was invoked (successful completion) */
    isSendClaims: boolean;
    /** Whether the user cancelled */
    isCancelled: boolean;
    /** Sign-in email from Complex-CLMS */
    signInName: string | null;
    /** AAD Object ID from Complex-CLMS */
    objectId: string | null;
}

/**
 * Internal tracking for flow building.
 */
interface FlowTracker {
    flow: UserFlow;
    lastOrchStep: number;
    justEnqueuedSubJourney: boolean;
    /** Set of all unique orchestration steps seen across the flow */
    seenSteps: Set<number>;
}

/**
 * Analyzes logs and groups them into user flows.
 */
export class FlowAnalyzer {
    private readonly flows: UserFlow[] = [];
    private readonly flowMap = new Map<string, FlowTracker>();

    /**
     * Analyzes logs and groups them into flows.
     */
    analyze(logs: LogRecord[]): UserFlow[] {
        if (logs.length === 0) return [];

        this.reset();

        const sortedLogs = this.sortLogsByTimestamp(logs);

        for (const log of sortedLogs) {
            this.processLog(log);
        }

        return this.flows;
    }

    /**
     * Resets the analyzer state.
     */
    private reset(): void {
        this.flows.length = 0;
        this.flowMap.clear();
    }

    /**
     * Sorts logs by timestamp.
     */
    private sortLogsByTimestamp(logs: LogRecord[]): LogRecord[] {
        return [...logs].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        );
    }

    /**
     * Processes a single log record.
     */
    private processLog(log: LogRecord): void {
        const { correlationId, policyId, timestamp, id } = log;
        const stepInfo = this.extractStepInfo(log);

        const existingTracker = this.flowMap.get(correlationId);
        const shouldStartNewFlow = this.shouldStartNewFlow(
            existingTracker,
            stepInfo,
            timestamp
        );

        if (shouldStartNewFlow) {
            this.createNewFlow(correlationId, policyId, timestamp, id, stepInfo);
        } else if (existingTracker) {
            this.updateExistingFlow(existingTracker, log, stepInfo);
        }
    }

    /**
     * Determines if a new flow should be started based on step info and tracking state.
     */
    private shouldStartNewFlow(
        tracker: FlowTracker | undefined,
        stepInfo: LogStepInfo,
        _timestamp: Date
    ): boolean {
        if (!tracker) return true;

        // Step 0 anywhere in this log indicates flow initialization
        // Unless we just enqueued a SubJourney (SubJourneys can reset ORCH_CS to 0)
        if (stepInfo.hasStep0 && !tracker.justEnqueuedSubJourney) {
            return true;
        }

        // Detect flow restart by checking if minimum step number in this log
        // is lower than where we were before (indicates backward movement)
        // Example: we were at step 3, and new log starts with step 1
        if (
            stepInfo.minStep > 0 &&
            tracker.lastOrchStep > 0 &&
            stepInfo.minStep < tracker.lastOrchStep &&
            !tracker.justEnqueuedSubJourney
        ) {
            return true;
        }

        return false;
    }

    /**
     * Creates a new user flow.
     */
    private createNewFlow(
        correlationId: string,
        policyId: string,
        timestamp: Date,
        logId: string,
        stepInfo: LogStepInfo
    ): void {
        // Initialize seenSteps with all steps from this log (excluding step 0 if only step 0)
        const seenSteps = new Set<number>();
        Array.from(stepInfo.seenSteps).forEach((step) => {
            if (step > 0) {
                seenSteps.add(step);
            }
        });

        const flow: UserFlow = {
            id: `${correlationId}-${this.flows.length}`,
            correlationId,
            policyId,
            startTime: timestamp,
            endTime: timestamp,
            stepCount: seenSteps.size,
            completed: false,
            hasErrors: stepInfo.hasError,
            cancelled: stepInfo.isCancelled,
            subJourneys: [],
            logIds: [logId],
            userEmail: stepInfo.signInName ?? undefined,
            userObjectId: stepInfo.objectId ?? undefined,
        };

        this.flows.push(flow);

        this.flowMap.set(correlationId, {
            flow,
            lastOrchStep: stepInfo.orchStep,
            justEnqueuedSubJourney: stepInfo.enqueuedSubJourney,
            seenSteps,
        });
    }

    /**
     * Updates an existing flow with new log data.
     */
    private updateExistingFlow(
        tracker: FlowTracker,
        log: LogRecord,
        stepInfo: LogStepInfo
    ): void {
        const { flow } = tracker;

        flow.logIds.push(log.id);
        flow.endTime = log.timestamp;

        // Add all newly seen steps to the tracker and update stepCount
        Array.from(stepInfo.seenSteps).forEach((step) => {
            if (step > 0 && !tracker.seenSteps.has(step)) {
                tracker.seenSteps.add(step);
                flow.stepCount++;
            }
        });

        if (stepInfo.orchStep > 0) {
            tracker.lastOrchStep = stepInfo.orchStep;
        }

        if (stepInfo.hasError) {
            flow.hasErrors = true;
        }

        if (stepInfo.isCancelled) {
            flow.cancelled = true;
        }

        if (
            stepInfo.subJourneyId &&
            !flow.subJourneys.includes(stepInfo.subJourneyId)
        ) {
            flow.subJourneys.push(stepInfo.subJourneyId);
        }

        if (stepInfo.isJourneyComplete || stepInfo.isSendClaims) {
            flow.completed = true;
        }

        // Update user identity if not yet set (claims may appear in later steps)
        if (!tracker.flow.userEmail && stepInfo.signInName) {
            tracker.flow.userEmail = stepInfo.signInName;
        }
        if (!tracker.flow.userObjectId && stepInfo.objectId) {
            tracker.flow.userObjectId = stepInfo.objectId;
        }

        tracker.justEnqueuedSubJourney = stepInfo.enqueuedSubJourney;
    }

    /**
     * Extracts step information from a log record.
     * 
     * A single log can contain multiple clips with different ORCH_CS values.
     * For example, a log might start with ORCH_CS=0 (flow initialization) and
     * then progress to ORCH_CS=1 within the same log.
     * 
     * We track:
     * - hasStep0: true if ORCH_CS=0 appeared anywhere (indicates flow start)
     * - minStep: the lowest step number seen (used to detect restarts)
     * - orchStep: the final/highest step number seen (for tracking progression)
     * - seenSteps: all unique step numbers seen in this log
     */
    private extractStepInfo(log: LogRecord): LogStepInfo {
        const info: LogStepInfo = {
            orchStep: -1,
            hasStep0: false,
            minStep: Number.MAX_SAFE_INTEGER,
            seenSteps: new Set<number>(),
            hasError: false,
            subJourneyId: null,
            enqueuedSubJourney: false,
            isJourneyComplete: false,
            isSendClaims: false,
            isCancelled: false,
            signInName: null,
            objectId: null,
        };

        let currentAction: string | null = null;

        for (const clip of log.clips) {
            if (isActionClip(clip)) {
                currentAction = clip.Content;

                if (clip.Content === ENQUEUE_NEW_JOURNEY) {
                    info.enqueuedSubJourney = true;
                }

                if (clip.Content === SEND_CLAIMS) {
                    info.isSendClaims = true;
                }
            }

            if (isHandlerResultClip(clip)) {
                this.extractFromHandlerResult(clip, info, currentAction);
            }
        }

        // If no step was found, set minStep to -1
        if (info.minStep === Number.MAX_SAFE_INTEGER) {
            info.minStep = -1;
        }

        return info;
    }

    /**
     * Extracts information from a HandlerResult clip.
     */
    private extractFromHandlerResult(
        clip: HandlerResultClip,
        info: LogStepInfo,
        currentAction: string | null
    ): void {
        const { Statebag, Exception, RecorderRecord } = clip.Content;

        if (Exception) {
            info.hasError = true;
        }

        if (Statebag) {
            this.extractFromStatebag(Statebag, info);
        }

        if (RecorderRecord) {
            this.extractFromRecorderRecord(RecorderRecord, info, currentAction);
        }
    }

    /**
     * Extracts information from statebag.
     * 
     * For ORCH_CS tracking:
     * - Track hasStep0 if we see ORCH_CS=0 (flow initialization)
     * - Track minStep as the lowest step number seen
     * - Track orchStep as the final/current step number
     * - Track seenSteps to count unique steps
     */
    private extractFromStatebag(
        statebag: Statebag,
        info: LogStepInfo
    ): void {
        const orchCsEntry = statebag[StatebagKey.ORCH_CS];
        if (orchCsEntry) {
            let orchCsValue: string | undefined;

            if (isStatebagEntry(orchCsEntry)) {
                orchCsValue = orchCsEntry.v;
            } else if (typeof orchCsEntry === "string") {
                orchCsValue = orchCsEntry;
            }

            if (orchCsValue) {
                const step = parseInt(orchCsValue, 10);
                if (!isNaN(step)) {
                    // Track all unique steps seen
                    info.seenSteps.add(step);
                    
                    // Track if step 0 was ever seen
                    if (step === 0) {
                        info.hasStep0 = true;
                    }
                    
                    // Track minimum step seen
                    if (step < info.minStep) {
                        info.minStep = step;
                    }
                    
                    // Track final/current step (always update to latest)
                    info.orchStep = step;
                }
            }
        }

        // Extract user identity from Complex-CLMS (signInName = email, objectId = AAD ID)
        const complexClaims = statebag[StatebagKey.ComplexClaims];
        if (complexClaims && typeof complexClaims === "object" && !isStatebagEntry(complexClaims)) {
            const claims = complexClaims as Record<string, string>;
            if (claims.signInName && claims.signInName !== "Null") {
                info.signInName = claims.signInName;
            }
            if (claims.objectId && claims.objectId !== "Null") {
                info.objectId = claims.objectId;
            }
        }

        const apiResult = statebag[StatebagKey.ComplexApiResult];
        if (apiResult && typeof apiResult === "object" && "IsCancelled" in apiResult) {
            const apiResultObj = apiResult as { IsCancelled?: string };
            if (apiResultObj.IsCancelled === "True") {
                info.isCancelled = true;
            }
        }

        if (statebag[StatebagKey.CNLM]) {
            info.isCancelled = true;
        }
    }

    /**
     * Extracts information from RecorderRecord.
     */
    private extractFromRecorderRecord(
        recorderRecord: RecorderRecord,
        info: LogStepInfo,
        currentAction: string | null
    ): void {
        for (const entry of recorderRecord.Values) {
            if (entry.Key === RecorderRecordKey.JourneyCompleted) {
                info.isJourneyComplete = true;
            }

            if (
                entry.Key === RecorderRecordKey.SubJourneyInvoked &&
                currentAction === ENQUEUE_NEW_JOURNEY
            ) {
                if (typeof entry.Value === "string") {
                    info.subJourneyId = entry.Value;
                } else if (
                    typeof entry.Value === "object" &&
                    entry.Value !== null
                ) {
                    const value = entry.Value as { SubJourneyId?: string };
                    if (value.SubJourneyId) {
                        info.subJourneyId = value.SubJourneyId;
                    }
                }
            }
        }
    }
}

/**
 * Creates a new FlowAnalyzer instance.
 */
export function createFlowAnalyzer(): FlowAnalyzer {
    return new FlowAnalyzer();
}

/**
 * Groups log records into distinct user flows.
 *
 * A new flow starts when:
 * 1. A new correlationId is encountered
 * 2. Step 0 (ORCH_CS = 0) is detected (but NOT after SubJourney invocation)
 */
export function groupLogsIntoFlows(logs: LogRecord[]): UserFlow[] {
    const analyzer = new FlowAnalyzer();
    return analyzer.analyze(logs);
}

/**
 * Get logs for a specific flow by its ID.
 * @param logs - All log records
 * @param flowId - The flow ID to filter by
 * @param precomputedFlows - Optional pre-computed flows to avoid re-analyzing
 */
export function getLogsForFlow(
    logs: LogRecord[], 
    flowId: string, 
    precomputedFlows?: UserFlow[]
): LogRecord[] {
    const flows = precomputedFlows ?? groupLogsIntoFlows(logs);
    const flow = flows.find((f) => f.id === flowId);
    if (!flow) return [];

    // Use Set for O(1) lookup instead of O(n) includes check
    const logIdSet = new Set(flow.logIds);
    return logs.filter((log) => logIdSet.has(log.id));
}

/**
 * Get all unique correlation IDs from a set of flows.
 */
export function getCorrelationIdsFromFlows(flows: UserFlow[]): string[] {
    return Array.from(new Set(flows.map((f) => f.correlationId)));
}
