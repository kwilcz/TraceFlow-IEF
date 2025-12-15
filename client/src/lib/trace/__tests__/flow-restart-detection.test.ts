/**
 * Flow Restart Detection Tests
 *
 * Tests the FlowAnalyzer's ability to detect when a user navigates back
 * with the browser back button, causing the flow to restart.
 *
 * When a user clicks "back" in the browser during a B2C flow:
 * 1. The same correlation ID is maintained
 * 2. ORCH_CS (orchestration step) goes backwards or resets to 0
 * 3. This should be treated as a separate flow (statebag resets)
 *
 * Important: Each log file from the API represents a single HTTP request.
 * A log file that starts a new flow will contain ORCH_CS=0, often followed
 * by ORCH_CS=1 (or higher) within the same log as the flow progresses.
 */

import { describe, it, expect } from "vitest";
import { groupLogsIntoFlows } from "../services/flow-analyzer";
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
    policyId: string
): HeadersClip {
    return {
        Kind: "Headers",
        Content: {
            UserJourneyRecorderEndpoint: "urn:journeyrecorder:applicationinsights",
            CorrelationId: correlationId,
            EventInstance: "Event:AUTH",
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

describe("Flow Restart Detection", () => {
    describe("Normal flow progression", () => {
        it("should group sequential steps as single flow", () => {
            const correlationId = "same-correlation-id";
            const policyId = generateTestPolicyId();

            const logs: LogRecord[] = [
                createLogRecord("log1", correlationId, policyId, 1, new Date("2024-01-15T10:30:00.000Z")),
                createLogRecord("log2", correlationId, policyId, 2, new Date("2024-01-15T10:30:05.000Z")),
                createLogRecord("log3", correlationId, policyId, 3, new Date("2024-01-15T10:30:10.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows.length).toBe(1);
            expect(flows[0].logIds).toHaveLength(3);
            expect(flows[0].correlationId).toBe(correlationId);
        });
    });

    describe("Flow restart by step 0", () => {
        it("should detect new flow when step 0 is encountered after higher steps", () => {
            const correlationId = "same-correlation-id";
            const policyId = generateTestPolicyId();

            const logs: LogRecord[] = [
                // First flow: steps 0 -> 1 -> 2
                createLogRecord("log1", correlationId, policyId, 0, new Date("2024-01-15T10:30:00.000Z")),
                createLogRecord("log2", correlationId, policyId, 1, new Date("2024-01-15T10:30:05.000Z")),
                createLogRecord("log3", correlationId, policyId, 2, new Date("2024-01-15T10:30:10.000Z")),
                // User clicks back - flow restarts at step 0
                createLogRecord("log4", correlationId, policyId, 0, new Date("2024-01-15T10:30:30.000Z")),
                createLogRecord("log5", correlationId, policyId, 1, new Date("2024-01-15T10:30:35.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows.length).toBe(2);
            expect(flows[0].logIds).toEqual(["log1", "log2", "log3"]);
            expect(flows[1].logIds).toEqual(["log4", "log5"]);
        });

        it("should detect step 0 even when log contains multiple steps (0, 1, 2)", () => {
            const correlationId = "same-correlation-id";
            const policyId = generateTestPolicyId();

            const logs: LogRecord[] = [
                // First flow: single log with steps 0 -> 1 -> 2
                createLogWithMultipleSteps("log1", correlationId, policyId, [0, 1, 2], new Date("2024-01-15T10:30:00.000Z")),
                // Continuation: step 3
                createLogRecord("log2", correlationId, policyId, 3, new Date("2024-01-15T10:30:05.000Z")),
                // User clicks back - new log with steps 0 -> 1
                createLogWithMultipleSteps("log3", correlationId, policyId, [0, 1], new Date("2024-01-15T10:30:30.000Z")),
                // Continuation of second flow: step 2
                createLogRecord("log4", correlationId, policyId, 2, new Date("2024-01-15T10:30:35.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows.length).toBe(2);
            expect(flows[0].logIds).toEqual(["log1", "log2"]);
            expect(flows[1].logIds).toEqual(["log3", "log4"]);
        });
    });

    describe("Flow restart by step going backwards", () => {
        it("should detect new flow when step number decreases", () => {
            const correlationId = "same-correlation-id";
            const policyId = generateTestPolicyId();

            const logs: LogRecord[] = [
                // First flow: steps 1 -> 2 -> 3
                createLogRecord("log1", correlationId, policyId, 1, new Date("2024-01-15T10:30:00.000Z")),
                createLogRecord("log2", correlationId, policyId, 2, new Date("2024-01-15T10:30:05.000Z")),
                createLogRecord("log3", correlationId, policyId, 3, new Date("2024-01-15T10:30:10.000Z")),
                // User clicks back - flow restarts at step 1 (browser back button)
                createLogRecord("log4", correlationId, policyId, 1, new Date("2024-01-15T10:30:30.000Z")),
                createLogRecord("log5", correlationId, policyId, 2, new Date("2024-01-15T10:30:35.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows.length).toBe(2);
            expect(flows[0].logIds).toEqual(["log1", "log2", "log3"]);
            expect(flows[1].logIds).toEqual(["log4", "log5"]);
        });

        it("should detect multiple restarts", () => {
            const correlationId = "same-correlation-id";
            const policyId = generateTestPolicyId();

            const logs: LogRecord[] = [
                // First flow
                createLogRecord("log1", correlationId, policyId, 1, new Date("2024-01-15T10:30:00.000Z")),
                createLogRecord("log2", correlationId, policyId, 2, new Date("2024-01-15T10:30:05.000Z")),
                // First restart
                createLogRecord("log3", correlationId, policyId, 1, new Date("2024-01-15T10:31:00.000Z")),
                createLogRecord("log4", correlationId, policyId, 2, new Date("2024-01-15T10:31:05.000Z")),
                createLogRecord("log5", correlationId, policyId, 3, new Date("2024-01-15T10:31:10.000Z")),
                // Second restart
                createLogRecord("log6", correlationId, policyId, 1, new Date("2024-01-15T10:32:00.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows.length).toBe(3);
            expect(flows[0].logIds).toEqual(["log1", "log2"]);
            expect(flows[1].logIds).toEqual(["log3", "log4", "log5"]);
            expect(flows[2].logIds).toEqual(["log6"]);
        });
    });

    describe("Different correlation IDs", () => {
        it("should always create separate flows for different correlation IDs", () => {
            const testPolicyId = generateTestPolicyId();
            const logs: LogRecord[] = [
                createLogRecord("log1", "corr-1", testPolicyId, 1, new Date("2024-01-15T10:30:00.000Z")),
                createLogRecord("log2", "corr-2", testPolicyId, 1, new Date("2024-01-15T10:30:05.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows.length).toBe(2);
            expect(flows[0].correlationId).toBe("corr-1");
            expect(flows[1].correlationId).toBe("corr-2");
        });
    });

    describe("Flow IDs", () => {
        it("should generate unique flow IDs with correlation-based prefix", () => {
            const correlationId = "same-correlation-id";
            const policyId = generateTestPolicyId();

            const logs: LogRecord[] = [
                createLogRecord("log1", correlationId, policyId, 1, new Date("2024-01-15T10:30:00.000Z")),
                createLogRecord("log2", correlationId, policyId, 0, new Date("2024-01-15T10:31:00.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows.length).toBe(2);
            expect(flows[0].id).toBe(`${correlationId}-0`);
            expect(flows[1].id).toBe(`${correlationId}-1`);
        });
    });

    describe("Real-world scenario: 3 flows with same correlationId", () => {
        it("should correctly identify 3 separate flows from 8 logs", () => {
            const correlationId = `${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 14)}`;
            const policyId = generateTestPolicyId();

            // Simulating the scenario: user starts flow 3 times
            // Each time they use back button, they get a new log file with step 0
            const logs: LogRecord[] = [
                // Flow 1: logs with steps 0, 1, 2, 3 (user got to step 3, then clicked back)
                createLogWithMultipleSteps("log1", correlationId, policyId, [0, 1], new Date("2024-01-15T10:30:00.000Z")),
                createLogRecord("log2", correlationId, policyId, 2, new Date("2024-01-15T10:30:05.000Z")),
                createLogRecord("log3", correlationId, policyId, 3, new Date("2024-01-15T10:30:10.000Z")),
                
                // Flow 2: user clicked back, new flow starts with step 0
                createLogWithMultipleSteps("log4", correlationId, policyId, [0, 1], new Date("2024-01-15T10:31:00.000Z")),
                createLogRecord("log5", correlationId, policyId, 2, new Date("2024-01-15T10:31:05.000Z")),
                createLogRecord("log6", correlationId, policyId, 3, new Date("2024-01-15T10:31:10.000Z")),
                
                // Flow 3: user clicked back again, another new flow
                createLogWithMultipleSteps("log7", correlationId, policyId, [0, 1], new Date("2024-01-15T10:32:00.000Z")),
                createLogRecord("log8", correlationId, policyId, 2, new Date("2024-01-15T10:32:05.000Z")),
            ];

            const flows = groupLogsIntoFlows(logs);

            expect(flows.length).toBe(3);
            expect(flows[0].logIds).toEqual(["log1", "log2", "log3"]);
            expect(flows[1].logIds).toEqual(["log4", "log5", "log6"]);
            expect(flows[2].logIds).toEqual(["log7", "log8"]);
            
            // All flows should have the same correlationId
            expect(flows[0].correlationId).toBe(correlationId);
            expect(flows[1].correlationId).toBe(correlationId);
            expect(flows[2].correlationId).toBe(correlationId);
            
            // But different flow IDs
            expect(flows[0].id).toBe(`${correlationId}-0`);
            expect(flows[1].id).toBe(`${correlationId}-1`);
            expect(flows[2].id).toBe(`${correlationId}-2`);
        });
    });
});
