import type { HandlerResultContent, HeadersContent } from "@/types/journey-recorder";
import type { SessionInfo, StepResult } from "@/types/trace";
import type { FlowNodeChild, StepError } from "@/types/flow-node";
import type { BackendApiCall, UiSettings } from "@/types/trace";
import { ClipKind } from "../constants/keys";
import type { FlowTreeBuilder } from "../domain/flow-tree-builder";
import type { JourneyStack } from "../domain/journey-stack";
import type { ExecutionMapBuilder } from "../services/execution-map-builder";
import type { StatebagAccumulator } from "../services/statebag-accumulator";

/**
 * Mutable step metadata accumulated during clip interpretation.
 * Reset per step. Replaces TraceStepBuilder for lightweight field accumulation.
 */
export interface PendingStepData {
    uiSettings?: UiSettings;
    selectableOptions: string[];
    selectedOption?: string;
    backendApiCalls: BackendApiCall[];
    result: StepResult;
    actionHandler?: string;
    errorMessage?: string;
    errorHResult?: string;
}

/**
 * Sequential processing state maintained as clips are processed one-by-one.
 *
 * This context replaces the scattered state that was previously managed
 * across ClipAggregator groups, the parser's processLog method, and
 * individual interpreter contexts.
 */
export interface ClipProcessingContext {
    // === Flow Identity (from Headers clip) ===
    correlationId: string;
    tenantId: string;
    policyId: string;
    eventInstance: string;

    // === Sequential State (tracks clip-by-clip progression) ===
    /** The Kind of the last processed clip */
    lastClipKind: ClipKind | null;
    /** FQCN of the last Predicate clip (e.g., "Web.TPEngine.StateMachineHandlers.NoOpHandler") */
    lastPredicate: string | null;
    /** Whether the last predicate result was true */
    lastPredicateResult: boolean | null;
    /** PredicateResult string from the last predicate's HandlerResult */
    lastPredicateResultString: string | null;
    /** FQCN of the last Action clip (e.g., "Web.TPEngine.OrchestrationManager") */
    lastAction: string | null;
    /** The last HandlerResult content (for the most recent Action or Predicate) */
    lastHandlerResult: HandlerResultContent | null;
    /** The last Transition event */
    lastTransition: { eventName: string; stateName: string } | null;
    /** The full Headers content from the current log */
    currentHeaders: HeadersContent | null;

    // === Log-level metadata (set per-log, not per-clip) ===
    /** Current log entry timestamp */
    currentTimestamp: Date;
    /** Current log entry ID */
    currentLogId: string;
    /** Current event type derived from EventInstance */
    currentEventType: "AUTH" | "API" | "SELFASSERTED" | "ClaimsExchange";

    // === Accumulated State (persists across clips and logs) ===
    journeyStack: JourneyStack;
    statebag: StatebagAccumulator;
    executionMap: ExecutionMapBuilder;
    flowTreeBuilder: FlowTreeBuilder;

    // === Step Building ===
    pendingStepData: PendingStepData;

    // === Pending FlowNode children (accumulated per-step, attached on finalize) ===
    pendingFlowChildren: FlowNodeChild[];
    pendingStepErrors: StepError[];

    // === Output ===
    sequenceNumber: number;
    errors: string[];

    // === Deduplication ===
    mainJourneyId: string;
    processedStepKeys: Set<string>;
    lastStepTimestamps: Map<string, number>;

    // === Session Flow Boundary ===
    /**
     * Number of AUTH events seen so far.
     * When a second `Event:AUTH` is encountered (sessionFlowCount > 0),
     * the user has started a new authentication session (e.g. browser-back)
     * and all accumulated state must be reset.
     */
    sessionFlowCount: number;
    /** Collected session boundary info */
    sessions: SessionInfo[];
}

/**
 * Resets the per-log metadata when processing a new log entry.
 * Called when the pipeline begins processing a new log, before iterating its clips.
 */
