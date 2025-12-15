/**
 * Trace Parser Service
 *
 * Transforms raw Application Insights logs into a linear execution trace.
 * Handles the stateless nature of B2C by stitching together multiple log
 * segments and tracking SubJourney context switches.
 *
 * Key Concepts:
 * - EventInstance: "Event:AUTH" is the initial session (browser redirect to /authorize)
 * - EventInstance: "Event:API" logs contain user interaction responses (form POST)
 * - OrchestrationManager: Action clips signal step transitions
 * - ShouldOrchestrationStepBeInvokedHandler: Contains TechnicalProfile info
 * - ORCH_CS: Orchestration Counter - tracks step number (ignore 0 = preStep)
 * - SubJourney: When invoked, ORCH_CS resets to 1 in that context
 *
 * Event Sequence:
 * 1. Event:AUTH (T1): Validates Request -> Runs Initial Steps -> Pauses (sends HTML)
 * 2. User Action (time passes...)
 * 3. Event:API (T2): Resumes Session -> Validates Input -> Runs Steps -> Pauses/Token
 */

import {
    Clip,
    ClipsArray,
    HandlerResultClip,
    HeadersClip,
    Statebag,
    StatebagEntry,
    isActionClip,
    isFatalExceptionClip,
    isHandlerResultClip,
    isHeadersClip,
    isPredicateClip,
    isStatebagEntry,
    RecorderRecordEntry,
} from "@/types/journey-recorder";
import {
    JourneyContext,
    NodeExecutionStatus,
    StepResult,
    TraceExecutionMap,
    TraceLogInput,
    TraceParseResult,
    TraceStep,
    ClaimsTransformationDetail,
    DisplayControlAction,
} from "@/types/trace";

/** Orchestration Manager action identifier */
const ORCHESTRATION_MANAGER_ACTION = "Web.TPEngine.OrchestrationManager";

/** Predicate handler that contains TechnicalProfile info */
const STEP_INVOKE_HANDLER = "Web.TPEngine.StateMachineHandlers.ShouldOrchestrationStepBeInvokedHandler";

/** Home Realm Discovery handler (for combined step TPs) */
const HRD_HANDLER = "Web.TPEngine.StateMachineHandlers.HomeRealmDiscoveryHandler";

/** Claims Exchange protocol handler */
const CLAIMS_EXCHANGE_HANDLER = "Web.TPEngine.StateMachineHandlers.IsClaimsExchangeProtocolAServiceCallHandler";

/** Output claims transformation handler - contains calculation details */
const OUTPUT_CLAIMS_TRANSFORMATION_HANDLER = "Web.TPEngine.StateMachineHandlers.OutputClaimsTransformationHandler";

/** Input claims transformation handler */
const INPUT_CLAIMS_TRANSFORMATION_HANDLER = "Web.TPEngine.StateMachineHandlers.InputClaimsTransformationHandler";

/** Persisted claims transformation handler */
const PERSISTED_CLAIMS_TRANSFORMATION_HANDLER = "Web.TPEngine.StateMachineHandlers.PersistedClaimsTransformationHandler";

/** Self-asserted message validation handler - validates user input in self-asserted pages */
const SELF_ASSERTED_VALIDATION_HANDLER = "Web.TPEngine.StateMachineHandlers.SelfAssertedMessageValidationHandler";

/** Handler that enqueues a new journey (SubJourney invocation) */
const ENQUEUE_NEW_JOURNEY_HANDLER = "Web.TPEngine.StateMachineHandlers.EnqueueNewJourneyHandler";

/**
 * Represents a detected orchestration step.
 */
interface DetectedStep {
    stepNumber: number;
    timestamp: Date;
    technicalProfiles: string[];
    /** Selectable options for interactive steps (HRD choices) */
    selectableOptions: string[];
    /** Whether this is an interactive step requiring user input */
    isInteractiveStep: boolean;
    claimsTransformations: string[];
    claimsTransformationDetails: ClaimsTransformationDetail[];
    displayControls: string[];
    /** Detailed display control actions with TP and action info */
    displayControlActions: DisplayControlAction[];
    result: StepResult;
    statebagSnapshot: Record<string, string>;
    claimsSnapshot: Record<string, string>;
    errorMessage?: string;
    logId: string;
    /** The type of event that triggered this step (AUTH, API, SELFASSERTED, or ClaimsExchange) */
    eventType: "AUTH" | "API" | "SELFASSERTED" | "ClaimsExchange";
    /** Name of the current journey context */
    currentJourneyName: string;
}

/**
 * Internal clip with timestamp for sorting.
 */
interface TimestampedClip {
    clip: Clip;
    timestamp: Date;
    logId: string;
    /** Index of clip within its log entry */
    clipIndex: number;
    /** Index of the log entry in the original array */
    logIndex: number;
    /** The event type from the log's Headers clip */
    eventType: "AUTH" | "API" | "SELFASSERTED" | "ClaimsExchange";
}

