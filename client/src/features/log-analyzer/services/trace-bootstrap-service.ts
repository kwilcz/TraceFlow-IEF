import { logsToTraceInput, parseTrace } from "@/lib/trace";
import type { LogRecord } from "@/types/logs";
import type { TraceState } from "@/features/log-analyzer/model/trace-state";
import { initialTraceState } from "@/features/log-analyzer/model/trace-state";

export function generateTraceStateFromLogs(logs: LogRecord[]): Partial<TraceState> {
    if (logs.length === 0) {
        return {
            ...initialTraceState,
            traceErrors: ["No logs available to generate trace"],
        };
    }

    const traceInput = logsToTraceInput(logs);
    const result = parseTrace(traceInput);
    const correlationId = logs[0]?.correlationId ?? "";

    return {
        traceSteps: result.traceSteps,
        executionMap: result.executionMap,
        mainJourneyId: result.mainJourneyId,
        correlationId,
        finalStatebag: result.finalStatebag,
        finalClaims: result.finalClaims,
        traceErrors: result.errors,
        activeStepIndex: result.traceSteps.length > 0 ? 0 : null,
        isTraceModeActive: result.traceSteps.length > 0,
    };
}