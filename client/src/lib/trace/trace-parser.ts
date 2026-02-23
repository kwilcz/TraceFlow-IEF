/**
 * Trace Parser
 *
 * Parses Application Insights logs into structured trace steps.
 * Uses the interpreter pattern with specialized handlers for each B2C handler type.
 */

import type { Clip, ClipsArray, HeadersContent } from "@/types/journey-recorder";
import type { TraceLogInput, TraceParseResult, TraceStep } from "@/types/trace";

import { TraceStepBuilder } from "./domain/trace-step-builder";
import { JourneyStack } from "./domain/journey-stack";
import { getInterpreterRegistry, type InterpretContext, type InterpretResult } from "./interpreters";
import { ClipAggregator, type ClipGroup } from "./services/clip-aggregator";
import { StatebagAccumulator } from "./services/statebag-accumulator";
import { ExecutionMapBuilder } from "./services/execution-map-builder";
import { runPostProcessors } from "./post-processors";
import { SUPPORTED_EVENT_INSTANCES, DEDUP_THRESHOLD_MS } from "./constants/keys";

/**
 * Event types from Application Insights logs.
 */
type EventType = "AUTH" | "API" | "SELFASSERTED" | "ClaimsExchange";

/**
 * Internal state during parsing.
 */
interface ParserState {
    journeyStack: JourneyStack;
    statebag: StatebagAccumulator;
    executionMap: ExecutionMapBuilder;
    traceSteps: TraceStep[];
    sequenceNumber: number;
    errors: string[];
    mainJourneyId: string;
    currentStepBuilder: TraceStepBuilder | null;
    processedStepKeys: Set<string>;
    lastStepTimestamps: Map<string, number>;
}

/**
 * Trace Parser using interpreter pattern.
 * Delegates interpretation to specialized handlers via the registry.
 */
export class TraceParser {
    private readonly logs: TraceLogInput[];
    private readonly clipAggregator: ClipAggregator;
    private readonly interpreterRegistry = getInterpreterRegistry();
    private state!: ParserState;

    constructor(logs: TraceLogInput[]) {
        this.logs = logs;
        this.clipAggregator = new ClipAggregator();
    }

    /**
     * Parse all logs and generate the trace.
     */
    parse(): TraceParseResult {
        this.initializeState();

        const traceLogs = this.filterTraceLogs();

        if (traceLogs.length === 0) {
            return this.createEmptyResult(
                "No Event:AUTH, Event:API, Event:SELFASSERTED, or Event:ClaimsExchange logs found.",
            );
        }

        // Sort logs by timestamp
        const sortedLogs = [...traceLogs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        this.extractMainJourney(sortedLogs);

        for (const log of sortedLogs) {
            this.processLog(log);
        }

        this.finalizeCurrentStep();

        // Run post-processors for cross-step analysis (duration calculation, HRD resolution, etc.)
        const postProcessingResult = runPostProcessors(this.state.traceSteps);
        if (!postProcessingResult.success) {
            this.state.errors.push(...postProcessingResult.errors);
        }

        return {
            traceSteps: this.state.traceSteps,
            executionMap: this.state.executionMap.build(),
            mainJourneyId: this.state.mainJourneyId,
            success: this.state.errors.length === 0,
            errors: this.state.errors,
            finalStatebag: this.state.statebag.getStatebagSnapshot(),
            finalClaims: this.state.statebag.getClaimsSnapshot(),
        };
    }

    /**
     * Initializes the parser state.
     */
    private initializeState(): void {
        this.state = {
            journeyStack: new JourneyStack("", ""),
            statebag: new StatebagAccumulator(),
            executionMap: new ExecutionMapBuilder(),
            traceSteps: [],
            sequenceNumber: 0,
            errors: [],
            mainJourneyId: "",
            currentStepBuilder: null,
            processedStepKeys: new Set(),
            lastStepTimestamps: new Map(),
        };

        this.interpreterRegistry.resetInterpreters();
    }

    /**
     * Filters logs to include only trace-relevant event types.
     */
    private filterTraceLogs(): TraceLogInput[] {
        return this.logs.filter((log) => {
            const headers = this.findHeaders(log.clips);
            if (!headers) return false;

            return SUPPORTED_EVENT_INSTANCES.has(headers.EventInstance);
        });
    }

    /**
     * Extracts the main journey ID from the first log.
     */
    private extractMainJourney(logs: TraceLogInput[]): void {
        for (const log of logs) {
            const headers = this.findHeaders(log.clips);
            if (headers?.PolicyId) {
                this.state.mainJourneyId = headers.PolicyId;
                const journeyName = this.extractJourneyName(headers.PolicyId);

                this.state.journeyStack = new JourneyStack(headers.PolicyId, journeyName);
                return;
            }
        }
    }

    /**
     * Processes a single log entry.
     */
    private processLog(log: TraceLogInput): void {
        const eventType = this.determineEventType(log.clips);
        const aggregation = this.clipAggregator.aggregate(log.clips);

        for (const group of aggregation.groups) {
            this.processClipGroup(group, log.timestamp, eventType, log.id);
        }

        // Process transition events (e.g., SendClaims)
        if (aggregation.transitions.length > 0 && this.state.currentStepBuilder) {
            const lastTransition = aggregation.transitions[aggregation.transitions.length - 1];
            this.state.currentStepBuilder.withTransitionEvent(lastTransition.eventName);
        }

        if (aggregation.fatalException) {
            this.handleFatalException(aggregation.fatalException.Exception.Message, log.timestamp, log.id);
        }
    }

    /**
     * Processes a single clip group through the interpreter system.
     */
    private processClipGroup(group: ClipGroup, timestamp: Date, eventType: EventType, logId: string): void {
        const interpreter = this.interpreterRegistry.getInterpreter(group.handlerName);

        if (!interpreter) {
            return;
        }

        try {
            const context = this.buildInterpretContext(group, timestamp, eventType, logId);
            const result = interpreter.interpret(context);

            this.applyInterpretResult(result, timestamp, eventType, logId);
        } catch (error) {
            // Log error but don't fail the entire parse - continue with remaining groups
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`[TraceParser] Interpreter ${group.handlerName} failed for log ${logId}:`, errorMessage);
            this.state.errors.push(`Interpreter error in ${group.handlerName}: ${errorMessage}`);
        }
    }