/**
 * Parser state during processing.
 */
interface ParserState {
    journeyStack: JourneyContext[];
    currentStatebag: Record<string, string>;
    currentClaims: Record<string, string>;
    traceSteps: TraceStep[];
    executionMap: TraceExecutionMap;
    errors: string[];
    sequenceNumber: number;
    currentPredicate: string | null;
    currentAction: string | null;
    mainJourneyId: string;
    /** Currently detected step being built */
    pendingStep: DetectedStep | null;
    /** Set of processed step numbers for deduplication */
    processedSteps: Set<string>;
    /** The current event type being processed (AUTH, API, SELFASSERTED, or ClaimsExchange) */
    currentEventType: "AUTH" | "API" | "SELFASSERTED" | "ClaimsExchange";
}

/**
 * Parses log records into a linear trace of execution steps.
 */
export class TraceParser {
    private logs: TraceLogInput[];
    private state: ParserState;

    constructor(logs: TraceLogInput[]) {
        this.logs = logs;
        this.state = this.initializeState();
    }

    /**
     * Parse all logs and generate the trace.
     */
    parse(): TraceParseResult {
        // Filter to Event:AUTH and Event:API logs only
        const traceLogs = this.filterTraceLogs();

        if (traceLogs.length === 0) {
            return {
                traceSteps: [],
                executionMap: {},
                mainJourneyId: "",
                success: false,
                errors: ["No Event:AUTH, Event:API, Event:SELFASSERTED, or Event:ClaimsExchange logs found. These event types contain core execution data."],
                finalStatebag: {},
                finalClaims: {},
            };
        }

        const flattenedClips = this.flattenAndSortClips(traceLogs);

        for (const { clip, timestamp, logId, clipIndex, eventType } of flattenedClips) {
            this.processClip(clip, timestamp, logId, clipIndex, eventType);
        }

        // Finalize any pending step
        this.finalizePendingStep();

        return {
            traceSteps: this.state.traceSteps,
            executionMap: this.state.executionMap,
            mainJourneyId: this.state.mainJourneyId,
            success: this.state.errors.length === 0,
            errors: this.state.errors,
            finalStatebag: { ...this.state.currentStatebag },
            finalClaims: { ...this.state.currentClaims },
        };
    }

    /**
     * Filter logs to include Event:AUTH, Event:API, Event:SELFASSERTED, and Event:ClaimsExchange instances.
     * - Event:AUTH: Initial session setup (browser redirect)
     * - Event:API: User interaction responses (form POST)
     * - Event:SELFASSERTED: User submitted self-asserted form (local account sign-in)
     * - Event:ClaimsExchange: Return from external IdP (OAuth/OIDC callback)
     */
    private filterTraceLogs(): TraceLogInput[] {
        return this.logs.filter((log) => {
            // Check the headers clip for EventInstance
            const headersClip = log.clips.find(isHeadersClip);
            if (!headersClip) return false;

            const eventInstance = headersClip.Content?.EventInstance;
            return (
                eventInstance === "Event:API" ||
                eventInstance === "Event:AUTH" ||
                eventInstance === "Event:SELFASSERTED" ||
                eventInstance === "Event:ClaimsExchange"
            );
        });
    }

    /**
     * Initialize parser state.
     */
    private initializeState(): ParserState {
        return {
            journeyStack: [],
            currentStatebag: {},
            currentClaims: {},
            traceSteps: [],
            executionMap: {},
            errors: [],
            sequenceNumber: 0,
            currentPredicate: null,
            currentAction: null,
            mainJourneyId: "",
            pendingStep: null,
            processedSteps: new Set(),
            currentEventType: "API", // Default, will be updated from Headers
        };
    }

    /**
     * Flatten all clips from all logs and sort by timestamp.
     * Preserves clip order within each log entry for stable ordering.
     */
    private flattenAndSortClips(logs: TraceLogInput[]): TimestampedClip[] {
        const allClips: TimestampedClip[] = [];

        for (let logIndex = 0; logIndex < logs.length; logIndex++) {
            const log = logs[logIndex];
            // Extract event type from Headers clip for this log
            const headersClip = log.clips.find(isHeadersClip);
            const eventInstance = headersClip?.Content?.EventInstance ?? "Event:API";
            const eventType: "AUTH" | "API" | "SELFASSERTED" | "ClaimsExchange" = 
                eventInstance === "Event:AUTH" ? "AUTH" :
                eventInstance === "Event:SELFASSERTED" ? "SELFASSERTED" :
                eventInstance === "Event:ClaimsExchange" ? "ClaimsExchange" : "API";

            for (let clipIndex = 0; clipIndex < log.clips.length; clipIndex++) {
                allClips.push({
                    clip: log.clips[clipIndex],
                    timestamp: log.timestamp,
                    logId: log.id,
                    clipIndex,
                    logIndex,
                    eventType,
                });
            }
        }

        // Sort by timestamp (ascending), then by log index, then by clip index
        // This ensures stable ordering when timestamps are equal
        allClips.sort((a, b) => {
            const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
            if (timeDiff !== 0) return timeDiff;
            
            // Same timestamp: sort by original log order
            const logDiff = a.logIndex - b.logIndex;
            if (logDiff !== 0) return logDiff;
            
            // Same log: preserve clip order
            return a.clipIndex - b.clipIndex;
        });

        return allClips;
    }

