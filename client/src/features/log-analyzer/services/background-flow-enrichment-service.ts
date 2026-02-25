import { getLogsForFlow } from "@/lib/trace";
import type { LogRecord } from "@/types/logs";
import type { UserFlow } from "@/types/trace";
import type { TraceState } from "@/features/log-analyzer/model/trace-state";
import { generateTraceStateFromLogs, enrichUserFlow } from "./trace-bootstrap-service";

export interface FlowAnalysisCache {
    traceState: Partial<TraceState>;
    enrichedFlow: UserFlow;
}

/**
 * Parses all flows in parallel via Promise.all with microtask interleaving.
 * Each flow wraps its synchronous parse in an async function so they yield
 * between computations. Results are cached and reported progressively.
 *
 * @param logs - All fetched log records
 * @param userFlows - All user flows to analyze
 * @param cache - Module-level cache map (FlowId -> analysis result)
 * @param onFlowAnalyzed - Called after each flow is analyzed (for incremental store updates)
 * @param signal - AbortSignal to cancel on new fetchLogs/reset
 */
export async function analyzeAllFlows(
    logs: LogRecord[],
    userFlows: UserFlow[],
    cache: Map<string, FlowAnalysisCache>,
    onFlowAnalyzed: (flowId: string, result: FlowAnalysisCache) => void,
    signal: AbortSignal,
): Promise<void> {
    await Promise.all(
        userFlows.map(async (flow) => {
            // Yield to the event loop so all promises interleave
            await Promise.resolve();

            // Check cancellation before doing work
            if (signal.aborted) return;

            // Skip flows already in cache (e.g., the selected flow was parsed inline)
            if (cache.has(flow.id)) return;

            try {
                const flowLogs = getLogsForFlow(logs, flow.id, userFlows);
                const traceState = generateTraceStateFromLogs(flowLogs);
                const enriched = enrichUserFlow(flow, traceState);

                // Check cancellation before writing results
                if (signal.aborted) return;

                const result: FlowAnalysisCache = {
                    traceState,
                    enrichedFlow: enriched,
                };

                cache.set(flow.id, result);
                onFlowAnalyzed(flow.id, result);
            } catch {
                // Silently skip failed flows — they'll parse on demand when selected
            }
        }),
    );
}