    /**
     * Builds the interpretation context for an interpreter.
     */
    private buildInterpretContext(
        group: ClipGroup,
        timestamp: Date,
        eventType: EventType,
        logId: string,
    ): InterpretContext {
        // Create a temporary builder for the interpreter to populate
        const tempBuilder =
            this.state.currentStepBuilder ??
            TraceStepBuilder.create()
                .withSequence(this.state.sequenceNumber)
                .withTimestamp(timestamp)
                .withLogId(logId)
                .withEventType(eventType);

        return {
            clip: group.clips[0],
            clipIndex: group.actionIndex,
            clips: group.clips,
            handlerName: group.handlerName,
            handlerResult: group.result,
            journeyStack: this.state.journeyStack,
            stepBuilder: tempBuilder,
            sequenceNumber: this.state.sequenceNumber,
            timestamp,
            logId,
            statebag: this.state.statebag.getStatebagSnapshot(),
            claims: this.state.statebag.getClaimsSnapshot(),
            previousSteps: this.state.traceSteps,
        };
    }

    /**
     * Applies the result from an interpreter.
     */
    private applyInterpretResult(result: InterpretResult, timestamp: Date, eventType: EventType, logId: string): void {
        if (!result.success) {
            if (result.error) {
                this.state.errors.push(result.error);
            }
            return;
        }

        // Handle step creation BEFORE applying statebag updates
        // This ensures the step gets the statebag state from BEFORE the current handler
        if (result.createStep) {
            // Finalize current step if it has a valid stepOrder
            this.finalizeCurrentStep();

            // Clear the statebag but keep claims - B2C statebag is step-scoped
            // but claims (Complex-CLMS) persist across steps
            this.state.statebag.clearStatebagKeepClaims();

            // Now apply statebag updates for this new step
            if (result.statebagUpdates) {
                this.state.statebag.applyUpdates(result.statebagUpdates);
            }

            if (result.claimsUpdates) {
                this.state.statebag.applyClaimsUpdates(result.claimsUpdates);
            }

            // Create the new step builder with the data from the interpreter
            const context = this.state.journeyStack.current();
            this.state.currentStepBuilder = TraceStepBuilder.create()
                .withSequence(this.state.sequenceNumber++)
                .withTimestamp(timestamp)
                .withLogId(logId)
                .withEventType(eventType)
                .withJourneyContext(context.journeyId, context.journeyName)
                .withOrchStep(context.lastOrchStep)
                .withActionHandler(result.actionHandler ?? "")
                .calculateGraphNodeId();

            // Apply any error from the result
            if (result.stepResult === "Error" && result.error) {
                this.state.currentStepBuilder.withError(result.error, result.errorHResult);
            } else if (result.stepResult) {
                this.state.currentStepBuilder.withResult(result.stepResult);
            }
        } else {
            // For non-step-creating results, apply statebag updates normally
            if (result.statebagUpdates) {
                this.state.statebag.applyUpdates(result.statebagUpdates);
            }

            if (result.claimsUpdates) {
                this.state.statebag.applyClaimsUpdates(result.claimsUpdates);
            }

            // Apply error state to current step even without creating a new step
            if (this.state.currentStepBuilder && result.stepResult === "Error") {
                if (result.error) {
                    this.state.currentStepBuilder.withError(result.error, result.errorHResult);
                } else {
                    this.state.currentStepBuilder.withResult("Error");
                }
            }
        }

        if (result.pushSubJourney) {
            this.state.journeyStack.push({
                journeyId: result.pushSubJourney.journeyId,
                journeyName: result.pushSubJourney.journeyName,
                timestamp,
            });
        }

        if (result.popSubJourney) {
            this.state.journeyStack.pop();
        }

        // Apply technical profiles and selectable options to current step
        if (this.state.currentStepBuilder) {
            // Clear selectable options when a TP is definitively triggered
            // This prevents HRD options from leaking to ClaimsExchange steps
            if (result.clearSelectableOptions) {
                this.state.currentStepBuilder.clearSelectableOptions();
            }

            if (result.technicalProfiles) {
                const tpSnapshot = this.state.statebag.getClaimsSnapshot();
                for (const tp of result.technicalProfiles) {
                    this.state.currentStepBuilder.addTechnicalProfile(tp);
                    // Auto-create detail with snapshot so per-TP diff works
                    // even for interpreters that don't produce full details.
                    // addTechnicalProfileDetail handles merge if detail already exists.
                    this.state.currentStepBuilder.addTechnicalProfileDetail({
                        id: tp,
                        providerType: "",
                        claimsSnapshot: tpSnapshot,
                    });
                }
            }

            if (result.selectableOptions) {
                for (const option of result.selectableOptions) {
                    this.state.currentStepBuilder.addSelectableOption(option);
                }
                if (result.selectableOptions.length > 1) {
                    this.state.currentStepBuilder.asInteractiveStep();
                }
            }

            if (result.isInteractive) {
                this.state.currentStepBuilder.asInteractiveStep();
            }

            if (result.subJourneyId) {
                this.state.currentStepBuilder.withSubJourneyId(result.subJourneyId);
            }

            // Apply new fields for backend API calls, UI settings, SSO, and verification
            if (result.backendApiCalls) {
                for (const call of result.backendApiCalls) {
                    this.state.currentStepBuilder.addBackendApiCall(call);
                }
            }

            if (result.uiSettings) {
                this.state.currentStepBuilder.withUiSettings(result.uiSettings);
            }

            if (result.ssoSessionParticipant !== undefined) {
                this.state.currentStepBuilder.withSsoSessionParticipant(result.ssoSessionParticipant);
            }

            if (result.ssoSessionActivated !== undefined) {
                this.state.currentStepBuilder.withSsoSessionActivated(result.ssoSessionActivated);
            }

            if (result.isVerificationStep) {
                this.state.currentStepBuilder.asVerificationStep();
            }

            if (result.hasVerificationContext !== undefined) {
                this.state.currentStepBuilder.withVerificationContext(result.hasVerificationContext);
            }

            if (result.interactionResult) {
                this.state.currentStepBuilder.withInteractionResult(result.interactionResult);
            }

            if (result.submittedClaims) {
                this.state.currentStepBuilder.withSubmittedClaims(result.submittedClaims);
            }

            if (result.technicalProfileDetails) {
                const snapshot = this.state.statebag.getClaimsSnapshot();
                for (const detail of result.technicalProfileDetails) {
                    detail.claimsSnapshot = snapshot;
                    this.state.currentStepBuilder.addTechnicalProfileDetail(detail);
                }
            }

            if (result.claimsTransformations) {
                for (const ct of result.claimsTransformations) {
                    this.state.currentStepBuilder.addClaimsTransformationDetail(ct);
                }
            }
        }

        if (result.finalizeStep && this.state.currentStepBuilder) {
            if (result.stepResult) {
                this.state.currentStepBuilder.withResult(result.stepResult);
            }
            if (result.error) {
                this.state.currentStepBuilder.withError(result.error, result.errorHResult);
            }
            this.finalizeCurrentStep();
        }
    }