    /**
     * Process a single clip.
     */
    private processClip(clip: Clip, timestamp: Date, logId: string, clipIndex: number, eventType: "AUTH" | "API" | "SELFASSERTED" | "ClaimsExchange"): void {
        // Track current event type for step creation
        this.state.currentEventType = eventType;

        if (isHeadersClip(clip)) {
            this.handleHeadersClip(clip, timestamp);
        } else if (isPredicateClip(clip)) {
            this.state.currentPredicate = clip.Content;
        } else if (isActionClip(clip)) {
            this.handleActionClip(clip, timestamp, logId);
        } else if (isHandlerResultClip(clip)) {
            this.handleHandlerResultClip(clip, timestamp, logId);
        } else if (isFatalExceptionClip(clip)) {
            this.handleFatalException(clip, timestamp, logId);
        }
    }

    /**
     * Handle Action clip - detect OrchestrationManager as step boundary.
     */
    private handleActionClip(clip: { Kind: "Action"; Content: string }, timestamp: Date, logId: string): void {
        this.state.currentAction = clip.Content;

        // OrchestrationManager signals the start of a new step
        if (clip.Content === ORCHESTRATION_MANAGER_ACTION) {
            // Finalize any pending step first
            this.finalizePendingStep();
        }
    }

    /**
     * Handle Headers clip - extract main journey ID.
     */
    private handleHeadersClip(clip: HeadersClip, timestamp: Date): void {
        const { PolicyId } = clip.Content;

        // If we haven't set the main journey ID yet, use the policy ID
        if (!this.state.mainJourneyId && PolicyId) {
            this.state.mainJourneyId = PolicyId;

            // Extract journey name from policy ID (e.g., "B2C_1A_SignUpOrSignIn" -> "SignUpOrSignIn")
            const journeyName = this.extractJourneyNameFromPolicyId(PolicyId);

            // Initialize the journey stack with the main journey
            this.state.journeyStack.push({
                journeyId: PolicyId,
                journeyName,
                lastOrchStep: 0,
                entryTimestamp: timestamp,
            });
        }
    }

    /**
     * Extract a human-readable journey name from policy ID.
     * E.g., "B2C_1A_DEV_GlobalApp_SignUp_SignIn_PasswordReset_DE" -> "SignUp_SignIn_PasswordReset"
     */
    private extractJourneyNameFromPolicyId(policyId: string): string {
        // Remove common prefixes
        let name = policyId
            .replace(/^B2C_1A_/i, "")
            .replace(/^DEV_/i, "")
            .replace(/^PROD_/i, "")
            .replace(/^TEST_/i, "")
            .replace(/^GlobalApp_/i, "");
        
        // Remove country suffixes like "_DE", "_US", "_FR"
        name = name.replace(/_[A-Z]{2}$/i, "");
        
        return name || policyId;
    }

