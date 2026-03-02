/**
 * SubJourney Invocation Tests
 *
 * Tests the parser's ability to detect and track SubJourney
 * invocations during B2C journey execution.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import { getTestSteps, getStepCount } from "./test-step-helpers";
import { FlowNodeType } from "@/types/flow-node";
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

            // The SubJourney should exist as a SubJourney node in the FlowNode tree
            const subJourneyNodes = result.flowTree.children.flatMap((c) =>
                c.type === FlowNodeType.SubJourney
                    ? [c]
                    : c.children.filter((gc) => gc.type === FlowNodeType.SubJourney),
            );
            const passwordResetSJ = subJourneyNodes.find((sj) => sj.name === fixture.subJourneys.passwordReset);
            expect(passwordResetSJ).toBeDefined();

            // Invocation step (step 4) should NOT appear as a visible Step node
            const steps = getTestSteps(result);
            const invocationStep = steps.find((s) => s.orchestrationStep === 4);
            expect(invocationStep).toBeUndefined();
        });
    });

    describe("Step Counter Reset", () => {
        it("should handle ORCH_CS reset when entering SubJourney", () => {
            const logs = [buildSubJourneyInvocationStep(fixture, 4, fixture.subJourneys.passwordReset, 0)];

            const result = parseTrace(logs);

            // Invocation steps are not visible in the flow tree (they only push the SubJourney).
            expect(result.success).toBe(true);
            // Step 4 triggers the SubJourney but should NOT appear as a Step node
            const steps = getTestSteps(result);
            const invocationStep = steps.find((s) => s.orchestrationStep === 4);
            expect(invocationStep).toBeUndefined();
            // The SubJourney node should exist in the tree
            const allSubJourneys = result.flowTree.children.flatMap((c) =>
                c.type === FlowNodeType.SubJourney
                    ? [c]
                    : c.children.filter((gc) => gc.type === FlowNodeType.SubJourney),
            );
            expect(allSubJourneys.some((sj) => sj.name === fixture.subJourneys.passwordReset)).toBe(true);
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

            expect(getStepCount(result)).toBeGreaterThanOrEqual(2);
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

            const subJourneyStep = getTestSteps(result).find((s) => s.orchestrationStep === 1);
            expect(subJourneyStep?.journeyName).toBe(fixture.subJourneys.passwordReset);
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

            const subJourneyStep = getTestSteps(result).find((s) => s.orchestrationStep === 1);
            expect(subJourneyStep?.journeyName).toContain(fixture.subJourneys.passwordReset);
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

            // Both SubJourneys should exist as nodes in the FlowNode tree
            const allSubJourneys: typeof result.flowTree[] = [];
            function collectSJs(node: typeof result.flowTree) {
                for (const c of node.children) {
                    if (c.type === FlowNodeType.SubJourney) allSubJourneys.push(c);
                    collectSJs(c);
                }
            }
            collectSJs(result.flowTree);
            expect(allSubJourneys.length).toBeGreaterThanOrEqual(1);
            // Verify at least the mfa SubJourney exists
            expect(allSubJourneys.some((sj) => sj.name === fixture.subJourneys.mfa)).toBe(true);
        });
    });
});
