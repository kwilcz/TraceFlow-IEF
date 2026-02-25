import { getLogsForFlow } from "@/lib/trace";
import type { LogRecord } from "@/types/logs";
import type { UserFlow } from "@/types/trace";
import type { TraceState } from "@/features/log-analyzer/model/trace-state";
import { initialTraceState } from "@/features/log-analyzer/model/trace-state";
import { generateTraceStateFromLogs, enrichUserFlow } from "@/features/log-analyzer/services/trace-bootstrap-service";

export interface SelectedLogOrchestrationResult {
    selectedFlow: UserFlow | null;
    tracePatch: Partial<TraceState> | null;
}

export function resolveSelectionFromLog(
    log: LogRecord | null,
    logs: LogRecord[],
    userFlows: UserFlow[],
): SelectedLogOrchestrationResult {
    if (!log || logs.length === 0) {
        return {
            selectedFlow: null,
            tracePatch: null,
        };
    }

    const matchingFlow = userFlows.find((flow) => flow.logIds.includes(log.id));

    if (matchingFlow) {
        const flowLogs = getLogsForFlow(logs, matchingFlow.id, userFlows);
        const traceState = generateTraceStateFromLogs(flowLogs);
        return {
            selectedFlow: enrichUserFlow(matchingFlow, traceState),
            tracePatch: traceState,
        };
    }

    const relatedLogs = logs.filter((entry) => entry.correlationId === log.correlationId);
    return {
        selectedFlow: null,
        tracePatch: generateTraceStateFromLogs(relatedLogs),
    };
}

export function resolveSelectionFromFlow(
    flow: UserFlow | null,
    logs: LogRecord[],
    userFlows: UserFlow[],
    searchText: string,
): {
    selectedLog: LogRecord | null;
    tracePatch: Partial<TraceState>;
    selectedFlow: UserFlow | null;
} {
    if (!flow) {
        return {
            tracePatch: {
                ...initialTraceState,
                userFlows,
                searchText,
            },
            selectedFlow: null,
            selectedLog: null,
        };
    }

    const flowLogs = getLogsForFlow(logs, flow.id, userFlows);
    const selectedLog = flowLogs[0] ?? null;
    const tracePatch = generateTraceStateFromLogs(flowLogs);

    return {
        tracePatch,
        selectedFlow: enrichUserFlow(flow, tracePatch),
        selectedLog,
    };
}