    /**
     * Handle HandlerResult clip - extract step info and state changes.
     */
    private handleHandlerResultClip(clip: HandlerResultClip, timestamp: Date, logId: string): void {
        const { Result, PredicateResult, Statebag, RecorderRecord, Exception } = clip.Content;

        // Update statebag and claims from this result
        if (Statebag) {
            this.mergeStatebag(Statebag);
        }

        // Check for SubJourney invocation via EnqueueNewJourneyHandler
        if (this.state.currentAction === ENQUEUE_NEW_JOURNEY_HANDLER && RecorderRecord) {
            this.handleSubJourneyInvocation(RecorderRecord, timestamp);
        }

        // Check for OrchestrationManager result - this signals step number change
        if (this.state.currentAction === ORCHESTRATION_MANAGER_ACTION) {
            const orchCs = this.extractOrchestrationStep(Statebag);
            if (orchCs !== null && orchCs > 0) {
                // Get current journey context for the step
                const currentContext = this.getCurrentContext();
                const journeyName = currentContext?.journeyName ?? this.extractJourneyNameFromPolicyId(this.state.mainJourneyId);

                // Detect SubJourney exit: if step number jumps significantly (e.g., 3 -> 6)
                // and we're in a SubJourney, it means the SubJourney completed
                if (currentContext && this.state.journeyStack.length > 1) {
                    const lastStep = currentContext.lastOrchStep;
                    // If step number is much higher than expected (> lastStep + 1), 
                    // we may have exited the SubJourney
                    if (orchCs > lastStep + 2) {
                        this.popSubJourneyContext();
                    }
                }

                // Get updated context after potential pop
                const updatedContext = this.getCurrentContext();
                const updatedJourneyName = updatedContext?.journeyName ?? this.extractJourneyNameFromPolicyId(this.state.mainJourneyId);

                // Start building a new pending step
                this.state.pendingStep = {
                    stepNumber: orchCs,
                    timestamp,
                    technicalProfiles: [],
                    selectableOptions: [],
                    isInteractiveStep: false,
                    claimsTransformations: [],
                    claimsTransformationDetails: [],
                    displayControls: [],
                    displayControlActions: [],
                    result: "Success",
                    statebagSnapshot: { ...this.state.currentStatebag },
                    claimsSnapshot: { ...this.state.currentClaims },
                    logId,
                    eventType: this.state.currentEventType,
                    currentJourneyName: updatedJourneyName,
                };
            }
        }

        // Extract available TechnicalProfiles from step invocation handler
        // IMPORTANT: ShouldOrchestrationStepBeInvokedHandler shows AVAILABLE/ENABLED TPs, not the one that's triggered
        // The actual triggered TP comes from InitiatingClaimsExchange or CTP statebag
        if (this.state.currentPredicate === STEP_INVOKE_HANDLER && RecorderRecord) {
            const availableTps = this.extractAvailableTechnicalProfiles(RecorderRecord);
            if (this.state.pendingStep && availableTps.length > 0) {
                // If multiple TPs are available, this is a choice step (like ClaimsExchange with multiple options)
                if (availableTps.length > 1) {
                    this.state.pendingStep.selectableOptions.push(...availableTps);
                    this.state.pendingStep.isInteractiveStep = true;
                }
                // If only one TP is available, it will be auto-triggered (set below by ClaimsExchange handler)
            }
        }

        // Extract TechnicalProfile info from HRD handler (combined steps like CombinedSignInAndSignUp)
        // HRD options are SELECTABLE choices, not invoked profiles
        if (this.state.currentPredicate === HRD_HANDLER && RecorderRecord) {
            const tpInfos = this.extractTechnicalProfilesFromHRD(RecorderRecord);
            if (this.state.pendingStep) {
                // These are options the user can choose from, not invocations
                // Clear any previously set options (from STEP_INVOKE_HANDLER) as HRD is more specific
                this.state.pendingStep.selectableOptions = [...tpInfos];
                // Mark as interactive step (CombinedSignInAndSignUp)
                this.state.pendingStep.isInteractiveStep = true;
            }
        }

        // Extract TechnicalProfile from ClaimsExchange, Redirection, and other protocol handlers
        // InitiatingClaimsExchange contains the ACTUALLY TRIGGERED TP (not just available ones)
        if (RecorderRecord && this.isClaimsExchangeProtocolHandler(this.state.currentPredicate)) {
            const tpId = this.extractTechnicalProfileFromClaimsExchange(RecorderRecord);
            if (this.state.pendingStep && tpId) {
                // This is the actually triggered TP - add to technicalProfiles
                if (!this.state.pendingStep.technicalProfiles.includes(tpId)) {
                    this.state.pendingStep.technicalProfiles.push(tpId);
                }
                // If we have a triggered TP, clear selectableOptions (user made choice or auto-selected)
                // and mark step as no longer interactive
                if (this.state.pendingStep.selectableOptions.length > 0) {
                    this.state.pendingStep.selectableOptions = [];
                    this.state.pendingStep.isInteractiveStep = false;
                }
            }
        }

        // Extract TechnicalProfile from CTP statebag when present
        // CTP (Current Technical Profile) is set when a self-asserted/interactive step processes user input
        // Format is "TechnicalProfileId:StepNumber" e.g., "SelfAsserted-LocalAccountSignin-Email:1"
        // This can appear in any event type (API, SELFASSERTED) after the user interacts with the step
        if (Statebag) {
            this.extractTechnicalProfileFromCTP(Statebag);
        }

        // Extract claims transformations and their details from transformation handlers
        if (RecorderRecord && this.isClaimsTransformationHandler(this.state.currentAction)) {
            const { claimsTransformations, displayControls, transformationDetails } = 
                this.extractInvokedComponents(RecorderRecord);
            
            if (this.state.pendingStep) {
                this.state.pendingStep.claimsTransformations.push(...claimsTransformations);
                this.state.pendingStep.displayControls.push(...displayControls);
                this.state.pendingStep.claimsTransformationDetails.push(...transformationDetails);
                
                // Update claims snapshot after transformation - captures the Complex-CLMS state
                this.state.pendingStep.claimsSnapshot = { ...this.state.currentClaims };
            }
        }

        // Handle error cases
        if (Exception) {
            if (this.state.pendingStep) {
                this.state.pendingStep.result = "Error";
                this.state.pendingStep.errorMessage = Exception.Message;
            }
        }

        // Check for skipped steps based on PredicateResult
        // PredicateResult: "False" means the step/flow will NOT be executed
        // This applies to ShouldOrchestrationStepBeInvokedHandler which determines if a step runs
        if (PredicateResult === "False" && this.state.currentPredicate === STEP_INVOKE_HANDLER) {
            if (this.state.pendingStep) {
                this.state.pendingStep.result = "Skipped";
            }
        }

        // Reset action after processing result
        this.state.currentAction = null;
    }

