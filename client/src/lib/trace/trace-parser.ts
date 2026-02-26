/**
 * Trace Parser
 *
 * Parses Application Insights logs into structured trace steps.
 * Processes clips sequentially through the ClipPipeline, which delegates
 * to specialized processors for each clip Kind.
 */

import type { ClipsArray, HeadersContent } from "@/types/journey-recorder";
import type { TraceLogInput, TraceParseResult } from "@/types/trace";

import { SUPPORTED_EVENT_INSTANCES } from "./constants/keys";
import { JourneyStack } from "./domain/journey-stack";
import { FlowTreeBuilder } from "./domain/flow-tree-builder";
import { getInterpreterRegistry } from "./interpreters";
import { runPostProcessors } from "./post-processors";
import { syncFlowTreeFromSteps } from "./post-processors/flow-tree-sync";
import { ExecutionMapBuilder } from "./services/execution-map-builder";
import { StatebagAccumulator } from "./services/statebag-accumulator";
import {
    type ClipProcessingContext,
    createInitialContext,
    resetLogContext,
} from "./pipeline/clip-processing-context";
import { ClipPipeline } from "./pipeline/clip-pipeline";
import { ResultApplicator } from "./pipeline/result-applicator";

/**
 * Trace Parser using sequential clip pipeline.
 * Processes clips one-by-one through specialized processors.
 */
export class TraceParser {
    private readonly logs: TraceLogInput[];
    private readonly interpreterRegistry = getInterpreterRegistry();
    private readonly pipeline: ClipPipeline;
    private readonly resultApplicator = new ResultApplicator();

    constructor(logs: TraceLogInput[]) {
        this.logs = logs;
        this.pipeline = new ClipPipeline(this.interpreterRegistry);
    }

    /**
     * Parse all logs and generate the trace.
     */
    parse(): TraceParseResult {
        this.interpreterRegistry.resetInterpreters();

        const journeyStack = new JourneyStack("", "");
        const statebag = new StatebagAccumulator();
        const executionMap = new ExecutionMapBuilder();
        const flowTreeBuilder = new FlowTreeBuilder();
        const ctx = createInitialContext(journeyStack, statebag, executionMap, flowTreeBuilder);

        const traceLogs = this.filterTraceLogs();

        if (traceLogs.length === 0) {
            return this.createEmptyResult(
                "No Event:AUTH, Event:API, Event:SELFASSERTED, or Event:ClaimsExchange logs found.",
            );
        }

        // Sort logs by timestamp
        const sortedLogs = [...traceLogs].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );

        // Extract main journey and initialize the journey stack
        this.extractUserJourney(sortedLogs, ctx);

        // Process each log through the clip pipeline
        for (const log of sortedLogs) {
            resetLogContext(ctx, log.id, log.timestamp);
            this.pipeline.processClips(log.clips, ctx);
        }

        // Finalize any remaining in-progress step
        this.resultApplicator.finalizeCurrentStep(ctx);

        // Finalize the last session's step count
        const lastSession = ctx.sessions[ctx.sessions.length - 1];
        if (lastSession) {
            lastSession.stepCount = ctx.traceSteps.length - ctx.sessionStartStepIndex;
        }

        // Run post-processors for cross-step analysis (duration calculation, HRD resolution, etc.)
        const postProcessingResult = runPostProcessors(ctx.traceSteps);
        if (!postProcessingResult.success) {
            ctx.errors.push(...postProcessingResult.errors);
        }

        // Sync post-processor mutations back to the FlowNode tree
        syncFlowTreeFromSteps(ctx.flowTreeBuilder.getTree(), ctx.traceSteps);

        return {
            traceSteps: ctx.traceSteps,
            flowTree: ctx.flowTreeBuilder.getTree(),
            executionMap: ctx.executionMap.build(),
            mainJourneyId: ctx.mainJourneyId,
            success: ctx.errors.length === 0,
            errors: ctx.errors,
            finalStatebag: ctx.statebag.getStatebagSnapshot(),
            finalClaims: ctx.statebag.getClaimsSnapshot(),
            sessions: ctx.sessions,
        };
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
     * Extracts the main journey ID from the first log and initializes the journey stack.
     */
    private extractUserJourney(logs: TraceLogInput[], ctx: ClipProcessingContext): void {
        for (const log of logs) {
            const headers = this.findHeaders(log.clips);
            if (headers?.PolicyId) {
                ctx.mainJourneyId = headers.PolicyId;

                // Re-initialize the journey stack with the actual policy
                // The stack was created with empty strings in createInitialContext
                const root = ctx.journeyStack.root();
                root.journeyId = headers.PolicyId;
                root.journeyName = headers.PolicyId;

                // Set root info on the flow tree builder
                ctx.flowTreeBuilder.setRootInfo(headers.PolicyId, headers.PolicyId);
                return;
            }
        }
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
     * Creates an empty result with an error message.
     */
    private createEmptyResult(error: string): TraceParseResult {
        return {
            traceSteps: [],
            flowTree: new FlowTreeBuilder().getTree(),
            executionMap: {},
            mainJourneyId: "",
            success: false,
            errors: [error],
            finalStatebag: {},
            finalClaims: {},
            sessions: [],
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
