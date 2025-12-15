/**
 * SubJourney Invocation Tests
 *
 * Tests the parser's ability to detect and track SubJourney
 * invocations during B2C journey execution.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import {
    createTestFixture,
    buildTraceLogInput,
    buildHeadersClip,
    buildOrchestrationManagerAction,
    buildOrchestrationResult,
    buildActionClip,
    buildActionResult,
    buildSubJourneyInvokedRecord,
    buildSubJourneyInvocationStep,
    type TestFixture,
} from "./fixtures";

describe("SubJourney Invocation", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("SubJourney Detection", () => {
        it("should detect SubJourney invocation from EnqueueNewJourneyHandler", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        buildActionClip("EnqueueNewJourneyHandler"),
                        buildActionResult(true, buildSubJourneyInvokedRecord(fixture.subJourneys.passwordReset)),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(0),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            const step4 = result.traceSteps.find((s) => s.stepOrder === 4);
            expect(step4?.subJourneyId).toBe(fixture.subJourneys.passwordReset);
        });

        it("should detect SubJourney invocation from SubJourneyDispatchActionHandler", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(3),
                        buildActionClip("SubJourneyDispatchActionHandler"),
                        buildActionResult(true, {
                            Values: [
                                { Key: "SubJourney", Value: fixture.subJourneys.mfa },
                                { Key: "SubJourneyId", Value: fixture.subJourneys.mfa },
                            ],
                        }),
                        buildOrchestrationManagerAction(),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].subJourneyId).toBe(fixture.subJourneys.mfa);
        });
    });

    describe("Step Counter Reset", () => {
        it("should handle ORCH_CS reset when entering SubJourney", () => {
            const logs = [buildSubJourneyInvocationStep(fixture, 4, fixture.subJourneys.passwordReset, 0)];

            const result = parseTrace(logs);

            const stepOrders = result.traceSteps.map((s) => s.stepOrder);
            expect(stepOrders).toContain(4);
        });

        it("should track steps within SubJourney context", () => {
            const logs = [
                buildSubJourneyInvocationStep(fixture, 4, fixture.subJourneys.passwordReset, 0),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    1000
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                    ],
                    2000
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe("Journey Context Tracking", () => {
        it("should update currentJourneyName when in SubJourney context", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        buildActionClip("EnqueueNewJourneyHandler"),
                        buildActionResult(true, buildSubJourneyInvokedRecord(fixture.subJourneys.passwordReset)),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            const subJourneyStep = result.traceSteps.find((s) => s.stepOrder === 1);
            expect(subJourneyStep?.currentJourneyName).toBe(fixture.subJourneys.passwordReset);
        });

        it("should update journeyContextId when entering SubJourney", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        buildActionClip("EnqueueNewJourneyHandler"),
                        buildActionResult(true, buildSubJourneyInvokedRecord(fixture.subJourneys.passwordReset)),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            const subJourneyStep = result.traceSteps.find((s) => s.stepOrder === 1);
            expect(subJourneyStep?.journeyContextId).toContain(fixture.subJourneys.passwordReset);
        });
    });

    describe("Nested SubJourneys", () => {
        it("should handle multiple SubJourney invocations in sequence", () => {
            const logs = [
                buildSubJourneyInvocationStep(fixture, 3, fixture.subJourneys.mfa, 0),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                    ],
                    1000
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(5),
                        buildActionClip("EnqueueNewJourneyHandler"),
                        buildActionResult(true, buildSubJourneyInvokedRecord(fixture.subJourneys.passwordReset)),
                    ],
                    2000
                ),
            ];

            const result = parseTrace(logs);

            const stepsWithSubJourney = result.traceSteps.filter((s) => s.subJourneyId);
            expect(stepsWithSubJourney.length).toBeGreaterThanOrEqual(1);
        });
    });
});