    /**
     * Check if the current action is a claims transformation handler.
     */
    private isClaimsTransformationHandler(action: string | null): boolean {
        if (!action) return false;
        return [
            OUTPUT_CLAIMS_TRANSFORMATION_HANDLER,
            INPUT_CLAIMS_TRANSFORMATION_HANDLER,
            PERSISTED_CLAIMS_TRANSFORMATION_HANDLER,
        ].includes(action);
    }

    /**
     * Finalize the pending step and add it to trace.
     */
    private finalizePendingStep(): void {
        const step = this.state.pendingStep;
        if (!step) return;

        // Create unique key for deduplication
        const stepKey = `${this.state.mainJourneyId}-${step.stepNumber}`;

        // Check for duplicates (same step from different log segments)
        if (this.state.processedSteps.has(stepKey)) {
            // Merge info from duplicate step
            const existingStep = this.state.traceSteps.find(
                (s) => s.stepOrder === step.stepNumber && s.journeyContextId === this.state.mainJourneyId
            );
            if (existingStep) {
                // Merge technical profiles
                for (const tp of step.technicalProfiles) {
                    if (!existingStep.technicalProfiles.includes(tp)) {
                        existingStep.technicalProfiles.push(tp);
                    }
                }
                // Update claims and statebag with latest
                existingStep.claimsSnapshot = step.claimsSnapshot;
                existingStep.statebagSnapshot = step.statebagSnapshot;
            }
            this.state.pendingStep = null;
            return;
        }

        this.state.processedSteps.add(stepKey);

        // Get current journey context
        const currentContext = this.getCurrentContext();
        const journeyId = currentContext?.journeyId ?? this.state.mainJourneyId;
        const journeyName = step.currentJourneyName || currentContext?.journeyName || this.extractJourneyNameFromPolicyId(this.state.mainJourneyId);

        // Build node ID matching ReactFlow format
        const graphNodeId = this.buildNodeId(journeyId, step.stepNumber);

        // Deduplicate technical profiles and selectable options
        const uniqueTPs = Array.from(new Set(step.technicalProfiles));
        const uniqueOptions = Array.from(new Set(step.selectableOptions));

        // Create trace step
        const traceStep: TraceStep = {
            sequenceNumber: this.state.sequenceNumber++,
            timestamp: step.timestamp,
            logId: step.logId,
            eventType: step.eventType,
            graphNodeId,
            journeyContextId: journeyId,
            currentJourneyName: journeyName,
            stepOrder: step.stepNumber,
            result: step.result,
            statebagSnapshot: step.statebagSnapshot,
            claimsSnapshot: step.claimsSnapshot,
            errorMessage: step.errorMessage,
            technicalProfiles: uniqueTPs,
            selectableOptions: uniqueOptions,
            isInteractiveStep: step.isInteractiveStep,
            claimsTransformations: Array.from(new Set(step.claimsTransformations)),
            claimsTransformationDetails: step.claimsTransformationDetails,
            displayControls: Array.from(new Set(step.displayControls)),
            displayControlActions: step.displayControlActions ?? [],
            actionHandler: ORCHESTRATION_MANAGER_ACTION,
        };

        this.state.traceSteps.push(traceStep);

        // Update execution map
        this.updateExecutionMap(graphNodeId, step.result, traceStep.sequenceNumber);

        // Update last orch step in context
        if (currentContext) {
            currentContext.lastOrchStep = step.stepNumber;
        }

        this.state.pendingStep = null;
    }

    /**
     * Extract ALL available TechnicalProfiles from ShouldOrchestrationStepBeInvokedHandler.
     * These are the TPs that are ENABLED for this step, not necessarily the one that will be triggered.
     */
    private extractAvailableTechnicalProfiles(
        recorderRecord: { Values: RecorderRecordEntry[] }
    ): string[] {
        const technicalProfiles: string[] = [];

        for (const entry of recorderRecord.Values) {
            if (entry.Key === "EnabledForUserJourneysTrue" && typeof entry.Value === "object") {
                const value = entry.Value as { Values?: RecorderRecordEntry[] };
                if (value.Values) {
                    for (const v of value.Values) {
                        if (v.Key === "TechnicalProfileEnabled" && typeof v.Value === "object") {
                            const tpValue = v.Value as { TechnicalProfile?: string };
                            if (tpValue.TechnicalProfile) {
                                technicalProfiles.push(tpValue.TechnicalProfile);
                            }
                        }
                    }
                }
            }
        }

        return technicalProfiles;
    }

