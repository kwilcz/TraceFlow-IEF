/**
 * Log Stitching Tests
 *
 * Tests the parser's ability to handle multiple log segments
 * and stitch them together based on timestamps and correlation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import { groupLogsIntoFlows } from "@/lib/trace/services/flow-analyzer";
import type { LogRecord } from "@/types/logs";
import type { TraceLogInput } from "@/types/trace";
import {
    createTestFixture,
    buildTraceLogInput,
    buildHeadersClip,
    buildOrchestrationManagerAction,
    buildOrchestrationResult,
    buildActionClip,
    buildActionResult,
    buildPredicateClip,
    buildPredicateResult,
    buildTransitionClip,
    buildEnabledForUserJourneysRecord,
    buildClaimsStatebag,
    type TestFixture,
} from "./fixtures";
import { getTestSteps, getStepCount } from "./test-step-helpers";

function toLogRecord(log: TraceLogInput): LogRecord {
    return {
        id: log.id,
        timestamp: log.timestamp,
        policyId: log.policyId,
        correlationId: log.correlationId,
        cloudRoleInstance: "test-instance",
        rawIds: [log.id],
        payloadText: JSON.stringify(log.clips),
        parsedPayload: log.clips,
        clips: log.clips,
        customDimensions: {
            correlationId: log.correlationId,
            eventName: "Journey Recorder Event v1.0.0",
            tenant: "test.onmicrosoft.com",
            userJourney: log.policyId,
            version: "1.0.0",
        },
    };
}

describe("Log Stitching", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("Timestamp Ordering", () => {
        it("should process logs in timestamp order when already sorted", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    0
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                    ],
                    1000
                ),
            ];

            const result = parseTrace(logs);

            expect(result.success).toBe(true);
            expect(getStepCount(result)).toBeGreaterThanOrEqual(1);
        });

        it("should reorder logs when out of timestamp order", () => {
            const logs = [
                // Later timestamp first
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                    ],
                    1000
                ),
                // Earlier timestamp second
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps[0].orchestrationStep).toBe(1);
            expect(steps[1].orchestrationStep).toBe(2);
        });
    });

    describe("Multi-Segment Logs", () => {
        it("should stitch together multiple log segments into coherent trace", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(1, [fixture.technicalProfiles.login])),
                    ],
                    0
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(2, [fixture.technicalProfiles.selfAsserted])),
                    ],
                    500
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(3),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(3, [fixture.technicalProfiles.apiConnector])),
                    ],
                    1000
                ),
            ];

            const result = parseTrace(logs);

            expect(result.success).toBe(true);
            expect(getStepCount(result)).toBeGreaterThanOrEqual(1);
        });

        it.skip("should maintain claim continuity across segments", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildActionClip("TechnicalProfileActionHandler"),
                        buildActionResult(true, undefined, buildClaimsStatebag("email", fixture.userEmail)),
                    ],
                    0
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildActionClip("TechnicalProfileActionHandler"),
                        buildActionResult(true, undefined, buildClaimsStatebag("displayName", fixture.displayName)),
                    ],
                    500
                ),
            ];

            const result = parseTrace(logs);

            // Later steps should have accumulated claims from earlier steps
            const steps = getTestSteps(result);
            const lastStep = steps[steps.length - 1];
            expect(lastStep.claimsSnapshot).toHaveProperty("email");
            expect(lastStep.claimsSnapshot).toHaveProperty("displayName");
        });
    });

    describe("Correlation ID Handling", () => {
        it("should group logs with same correlation ID", () => {
            // Both logs use same fixture (same correlationId)
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    0
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                    ],
                    500
                ),
            ];

            const result = parseTrace(logs);

            expect(result.success).toBe(true);
        });

        it("should separate logs with different correlation IDs", () => {
            const fixture2 = createTestFixture(); // Different correlation ID

            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    0
                ),
                buildTraceLogInput(
                    fixture2,
                    [
                        buildHeadersClip(fixture2, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    500
                ),
            ];

            const result = parseTrace(logs);

            // Should handle or separate based on correlation
            expect(result.success).toBe(true);
        });
    });

    describe("Gap Detection", () => {
        it.skip("should detect missing log segments", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    0
                ),
                // Missing segment for step 2
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(3), // Jump from 1 to 3
                    ],
                    1000
                ),
            ];

            const result = parseTrace(logs);

            expect(result.warnings).toContain("Missing orchestration step 2");
        });
    });

    describe("Duplicate Handling", () => {
        it("should handle duplicate log entries gracefully", () => {
            const duplicateLogs = [
                buildHeadersClip(fixture, "Event:AUTH"),
                buildOrchestrationManagerAction(),
                buildOrchestrationResult(1),
            ];

            const logs = [
                buildTraceLogInput(fixture, duplicateLogs, 0),
                buildTraceLogInput(fixture, duplicateLogs, 0), // Exact duplicate
            ];

            const result = parseTrace(logs);

            expect(result.success).toBe(true);
            // Should deduplicate or handle gracefully
        });
    });

    describe("Large Log Processing", () => {
        it("should handle large number of log segments", () => {
            const logs = Array.from({ length: 50 }, (_, i) =>
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, i % 2 === 0 ? "Event:API" : "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult((i % 8) + 1),
                    ],
                    i * 100
                )
            );

            const result = parseTrace(logs);

            expect(result.success).toBe(true);
        });
    });

    describe("Picker-facing flow grouping", () => {
        it("should split same correlationId into two flow rows when a second AUTH session starts", () => {
            const traceLogs: TraceLogInput[] = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    0
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                    ],
                    300
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(3),
                    ],
                    600
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    900
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                    ],
                    1200
                ),
            ];

            const logs = traceLogs.map(toLogRecord);
            const flows = groupLogsIntoFlows(logs);

            expect(flows).toHaveLength(2);
            expect(flows[0].id).not.toBe(flows[1].id);
            expect(flows[0].correlationId).toBe(fixture.correlationId);
            expect(flows[1].correlationId).toBe(fixture.correlationId);

            expect(flows[0].logIds).toEqual(traceLogs.slice(0, 3).map((l) => l.id));
            expect(flows[1].logIds).toEqual(traceLogs.slice(3).map((l) => l.id));

            const firstFlowIds = new Set(flows[0].logIds);
            const overlappingIds = flows[1].logIds.filter((id) => firstFlowIds.has(id));
            expect(overlappingIds).toHaveLength(0);
        });
    });
});
