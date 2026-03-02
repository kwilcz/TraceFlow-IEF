/**
 * Orchestration Step Tracking Tests
 *
 * Tests the parser's ability to track ORCH_CS (orchestration current step)
 * progression through a B2C user journey.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import {
    createTestFixture,
    buildSimpleOrchestrationStep,
    type TestFixture,
} from "./fixtures";
import { getTestSteps } from "./test-step-helpers";

describe("Orchestration Step Tracking", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("Step Progression", () => {
        it("should track sequential step progression", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 2, "Event:API", 1000),
                buildSimpleOrchestrationStep(fixture, 3, "Event:API", 2000),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps.map((s) => s.orchestrationStep)).toEqual([1, 2, 3]);
            expect(result.success).toBe(true);
        });

        it("should handle non-sequential step jumps due to preconditions", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 4, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 13, "Event:API", 1000),
                buildSimpleOrchestrationStep(fixture, 15, "Event:API", 2000),
                buildSimpleOrchestrationStep(fixture, 19, "Event:API", 3000),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps.map((s) => s.orchestrationStep)).toEqual([4, 13, 15, 19]);
            expect(result.success).toBe(true);
        });

        it("should track steps across multiple log segments", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 6, "Event:API", 60000),
                buildSimpleOrchestrationStep(fixture, 7, "Event:API", 120000),
                buildSimpleOrchestrationStep(fixture, 8, "Event:API", 180000),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps).toHaveLength(4);
            expect(steps.map((s) => s.orchestrationStep)).toEqual([1, 6, 7, 8]);
        });
    });

    describe("Step Zero Handling", () => {
        it("should skip step 0 as it represents pre-journey initialization", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 0, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 1000),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps.map((s) => s.orchestrationStep)).toEqual([1]);
            expect(steps).toHaveLength(1);
        });

        it("should handle multiple step 0 occurrences (journey restart)", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 0, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 1000),
                buildSimpleOrchestrationStep(fixture, 0, "Event:AUTH", 60000),
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 61000),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps.filter((s) => s.orchestrationStep === 1)).toHaveLength(2);
        });
    });

    describe("Timestamp Ordering", () => {
        it("should sort steps by timestamp when logs arrive out of order", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 7, "Event:API", 120000),
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 4, "Event:API", 60000),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps[0].orchestrationStep).toBe(1);
            expect(steps[1].orchestrationStep).toBe(4);
            expect(steps[2].orchestrationStep).toBe(7);
        });
    });

    describe("Execution Map", () => {
        it("should populate execution map with correct node IDs", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 6, "Event:API", 1000),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(result.executionMap[steps[0].graphNodeId]).toBeDefined();
            expect(result.executionMap[steps[1].graphNodeId]).toBeDefined();
        });

        it("should track visit count for each step", () => {
            const logs = [buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0)];

            const result = parseTrace(logs);
            const graphNodeId = getTestSteps(result)[0].graphNodeId;

            expect(result.executionMap[graphNodeId].visitCount).toBe(1);
        });

        it("should increment visit count when same step is visited multiple times", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 1, "Event:SELFASSERTED", 30000),
            ];

            const result = parseTrace(logs);
            const graphNodeId = getTestSteps(result)[0].graphNodeId;

            expect(result.executionMap[graphNodeId].visitCount).toBe(2);
        });

        it("should set status to Success for completed steps", () => {
            const logs = [buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0)];

            const result = parseTrace(logs);
            const graphNodeId = getTestSteps(result)[0].graphNodeId;

            expect(result.executionMap[graphNodeId].status).toBe("Success");
        });
    });
});