    /**
     * Handle SubJourney invocation from EnqueueNewJourneyHandler.
     * Pushes a new context onto the journey stack.
     */
    private handleSubJourneyInvocation(
        recorderRecord: { Values: RecorderRecordEntry[] },
        timestamp: Date
    ): void {
        for (const entry of recorderRecord.Values) {
            if (entry.Key === "SubJourneyInvoked" && typeof entry.Value === "object") {
                const value = entry.Value as { SubJourneyId?: string };
                if (value.SubJourneyId) {
                    // Push new SubJourney context onto stack
                    this.state.journeyStack.push({
                        journeyId: value.SubJourneyId,
                        journeyName: value.SubJourneyId, // SubJourney ID is usually already a clean name
                        lastOrchStep: 0,
                        entryTimestamp: timestamp,
                    });
                    return;
                }
            }
        }
    }

    /**
     * Pop the current SubJourney context from the stack.
     * Called when we detect the SubJourney has completed.
     */
    private popSubJourneyContext(): void {
        // Only pop if we have more than the main journey on the stack
        if (this.state.journeyStack.length > 1) {
            this.state.journeyStack.pop();
        }
    }

    /**
     * Check if the predicate is a ClaimsExchange protocol handler that contains InitiatingClaimsExchange.
     */
    private isClaimsExchangeProtocolHandler(predicate: string | null): boolean {
        if (!predicate) return false;
        // All these handlers can contain InitiatingClaimsExchange with the actual triggered TP
        return [
            "Web.TPEngine.StateMachineHandlers.IsClaimsExchangeProtocolAServiceCallHandler",
            "Web.TPEngine.StateMachineHandlers.IsClaimsExchangeProtocolARedirectionHandler",
            "Web.TPEngine.StateMachineHandlers.IsClaimsExchangeProtocolAnApiHandler",
        ].includes(predicate);
    }

    /**
     * Extract TechnicalProfile from CTP (Current Technical Profile) statebag entry.
     * CTP is set when a self-asserted or interactive step processes user input.
     * Format: "TechnicalProfileId:StepNumber" e.g., "SelfAsserted-LocalAccountSignin-Email:1"
     */
    private extractTechnicalProfileFromCTP(statebag: Statebag): void {
        // Check if CTP exists in the statebag
        const ctpEntry = statebag["CTP"];
        if (!ctpEntry) return;

        // CTP can be a StatebagEntry object or we might have already parsed it
        let ctpValue: string | undefined;
        if (isStatebagEntry(ctpEntry)) {
            ctpValue = ctpEntry.v;
        } else if (typeof ctpEntry === "string") {
            ctpValue = ctpEntry;
        }

        if (!ctpValue) return;

        // Parse the CTP value: "TechnicalProfileId:StepNumber"
        const parts = ctpValue.split(":");
        if (parts.length < 2) return;

        const tpId = parts[0];
        const stepNumber = parseInt(parts[1], 10);

        if (!tpId || isNaN(stepNumber)) return;

        // Find the step to update - either pending or already in trace
        let targetStep: DetectedStep | TraceStep | null = null;

        // First check if pending step matches
        if (this.state.pendingStep && this.state.pendingStep.stepNumber === stepNumber) {
            targetStep = this.state.pendingStep;
        } else {
            // Look for existing step in trace
            const foundStep = this.state.traceSteps.find(
                (s) => s.stepOrder === stepNumber && s.journeyContextId === this.state.mainJourneyId
            );
            if (foundStep) {
                targetStep = foundStep;
            }
        }

        if (!targetStep) return;

        // Add the TP to technicalProfiles if not already there
        if (!targetStep.technicalProfiles.includes(tpId)) {
            targetStep.technicalProfiles.push(tpId);
        }

        // Clear selectableOptions since user made their choice
        if ("selectableOptions" in targetStep && (targetStep as DetectedStep).selectableOptions.length > 0) {
            (targetStep as DetectedStep).selectableOptions = [];
            (targetStep as DetectedStep).isInteractiveStep = false;
        } else if ("selectableOptions" in targetStep) {
            // For TraceStep in array
            (targetStep as TraceStep).selectableOptions = [];
            (targetStep as TraceStep).isInteractiveStep = false;
        }
    }

    /**
     * Extract TechnicalProfiles from HomeRealmDiscoveryHandler (combined steps).
     */
    private extractTechnicalProfilesFromHRD(
        recorderRecord: { Values: RecorderRecordEntry[] }
    ): string[] {
        const technicalProfiles: string[] = [];

        for (const entry of recorderRecord.Values) {
            if (entry.Key === "HomeRealmDiscovery" && typeof entry.Value === "object") {
                const value = entry.Value as { Values?: RecorderRecordEntry[] };
                if (value.Values) {
                    for (const v of value.Values) {
                        if (v.Key === "TechnicalProfileEnabled" && typeof v.Value === "object") {
                            const tpValue = v.Value as { TechnicalProfile?: string };
                            if (tpValue.TechnicalProfile) {
                                technicalProfiles.push(tpValue.TechnicalProfile);
                            }
                        }
                    }
                }
            }
        }

        return technicalProfiles;
    }

