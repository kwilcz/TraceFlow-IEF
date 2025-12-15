/**
 * Execution Map Tests
 *
 * Tests the parser's ability to build execution maps
 * including node IDs, visit counts, and state transitions.
 *
 * The ExecutionMap tracks:
 * - graphNodeId: Unique ID for ReactFlow node (e.g., "Policy-Step1")
 * - visitCount: How many times a node was visited
 * - status: Success/Error/Skipped/PendingInput
 * - stepIndices: Array of sequence numbers for each visit
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
    buildPredicateClip,
    buildPredicateResult,
    buildTransitionClip,
    buildEnabledForUserJourneysRecord,
    buildClaimsStatebag,
    type TestFixture,
} from "./fixtures";

describe("Execution Map", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("Node ID Mapping", () => {
        it("should assign unique graphNodeIds to each trace step", () => {
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
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(2, [fixture.technicalProfiles.apiConnector])),
                    ],
                    500
                ),
            ];

            const result = parseTrace(logs);

            const graphNodeIds = result.traceSteps.map((s) => s.graphNodeId);
            const uniqueGraphNodeIds = new Set(graphNodeIds);
            expect(uniqueGraphNodeIds.size).toBe(graphNodeIds.length);
        });

        it("should generate consistent graphNodeIds for same orchestration step", () => {
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
            ];

            const result1 = parseTrace(logs);
            const result2 = parseTrace(logs);

            expect(result1.traceSteps[0].graphNodeId).toBe(result2.traceSteps[0].graphNodeId);
        });
    });

    describe("Visit Counts", () => {
        it("should track visit count for first visit in execution map", () => {
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
            ];

            const result = parseTrace(logs);
            const graphNodeId = result.traceSteps[0].graphNodeId;

            expect(result.executionMap[graphNodeId]?.visitCount).toBe(1);
        });

        it("should increment visit count for repeated steps in execution map", () => {
            const logs = [
                // First visit to step 2
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(2, [fixture.technicalProfiles.selfAsserted])),
                    ],
                    0
                ),
                // Second visit to step 2 (validation failure, retry)
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(2, [fixture.technicalProfiles.selfAsserted])),
                    ],
                    5000 // More than DEDUP_THRESHOLD_MS apart
                ),
            ];

            const result = parseTrace(logs);
            // Both visits should have the same graphNodeId
            const graphNodeId = result.traceSteps[0].graphNodeId;

            expect(result.executionMap[graphNodeId]?.visitCount).toBe(2);
        });

        it("should track multiple visits due to retry loops", () => {
            const logs = [
                ...Array.from({ length: 3 }, (_, i) =>
                    buildTraceLogInput(
                        fixture,
                        [
                            buildHeadersClip(fixture, "Event:SELFASSERTED"),
                            buildOrchestrationManagerAction(),
                            buildOrchestrationResult(2),
                            buildActionClip("TechnicalProfileActionHandler"),
                            buildActionResult(i === 2, undefined, buildClaimsStatebag("attempt", String(i + 1))), // Fail first 2, succeed on 3rd
                        ],
                        i * 5000 // Spread logs apart to avoid deduplication
                    )
                ),
            ];

            const result = parseTrace(logs);

            // Check visit count in executionMap for step 2
            const graphNodeId = result.traceSteps[0].graphNodeId;
            expect(result.executionMap[graphNodeId]?.visitCount).toBe(3);
        });
    });

    describe("State Transitions", () => {
        it("should track state transitions between steps", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildTransitionClip("Continue", "AwaitingNextStep"),
                    ],
                    0
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildTransitionClip("Continue", "AwaitingNextStep"),
                    ],
                    500
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].transitionEvent).toBe("Continue");
        });

        it("should detect fail transitions", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildActionClip("TechnicalProfileActionHandler"),
                        buildActionResult(false),
                        buildTransitionClip("Fail", "AwaitingInput"),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].transitionEvent).toBe("Fail");
        });
    });

    describe("Execution Path", () => {
        it("should build complete execution path", () => {
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
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                    ],
                    500
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(3),
                    ],
                    1000
                ),
            ];

            const result = parseTrace(logs);

            const executionPath = result.traceSteps.map((s) => s.stepOrder);
            expect(executionPath).toEqual([1, 2, 3]);
        });

        it("should handle non-linear execution paths", () => {
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
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(3), // Skip step 2
                    ],
                    500
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(5), // Skip step 4
                    ],
                    1000
                ),
            ];

            const result = parseTrace(logs);

            const executionPath = result.traceSteps.map((s) => s.stepOrder);
            expect(executionPath).toEqual([1, 3, 5]);
        });
    });

    describe("Step Duration", () => {
        it("should calculate duration between steps", () => {
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
                    5000 // 5 seconds later
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].duration).toBe(5000);
        });
    });
});
