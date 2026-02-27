/**
 * Flow Grouping Tests
 *
 * Tests the FlowAnalyzer's correlationId-based grouping.
 * Each unique correlationId produces exactly one UserFlow.
 * Session boundary detection within a correlationId is handled
 * by the parser (HeadersProcessor Event:AUTH detection).
 */

import { describe, it, expect } from "vitest";
import { groupLogsIntoFlows, getLogsForFlow } from "../services/flow-analyzer";
import type { LogRecord } from "@/types/logs";
import type {
    Clip,
    HeadersClip,
    ActionClip,
    HandlerResultClip,
    Statebag,
} from "@/types/journey-recorder";

function createHeadersClip(
    correlationId: string,
    policyId: string,
    eventInstance: "Event:AUTH" | "Event:API" | "Event:SELFASSERTED" | "Event:ClaimsExchange" = "Event:API"
): HeadersClip {
    return {
        Kind: "Headers",
        Content: {
            UserJourneyRecorderEndpoint: "urn:journeyrecorder:applicationinsights",
            CorrelationId: correlationId,
            EventInstance: eventInstance,
            TenantId: "test.onmicrosoft.com",
            PolicyId: policyId,
        },
    };
}

function createOrchestrationManagerClip(orchStep: number): [ActionClip, HandlerResultClip] {
    return [
        {
            Kind: "Action",
            Content: "Web.TPEngine.OrchestrationManager",
        },
        {
            Kind: "HandlerResult",
            Content: {
                Result: true,
                Statebag: {
                    ORCH_CS: {
                        c: new Date().toISOString(),
                        k: "ORCH_CS",
                        v: String(orchStep),
                        p: true,
                    },
                } as Statebag,
            },
        },
    ];
}

function createLogRecord(
    id: string,
    correlationId: string,
    policyId: string,
    orchStep: number,
    timestamp: Date
): LogRecord {
    const [actionClip, resultClip] = createOrchestrationManagerClip(orchStep);
    
    return {
        id,
        timestamp,
        policyId,
        correlationId,
        clips: [
            createHeadersClip(correlationId, policyId),
            actionClip,
            resultClip,
        ] as Clip[],
    };
}

/**
 * Creates a log that contains multiple ORCH_CS values.
 * This simulates a real log file where the flow initializes (step 0)
 * and then immediately progresses to step 1.
 */
function createLogWithMultipleSteps(
    id: string,
    correlationId: string,
    policyId: string,
    steps: number[],
    timestamp: Date
): LogRecord {
    const clips: Clip[] = [createHeadersClip(correlationId, policyId)];
    
    for (const step of steps) {
        const [actionClip, resultClip] = createOrchestrationManagerClip(step);
        clips.push(actionClip, resultClip);
    }
    
    return {
        id,
        timestamp,
        policyId,
        correlationId,
        clips,
    };
}

