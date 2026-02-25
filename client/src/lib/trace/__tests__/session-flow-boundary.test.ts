/**
 * Session Flow Boundary Detection Tests
 *
 * Validates that when multiple `Event:AUTH` sessions share the same correlationId
 * (e.g. user clicking browser-back during authentication), the parser correctly
 * detects session boundaries and resets accumulated state.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import {
    createTestFixture,
    buildTraceLogInput,
    buildHeadersClip,
    buildOrchestrationManagerAction,
    buildOrchestrationResult,
    buildPredicateClip,
    buildPredicateResult,
    buildTransitionClip,
    buildComplexClaimsStatebag,
    buildSimpleOrchestrationStep,
    buildSubJourneyInvocationStep,
    type TestFixture,
} from "./fixtures";

describe("Session Flow Boundary Detection", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("single session flow (regression guard)", () => {
        it("should parse a normal single-session flow unchanged", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildTransitionClip("AUTH", "Initial"),
                        buildPredicateClip("NoOpHandler"),
                        buildPredicateResult(true),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(0),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    0,
                ),
                buildSimpleOrchestrationStep(fixture, 2, "Event:API", 1000),
                buildSimpleOrchestrationStep(fixture, 3, "Event:API", 2000),
            ];

            const result = parseTrace(logs);

            expect(result.success).toBe(true);
            expect(result.traceSteps).toHaveLength(3);

            const stepOrders = result.traceSteps.map((s) => s.stepOrder);
            expect(stepOrders).toEqual([1, 2, 3]);
        });
    });

    describe("multiple sessions with same correlationId", () => {
        it("should produce separate steps for two AUTH sessions", () => {
            // Session 1: AUTH with steps 1, 2, 3
            const session1Logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildTransitionClip("AUTH", "Initial"),
                        buildPredicateClip("NoOpHandler"),
                        buildPredicateResult(true),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(0),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    0,
                ),
                buildSimpleOrchestrationStep(fixture, 2, "Event:API", 1000),
                buildSimpleOrchestrationStep(fixture, 3, "Event:API", 2000),
            ];

            // Session 2: new AUTH (browser-back) with steps 1, 2
            const session2Logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildTransitionClip("AUTH", "Initial"),
                        buildPredicateClip("NoOpHandler"),
                        buildPredicateResult(true),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(0),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    60000,
                ),
                buildSimpleOrchestrationStep(fixture, 2, "Event:API", 61000),
            ];

            const result = parseTrace([...session1Logs, ...session2Logs]);

            expect(result.success).toBe(true);
            // Session 1: step 1, 2, 3 + Session 2: step 1, 2 = 5 total
            expect(result.traceSteps).toHaveLength(5);

            // Session 2 step 1 should be a separate entry from session 1 step 1
            const stepsWithOrder1 = result.traceSteps.filter((s) => s.stepOrder === 1);
            expect(stepsWithOrder1).toHaveLength(2);
        });

        it("should handle three sessions (triple browser-back)", () => {
            // Session 1: 2 steps
            const session1Logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildTransitionClip("AUTH", "Initial"),
                        buildPredicateClip("NoOpHandler"),
                        buildPredicateResult(true),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(0),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    0,
                ),
                buildSimpleOrchestrationStep(fixture, 2, "Event:API", 1000),
            ];

            // Session 2: 2 steps
            const session2Logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildTransitionClip("AUTH", "Initial"),
                        buildPredicateClip("NoOpHandler"),
                        buildPredicateResult(true),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(0),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    60000,
                ),
                buildSimpleOrchestrationStep(fixture, 2, "Event:API", 61000),
            ];

            // Session 3: 1 step
            const session3Logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildTransitionClip("AUTH", "Initial"),
                        buildPredicateClip("NoOpHandler"),
                        buildPredicateResult(true),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(0),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    120000,
                ),
            ];

            const result = parseTrace([
                ...session1Logs,
                ...session2Logs,
                ...session3Logs,
            ]);

            expect(result.success).toBe(true);
            // 2 + 2 + 1 = 5 total steps
            expect(result.traceSteps).toHaveLength(5);

            // All three sessions have step 1 — they must be separate entries
            const stepsWithOrder1 = result.traceSteps.filter((s) => s.stepOrder === 1);
            expect(stepsWithOrder1).toHaveLength(3);
        });

        it("should reset statebag between sessions", () => {
            // Session 1: step with claims in statebag
            const session1Logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildTransitionClip("AUTH", "Initial"),
                        buildPredicateClip("NoOpHandler"),
                        buildPredicateResult(true),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(0),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(
                            1,
                            buildComplexClaimsStatebag({
                                signInName: "test@example.com",
                                objectId: "session1-oid",
                            }),
                        ),
                    ],
                    0,
                ),
            ];

            // Session 2: new AUTH — claims should be reset
            const session2Logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildTransitionClip("AUTH", "Initial"),
                        buildPredicateClip("NoOpHandler"),
                        buildPredicateResult(true),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(0),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    60000,
                ),
            ];

            const result = parseTrace([...session1Logs, ...session2Logs]);

            expect(result.success).toBe(true);
            expect(result.traceSteps).toHaveLength(2);

            // Session 1 step should have the claims
            const session1Step = result.traceSteps[0];
            expect(session1Step.claimsSnapshot).toHaveProperty("signInName", "test@example.com");
            expect(session1Step.claimsSnapshot).toHaveProperty("objectId", "session1-oid");

            // Session 2 step should NOT have session 1's claims
            const session2Step = result.traceSteps[1];
            expect(session2Step.claimsSnapshot).not.toHaveProperty("signInName");
            expect(session2Step.claimsSnapshot).not.toHaveProperty("objectId");
        });

        it("should reset journey stack between sessions", () => {
            // Session 1: invoke a sub-journey, then step inside it
            const session1Logs = [
                buildSubJourneyInvocationStep(
                    fixture,
                    4,
                    fixture.subJourneys.passwordReset,
                    0,
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    1000,
                ),
            ];

            // Session 2: new AUTH — should start at root, not in sub-journey
            const session2Logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildTransitionClip("AUTH", "Initial"),
                        buildPredicateClip("NoOpHandler"),
                        buildPredicateResult(true),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(0),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    60000,
                ),
            ];

            const result = parseTrace([...session1Logs, ...session2Logs]);

            expect(result.success).toBe(true);

            // Find the session 2 step (last step)
            const session2Step = result.traceSteps[result.traceSteps.length - 1];

            // Session 2 step should use the root journey context, not the sub-journey
            // The root journey context uses the main policyId as journeyContextId
            expect(session2Step.journeyContextId).toBe(fixture.policyId);
        });
    });
});