    /**
     * Extract TechnicalProfileId from ClaimsExchange handler.
     */
    private extractTechnicalProfileFromClaimsExchange(
        recorderRecord: { Values: RecorderRecordEntry[] }
    ): string | null {
        for (const entry of recorderRecord.Values) {
            if (entry.Key === "InitiatingClaimsExchange" && typeof entry.Value === "object") {
                const value = entry.Value as { TechnicalProfileId?: string };
                if (value.TechnicalProfileId) {
                    return value.TechnicalProfileId;
                }
            }
        }

        return null;
    }

    /**
     * Handle fatal exception clip.
     */
    private handleFatalException(clip: Clip, timestamp: Date, logId: string): void {
        const content = clip.Content as { Exception?: { Message?: string }; Time?: string };
        const message = content.Exception?.Message ?? "Fatal exception occurred";

        this.state.errors.push(message);

        // Mark current pending step as error
        if (this.state.pendingStep) {
            this.state.pendingStep.result = "Error";
            this.state.pendingStep.errorMessage = message;
        }

        // Get current journey context
        const currentContext = this.getCurrentContext();
        if (currentContext) {
            const errorStep: TraceStep = {
                sequenceNumber: this.state.sequenceNumber++,
                timestamp,
                logId,
                eventType: this.state.currentEventType,
                graphNodeId: `${currentContext.journeyId}-Error`,
                journeyContextId: currentContext.journeyId,
                currentJourneyName: currentContext.journeyName,
                stepOrder: currentContext.lastOrchStep,
                result: "Error",
                statebagSnapshot: { ...this.state.currentStatebag },
                claimsSnapshot: { ...this.state.currentClaims },
                errorMessage: message,
                technicalProfiles: [],
                selectableOptions: [],
                isInteractiveStep: false,
                claimsTransformations: [],
                claimsTransformationDetails: [],
                displayControls: [],
                displayControlActions: [],
            };

            this.state.traceSteps.push(errorStep);
        }
    }

    /**
     * Extract orchestration step number from statebag.
     */
    private extractOrchestrationStep(statebag?: Statebag): number | null {
        if (!statebag?.ORCH_CS) {
            return null;
        }

        const orchCs = statebag.ORCH_CS;

        if (isStatebagEntry(orchCs)) {
            const parsed = parseInt(orchCs.v, 10);
            return isNaN(parsed) ? null : parsed;
        }

        return null;
    }

    /**
     * Merge statebag updates into current state.
     */
    private mergeStatebag(statebag: Statebag): void {
        for (const [key, value] of Object.entries(statebag)) {
            if (value === null || value === undefined) {
                continue;
            }

            // Handle Complex-CLMS specially
            if (key === "Complex-CLMS" && typeof value === "object" && !isStatebagEntry(value)) {
                const complexClaims = value as Record<string, string>;
                Object.assign(this.state.currentClaims, complexClaims);
                continue;
            }

            // Handle standard statebag entries
            if (isStatebagEntry(value)) {
                this.state.currentStatebag[key] = value.v;
            }
        }
    }

    /**
     * Build node ID matching ReactFlow node ID format.
     * This matches the format used by NodeBuilder.createOrchestrationStepNode
     */
    private buildNodeId(journeyId: string, stepOrder: number): string {
        return `${journeyId}-Step${stepOrder}`;
    }

    /**
     * Extract claims transformations, display controls, and transformation details from RecorderRecord.
     */
    private extractInvokedComponents(recorderRecord?: { Values: RecorderRecordEntry[] }): {
        claimsTransformations: string[];
        displayControls: string[];
        transformationDetails: ClaimsTransformationDetail[];
    } {
        const claimsTransformations: string[] = [];
        const displayControls: string[] = [];
        const transformationDetails: ClaimsTransformationDetail[] = [];

        if (!recorderRecord?.Values) {
            return { claimsTransformations, displayControls, transformationDetails };
        }

        for (const entry of recorderRecord.Values) {
            // Extract claims transformations
            if (entry.Key === "ClaimsTransformation" && typeof entry.Value === "object") {
                const value = entry.Value as { Values?: Array<{ Key: string; Value: unknown }> };
                if (value.Values) {
                    for (const v of value.Values) {
                        if (v.Key === "Id" && typeof v.Value === "string") {
                            claimsTransformations.push(v.Value);
                        }
                    }
                }
            }

            // Extract from OutputClaimsTransformation - this contains the detailed calculation info
            if (entry.Key === "OutputClaimsTransformation" && typeof entry.Value === "object") {
                const value = entry.Value as { Values?: Array<{ Key: string; Value: unknown }> };
                if (value.Values) {
                    for (const v of value.Values) {
                        // Extract ClaimsTransformation with full details
                        if (v.Key === "ClaimsTransformation" && typeof v.Value === "object") {
                            const ctValue = v.Value as { Values?: Array<{ Key: string; Value: unknown }> };
                            if (ctValue.Values) {
                                const detail = this.extractTransformationDetail(ctValue.Values);
                                if (detail) {
                                    claimsTransformations.push(detail.id);
                                    transformationDetails.push(detail);
                                }
                            }
                        }
                    }
                }
            }

            // Extract display controls
            if (entry.Key === "DisplayControl" && typeof entry.Value === "string") {
                displayControls.push(entry.Value);
            }

            if (entry.Key === "InitiatingDisplayControl" && typeof entry.Value === "object") {
                const value = entry.Value as { DisplayControlId?: string };
                if (value.DisplayControlId) {
                    displayControls.push(value.DisplayControlId);
                }
            }
        }

        return {
            claimsTransformations: Array.from(new Set(claimsTransformations)),
            displayControls: Array.from(new Set(displayControls)),
            transformationDetails,
        };
    }