export function resetLogContext(ctx: ClipProcessingContext, logId: string, timestamp: Date): void {
    ctx.currentLogId = logId;
    ctx.currentTimestamp = timestamp;
    ctx.lastClipKind = null;
    ctx.lastPredicate = null;
    ctx.lastPredicateResult = null;
    ctx.lastPredicateResultString = null;
    ctx.lastAction = null;
    ctx.lastHandlerResult = null;
    ctx.lastTransition = null;
    ctx.currentHeaders = null;
}

/**
 * Creates a fresh ClipProcessingContext for a new parse run.
 * The journeyStack, statebag, and executionMap must be provided externally
 * so the caller (TraceParser) controls their lifecycle.
 */
export function createInitialContext(
    journeyStack: JourneyStack,
    statebag: StatebagAccumulator,
    executionMap: ExecutionMapBuilder,
    flowTreeBuilder: FlowTreeBuilder,
): ClipProcessingContext {
    return {
        correlationId: "",
        tenantId: "",
        policyId: "",
        eventInstance: "",

        lastClipKind: null,
        lastPredicate: null,
        lastPredicateResult: null,
        lastPredicateResultString: null,
        lastAction: null,
        lastHandlerResult: null,
        lastTransition: null,
        currentHeaders: null,

        currentTimestamp: new Date(),
        currentLogId: "",
        currentEventType: "API",

        journeyStack,
        statebag,
        executionMap,
        flowTreeBuilder,

        pendingStepData: createDefaultPendingStepData(),

        pendingFlowChildren: [],
        pendingStepErrors: [],

        sequenceNumber: 0,
        errors: [],

        mainJourneyId: "",
        processedStepKeys: new Set(),
        lastStepTimestamps: new Map(),

        sessionFlowCount: 0,
        sessions: [],
    };
}

/**
 * Resets all accumulated state when a new authentication session begins.
 *
 * B2C creates a new auth session with the same `correlationId` when the user
 * clicks the browser back button. The canonical signal is a second (or later)
 * `Event:AUTH` header. This function clears all state from the previous session
 * so that steps, claims, and journey context start fresh.
 *
 * @param ctx - The processing context to reset.
 * @param finalizeCurrentStep - Callback that finalizes any in-progress step
 *   before the reset. Accepts a callback to keep dependency inversion clean
 *   (avoids importing ResultApplicator here).
 */
export function beginNewSession(
    ctx: ClipProcessingContext,
    finalizeCurrentStep: (ctx: ClipProcessingContext) => void,
): void {
    // Record the completed session's step count
    // Session step counting now derived from FlowNode tree at finalization

    // Finalize any in-progress step before resetting
    finalizeCurrentStep(ctx);

    // Reset accumulated state
    ctx.statebag.reset();

    // Pop all sub-journeys, returning to root — keep FlowTreeBuilder in sync
    while (ctx.journeyStack.depth() > 0) {
        ctx.journeyStack.pop();
        ctx.flowTreeBuilder.popSubJourney();
    }
    ctx.journeyStack.root().lastOrchStep = 0;

    // Clear deduplication state
    ctx.processedStepKeys.clear();
    ctx.lastStepTimestamps.clear();

    // Reset step building
    ctx.pendingStepData = createDefaultPendingStepData();

    // Reset pending flow children/errors
    ctx.pendingFlowChildren = [];
    ctx.pendingStepErrors = [];

    // Reset sequential state
    ctx.lastClipKind = null;
    ctx.lastPredicate = null;
    ctx.lastPredicateResult = null;
    ctx.lastPredicateResultString = null;
    ctx.lastAction = null;
    ctx.lastHandlerResult = null;
    ctx.lastTransition = null;
    ctx.currentHeaders = null;
}

/**
 * Creates a default PendingStepData with empty/default values.
 */
export function createDefaultPendingStepData(): PendingStepData {
    return {
        selectableOptions: [],
        backendApiCalls: [],
        result: "Success",
    };
}
