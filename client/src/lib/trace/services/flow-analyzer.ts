/**
 * Flow Analyzer Service
 *
 * Groups logs into distinct user flows by correlationId.
 * Each unique correlationId produces exactly one UserFlow.
 * Session boundary detection within a correlationId is handled
 * by the parser (HeadersProcessor Event:AUTH detection).
 */

import type { LogRecord } from "@/types/logs";
import { parseTrace } from "../trace-parser";
import type { UserFlow } from "@/types/trace";

/**
 * Analyzes logs and groups them into user flows by correlationId.
 */
export class FlowAnalyzer {
    /**
     * Groups logs into flows — one flow per unique correlationId.
     */
    analyze(logs: LogRecord[]): UserFlow[] {
        if (logs.length === 0) return [];

        const sortedLogs = [...logs].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );

        // Group by correlationId preserving sort order
        const groups = new Map<string, LogRecord[]>();
        for (const log of sortedLogs) {
            const group = groups.get(log.correlationId);
            if (group) {
                group.push(log);
            } else {
                groups.set(log.correlationId, [log]);
            }
        }

        const flows: UserFlow[] = [];
        let index = 0;

        for (const [correlationId, group] of groups) {
            const parserResult = parseTrace(
                group.map((log) => ({
                    id: log.id,
                    timestamp: log.timestamp,
                    policyId: log.policyId,
                    correlationId: log.correlationId,
                    clips: log.clips,
                }))
            );

            const segments =
                parserResult.sessions.length > 1
                    ? splitByAuthSessionBoundaries(group)
                    : [group];

            for (const segment of segments) {
                if (segment.length === 0) continue;

                const first = segment[0];
                const last = segment[segment.length - 1];

                flows.push({
                    id: `${correlationId}-${index}`,
                    correlationId,
                    policyId: first.policyId,
                    startTime: first.timestamp,
                    endTime: last.timestamp,
                    stepCount: 0,
                    completed: false,
                    hasErrors: false,
                    cancelled: false,
                    subJourneys: [],
                    logIds: segment.map((l) => l.id),
                    userEmail: undefined,
                    userObjectId: undefined,
                });

                index++;
            }
        }

        return flows;
    }
}

function splitByAuthSessionBoundaries(logs: LogRecord[]): LogRecord[][] {
    const segments: LogRecord[][] = [];
    let current: LogRecord[] = [];
    let hasSeenAuth = false;

    for (const log of logs) {
        const isAuthBoundary = isAuthHeadersEvent(log);

        if (isAuthBoundary && hasSeenAuth && current.length > 0) {
            segments.push(current);
            current = [log];
            continue;
        }

        if (isAuthBoundary) {
            hasSeenAuth = true;
        }

        current.push(log);
    }

    if (current.length > 0) {
        segments.push(current);
    }

    return segments;
}

function isAuthHeadersEvent(log: LogRecord): boolean {
    return log.clips.some(
        (clip) =>
            clip.Kind === "Headers" &&
            typeof clip.Content === "object" &&
            clip.Content !== null &&
            "EventInstance" in clip.Content &&
            clip.Content.EventInstance === "Event:AUTH"
    );
}

/**
 * Creates a new FlowAnalyzer instance.
 */
export function createFlowAnalyzer(): FlowAnalyzer {
    return new FlowAnalyzer();
}

/**
 * Groups log records into distinct user flows — one per correlationId.
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
