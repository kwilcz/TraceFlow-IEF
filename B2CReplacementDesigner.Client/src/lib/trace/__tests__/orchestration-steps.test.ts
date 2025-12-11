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

            expect(result.traceSteps.map((s) => s.stepOrder)).toEqual([1, 2, 3]);
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

            expect(result.traceSteps.map((s) => s.stepOrder)).toEqual([4, 13, 15, 19]);
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

            expect(result.traceSteps).toHaveLength(4);
            expect(result.traceSteps.map((s) => s.stepOrder)).toEqual([1, 6, 7, 8]);
        });
    });

    describe("Step Zero Handling", () => {
        it("should skip step 0 as it represents pre-journey initialization", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 0, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 1000),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps.map((s) => s.stepOrder)).toEqual([1]);
            expect(result.traceSteps).toHaveLength(1);
        });

        it("should handle multiple step 0 occurrences (journey restart)", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 0, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 1000),
                buildSimpleOrchestrationStep(fixture, 0, "Event:AUTH", 60000),
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 61000),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps.filter((s) => s.stepOrder === 1)).toHaveLength(2);
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

            expect(result.traceSteps[0].stepOrder).toBe(1);
            expect(result.traceSteps[1].stepOrder).toBe(4);
            expect(result.traceSteps[2].stepOrder).toBe(7);
        });
    });

    describe("Execution Map", () => {
        it("should populate execution map with correct node IDs", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 6, "Event:API", 1000),
            ];

            const result = parseTrace(logs);

            expect(result.executionMap[`${fixture.policyId}-Step1`]).toBeDefined();
            expect(result.executionMap[`${fixture.policyId}-Step6`]).toBeDefined();
        });

        it("should track visit count for each step", () => {
            const logs = [buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0)];

            const result = parseTrace(logs);

            expect(result.executionMap[`${fixture.policyId}-Step1`].visitCount).toBe(1);
        });

        it("should increment visit count when same step is visited multiple times", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 1, "Event:SELFASSERTED", 30000),
            ];

            const result = parseTrace(logs);

            expect(result.executionMap[`${fixture.policyId}-Step1`].visitCount).toBe(2);
        });

        it("should set status to Success for completed steps", () => {
            const logs = [buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0)];

            const result = parseTrace(logs);

            expect(result.executionMap[`${fixture.policyId}-Step1`].status).toBe("Success");
        });
    });
});