    /**
     * Extract detailed information about a single claims transformation.
     */
    private extractTransformationDetail(
        values: Array<{ Key: string; Value: unknown }>
    ): ClaimsTransformationDetail | null {
        let id = "";
        const inputClaims: Array<{ claimType: string; value: string }> = [];
        const inputParameters: Array<{ id: string; value: string }> = [];
        const outputClaims: Array<{ claimType: string; value: string }> = [];

        for (const item of values) {
            if (item.Key === "Id" && typeof item.Value === "string") {
                id = item.Value;
            }
            
            if (item.Key === "InputClaim" && typeof item.Value === "object") {
                const claim = item.Value as { PolicyClaimType?: string; Value?: string };
                if (claim.PolicyClaimType) {
                    inputClaims.push({
                        claimType: claim.PolicyClaimType,
                        value: claim.Value ?? "",
                    });
                }
            }
            
            if (item.Key === "InputParameter" && typeof item.Value === "object") {
                const param = item.Value as { Id?: string; Value?: string };
                if (param.Id) {
                    inputParameters.push({
                        id: param.Id,
                        value: param.Value ?? "",
                    });
                }
            }
            
            if (item.Key === "Result" && typeof item.Value === "object") {
                const result = item.Value as { PolicyClaimType?: string; Value?: string };
                if (result.PolicyClaimType) {
                    outputClaims.push({
                        claimType: result.PolicyClaimType,
                        value: result.Value ?? "",
                    });
                }
            }
        }

        if (!id) return null;

        return { id, inputClaims, inputParameters, outputClaims };
    }

    /**
     * Update the execution map for a node.
     */
    private updateExecutionMap(nodeId: string, status: StepResult, stepIndex: number): void {
        if (!this.state.executionMap[nodeId]) {
            this.state.executionMap[nodeId] = {
                status,
                visitCount: 0,
                stepIndices: [],
            };
        }

        const entry = this.state.executionMap[nodeId];
        entry.status = status;
        entry.visitCount++;
        entry.stepIndices.push(stepIndex);
    }

    /**
     * Get the current journey context.
     */
    private getCurrentContext(): JourneyContext | null {
        if (this.state.journeyStack.length === 0) {
            return null;
        }

        return this.state.journeyStack[this.state.journeyStack.length - 1];
    }
}

/**
 * Parse logs into a trace - convenience function.
 */
export function parseTrace(logs: TraceLogInput[]): TraceParseResult {
    const parser = new TraceParser(logs);
    return parser.parse();
}

/**
 * Convert LogRecord array to TraceLogInput array.
 */
export function logsToTraceInput(
    logs: import("@/types/logs").LogRecord[]
): TraceLogInput[] {
    return logs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        policyId: log.policyId,
        correlationId: log.correlationId,
        clips: log.clips,
    }));
}

/**
 * Get trace step by sequence number.
 */
export function getTraceStepBySequence(
    result: TraceParseResult,
    sequenceNumber: number
): TraceStep | undefined {
    return result.traceSteps.find((s) => s.sequenceNumber === sequenceNumber);
}

/**
 * Get all trace steps for a specific node.
 */
export function getTraceStepsForNode(
    result: TraceParseResult,
    nodeId: string
): TraceStep[] {
    const entry = result.executionMap[nodeId];
    if (!entry) {
        return [];
    }

    return entry.stepIndices.map((idx) => result.traceSteps[idx]).filter(Boolean);
}

/**
 * Get the claims diff between two consecutive steps.
 */
export function getClaimsDiffBetweenSteps(
    result: TraceParseResult,
    fromStepIndex: number,
    toStepIndex: number
): import("@/types/trace").ClaimsDiff {
    const { computeClaimsDiff } = require("@/types/trace");

    const fromStep = result.traceSteps[fromStepIndex];
    const toStep = result.traceSteps[toStepIndex];

    if (!fromStep || !toStep) {
        return { added: {}, modified: {}, removed: [] };
    }

    return computeClaimsDiff(fromStep.claimsSnapshot, toStep.claimsSnapshot);
}