    /**
     * Finalizes the current step and adds it to the trace.
     * Only adds steps with valid stepOrder > 0.
     * Uses timestamp-based deduplication to distinguish between
     * the same step in different user interactions.
     */
    private finalizeCurrentStep(): void {
        const builder = this.state.currentStepBuilder;
        if (!builder) return;

        builder
            .withStatebag(this.state.statebag.getStatebagSnapshot())
            .withClaims(this.state.statebag.getClaimsSnapshot());

        const step = builder.build();

        // Only add steps with valid stepOrder (skip step 0) UNLESS it's an error step
        // Error steps with stepOrder 0 represent early validation failures before orchestration starts
        const isErrorStep = step.result === "Error" && step.errorMessage;
        if (step.stepOrder <= 0 && !isErrorStep) {
            this.state.currentStepBuilder = null;
            return;
        }

        const stepKey = `${step.journeyContextId}-${step.stepOrder}`;
        const lastTimestamp = this.state.lastStepTimestamps.get(stepKey);
        const currentTimestamp = step.timestamp.getTime();

        // Steps more than DEDUP_THRESHOLD_MS apart are considered separate interactions
        const isNewInteraction = !lastTimestamp || currentTimestamp - lastTimestamp > DEDUP_THRESHOLD_MS;

        if (this.state.processedStepKeys.has(stepKey) && !isNewInteraction) {
            this.mergeWithExistingStep(step);
        } else {
            this.state.processedStepKeys.add(stepKey);
            this.state.lastStepTimestamps.set(stepKey, currentTimestamp);
            this.state.traceSteps.push(step);
            this.state.executionMap.addStep(step);
        }

        this.state.currentStepBuilder = null;
    }