// Generate policy ID for tests
const generateTestPolicyId = () => `B2C_1A_TEST_SignUpOrSignIn_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

describe("Flow Grouping", () => {
    describe("correlationId-based grouping", () => {
        it("should create one flow per unique correlationId", () => {
            const policyId = generateTestPolicyId();

            const logs: LogRecord[] = [
                createLogRecord("log1", "corr-1", policyId, 1, new Date("2024-01-15T10:30:00.000Z")),
                createLogRecord("log2", "corr-2", policyId, 1, new Date("2024-01-15T10:30:05.000Z")),
                createLogRecord("log3", "corr-3", policyId, 1, new Date("2024-01-15T10:30:10.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows).toHaveLength(3);
            expect(flows[0].correlationId).toBe("corr-1");
            expect(flows[1].correlationId).toBe("corr-2");
            expect(flows[2].correlationId).toBe("corr-3");
        });

        it("should sort logs by timestamp within a flow", () => {
            const correlationId = "same-correlation-id";
            const policyId = generateTestPolicyId();

            // Provide logs out of order
            const logs: LogRecord[] = [
                createLogRecord("log3", correlationId, policyId, 3, new Date("2024-01-15T10:30:10.000Z")),
                createLogRecord("log1", correlationId, policyId, 1, new Date("2024-01-15T10:30:00.000Z")),
                createLogRecord("log2", correlationId, policyId, 2, new Date("2024-01-15T10:30:05.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows).toHaveLength(1);
            expect(flows[0].logIds).toEqual(["log1", "log2", "log3"]);
        });

        it("should include all logIds in the flow", () => {
            const correlationId = "same-correlation-id";
            const policyId = generateTestPolicyId();

            const logs: LogRecord[] = [
                createLogRecord("log1", correlationId, policyId, 1, new Date("2024-01-15T10:30:00.000Z")),
                createLogRecord("log2", correlationId, policyId, 2, new Date("2024-01-15T10:30:05.000Z")),
                createLogRecord("log3", correlationId, policyId, 3, new Date("2024-01-15T10:30:10.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows[0].logIds).toEqual(["log1", "log2", "log3"]);
        });

        it("should set startTime/endTime from first/last log", () => {
            const correlationId = "same-correlation-id";
            const policyId = generateTestPolicyId();

            const start = new Date("2024-01-15T10:30:00.000Z");
            const end = new Date("2024-01-15T10:30:10.000Z");

            const logs: LogRecord[] = [
                createLogRecord("log1", correlationId, policyId, 1, start),
                createLogRecord("log2", correlationId, policyId, 2, new Date("2024-01-15T10:30:05.000Z")),
                createLogRecord("log3", correlationId, policyId, 3, end),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows[0].startTime).toEqual(start);
            expect(flows[0].endTime).toEqual(end);
        });

        it("should extract policyId from first log", () => {
            const correlationId = "same-correlation-id";
            const policyId = "B2C_1A_FIRST_POLICY";

            const logs: LogRecord[] = [
                createLogRecord("log1", correlationId, policyId, 1, new Date("2024-01-15T10:30:00.000Z")),
                createLogRecord("log2", correlationId, "B2C_1A_SECOND_POLICY", 2, new Date("2024-01-15T10:30:05.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows[0].policyId).toBe(policyId);
        });
    });

    describe("same correlationId (single flow)", () => {
        it("should group all logs with same correlationId into one flow", () => {
            const correlationId = "same-correlation-id";
            const policyId = generateTestPolicyId();

            // Even with step 0 appearing multiple times, same correlationId = one flow
            const logs: LogRecord[] = [
                createLogWithMultipleSteps("log1", correlationId, policyId, [0, 1], new Date("2024-01-15T10:30:00.000Z")),
                createLogRecord("log2", correlationId, policyId, 2, new Date("2024-01-15T10:30:05.000Z")),
                createLogRecord("log3", correlationId, policyId, 3, new Date("2024-01-15T10:30:10.000Z")),
                // Step 0 again — does NOT split the flow (parser handles session boundaries)
                createLogWithMultipleSteps("log4", correlationId, policyId, [0, 1], new Date("2024-01-15T10:31:00.000Z")),
                createLogRecord("log5", correlationId, policyId, 2, new Date("2024-01-15T10:31:05.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows).toHaveLength(1);
            expect(flows[0].logIds).toEqual(["log1", "log2", "log3", "log4", "log5"]);
            expect(flows[0].correlationId).toBe(correlationId);
        });

        it("should group backward step numbers under the same correlationId into one flow", () => {
            const correlationId = "same-correlation-id";
            const policyId = generateTestPolicyId();

            const logs: LogRecord[] = [
                createLogRecord("log1", correlationId, policyId, 1, new Date("2024-01-15T10:30:00.000Z")),
                createLogRecord("log2", correlationId, policyId, 2, new Date("2024-01-15T10:30:05.000Z")),
                createLogRecord("log3", correlationId, policyId, 3, new Date("2024-01-15T10:30:10.000Z")),
                // Step goes backward — still same flow (parser handles session boundaries)
                createLogRecord("log4", correlationId, policyId, 1, new Date("2024-01-15T10:30:30.000Z")),
                createLogRecord("log5", correlationId, policyId, 2, new Date("2024-01-15T10:30:35.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows).toHaveLength(1);
            expect(flows[0].logIds).toEqual(["log1", "log2", "log3", "log4", "log5"]);
        });
    });

    describe("get logs for flow", () => {
        it("should return only logs belonging to the specified flow", () => {
            const policyId = generateTestPolicyId();

            const logs: LogRecord[] = [
                createLogRecord("log1", "corr-1", policyId, 1, new Date("2024-01-15T10:30:00.000Z")),
                createLogRecord("log2", "corr-2", policyId, 1, new Date("2024-01-15T10:30:05.000Z")),
                createLogRecord("log3", "corr-1", policyId, 2, new Date("2024-01-15T10:30:10.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);
            const logsForFlow = getLogsForFlow(logs, flows[0].id, flows);

            expect(logsForFlow).toHaveLength(2);
            expect(logsForFlow.map((l) => l.id)).toEqual(["log1", "log3"]);
        });

        it("should return empty array for unknown flow ID", () => {
            const policyId = generateTestPolicyId();

            const logs: LogRecord[] = [
                createLogRecord("log1", "corr-1", policyId, 1, new Date("2024-01-15T10:30:00.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);
            const logsForFlow = getLogsForFlow(logs, "nonexistent-flow-id", flows);

            expect(logsForFlow).toEqual([]);
        });
    });

    describe("flow IDs", () => {
        it("should generate correlationId-based flow IDs", () => {
            const policyId = generateTestPolicyId();

            const logs: LogRecord[] = [
                createLogRecord("log1", "corr-aaa", policyId, 1, new Date("2024-01-15T10:30:00.000Z")),
                createLogRecord("log2", "corr-bbb", policyId, 1, new Date("2024-01-15T10:30:05.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows).toHaveLength(2);
            expect(flows[0].id).toBe("corr-aaa-0");
            expect(flows[1].id).toBe("corr-bbb-1");
        });

        it("should assign index 0 for a single correlationId flow", () => {
            const correlationId = "single-corr";
            const policyId = generateTestPolicyId();

            const logs: LogRecord[] = [
                createLogRecord("log1", correlationId, policyId, 1, new Date("2024-01-15T10:30:00.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows[0].id).toBe(`${correlationId}-0`);
        });
    });

    describe("default flow properties", () => {
        it("should initialize enrichment-pending fields to defaults", () => {
            const correlationId = "test-corr";
            const policyId = generateTestPolicyId();

            const logs: LogRecord[] = [
                createLogRecord("log1", correlationId, policyId, 1, new Date("2024-01-15T10:30:00.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);
            const flow = flows[0];

            expect(flow.stepCount).toBe(0);
            expect(flow.completed).toBe(false);
            expect(flow.hasErrors).toBe(false);
            expect(flow.cancelled).toBe(false);
            expect(flow.subJourneys).toEqual([]);
            expect(flow.userEmail).toBeUndefined();
            expect(flow.userObjectId).toBeUndefined();
        });
    });
});