    /**
     * Merges a duplicate step with an existing one.
     */
    private mergeWithExistingStep(step: TraceStep): void {
        const existing = this.state.traceSteps.find(
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
     * Handles a fatal exception.
     */
    private handleFatalException(message: string, timestamp: Date, logId: string): void {
        this.state.errors.push(message);

        if (this.state.currentStepBuilder) {
            this.state.currentStepBuilder.withError(message).withResult("Error");
        }

        const context = this.state.journeyStack.current();
        const errorStep = TraceStepBuilder.create()
            .withSequence(++this.state.sequenceNumber)
            .withTimestamp(timestamp)
            .withLogId(logId)
            .withEventType("AUTH")
            .withJourneyContext(context.journeyId, context.journeyName)
            .withOrchStep(context.lastOrchStep)
            .withGraphNodeId(`${context.journeyId}-Error`)
            .withError(message)
            .withStatebag(this.state.statebag.getStatebagSnapshot())
            .withClaims(this.state.statebag.getClaimsSnapshot())
            .build();

        this.state.traceSteps.push(errorStep);
        this.state.executionMap.addStep(errorStep);
    }

    /**
     * Finds the Headers clip in a clips array.
     */
    private findHeaders(clips: ClipsArray): HeadersContent | null {
        for (const clip of clips) {
            if (clip.Kind === "Headers") {
                return clip.Content as HeadersContent;
            }
        }
        return null;
    }

    /**
     * Determines the event type from clips.
     */
    private determineEventType(clips: ClipsArray): EventType {
        const headers = this.findHeaders(clips);
        if (!headers) return "API";

        switch (headers.EventInstance) {
            case "Event:AUTH":
                return "AUTH";
            case "Event:SELFASSERTED":
                return "SELFASSERTED";
            case "Event:ClaimsExchange":
                return "ClaimsExchange";
            default:
                return "API";
        }
    }

    /**
     * Extracts a human-readable journey name from policy ID.
     */
    private extractJourneyName(policyId: string): string {
        let name = policyId
            .replace(/^B2C_1A_/i, "")
            .replace(/^DEV_/i, "")
            .replace(/^PROD_/i, "")
            .replace(/^TEST_/i, "")
            .replace(/^GlobalApp_/i, "");

        name = name.replace(/_[A-Z]{2}$/i, "");

        return name || policyId;
    }

    /**
     * Creates an empty result with an error message.
     */
    private createEmptyResult(error: string): TraceParseResult {
        return {
            traceSteps: [],
            executionMap: {},
            mainJourneyId: "",
            success: false,
            errors: [error],
            finalStatebag: {},
            finalClaims: {},
        };
    }
}

/**
 * Parse logs into a structured trace.
 */
export function parseTrace(logs: TraceLogInput[]): TraceParseResult {
    const parser = new TraceParser(logs);
    return parser.parse();
}
