/**
 * Event Type Handling Tests
 *
 * Tests the parser's ability to correctly identify and handle
 * different B2C event types (AUTH, API, SELFASSERTED, ClaimsExchange).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import {
    createTestFixture,
    buildSimpleOrchestrationStep,
    buildTraceLogInput,
    buildHeadersClip,
    buildOrchestrationManagerAction,
    buildOrchestrationResult,
    type TestFixture,
} from "./fixtures";

describe("Event Type Handling", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("AUTH Events", () => {
        it("should correctly identify AUTH events", () => {
            const logs = [buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0)];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].eventType).toBe("AUTH");
        });

        it("should handle AUTH events at journey start", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 2, "Event:API", 1000),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].eventType).toBe("AUTH");
            expect(result.traceSteps[1].eventType).toBe("API");
        });
    });

    describe("API Events", () => {
        it("should correctly identify API events", () => {
            const logs = [buildSimpleOrchestrationStep(fixture, 6, "Event:API", 0)];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].eventType).toBe("API");
        });

        it("should handle multiple consecutive API events", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 5, "Event:API", 0),
                buildSimpleOrchestrationStep(fixture, 6, "Event:API", 1000),
                buildSimpleOrchestrationStep(fixture, 7, "Event:API", 2000),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps.every((s) => s.eventType === "API")).toBe(true);
        });
    });

    describe("SELFASSERTED Events", () => {
        it("should correctly identify SELFASSERTED events", () => {
            const logs = [buildSimpleOrchestrationStep(fixture, 1, "Event:SELFASSERTED", 0)];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].eventType).toBe("SELFASSERTED");
        });

        it("should handle SELFASSERTED events for form submissions", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 1, "Event:SELFASSERTED", 30000),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[1].eventType).toBe("SELFASSERTED");
        });
    });

    describe("ClaimsExchange Events", () => {
        it("should correctly identify ClaimsExchange events", () => {
            const logs = [buildSimpleOrchestrationStep(fixture, 4, "Event:ClaimsExchange", 0)];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].eventType).toBe("ClaimsExchange");
        });

        it("should handle ClaimsExchange events for federated authentication", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 4, "Event:ClaimsExchange", 30000),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[1].eventType).toBe("ClaimsExchange");
        });
    });

    describe("Mixed Event Sequences", () => {
        it("should handle typical sign-in flow event sequence", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 1, "Event:SELFASSERTED", 30000),
                buildSimpleOrchestrationStep(fixture, 6, "Event:API", 60000),
                buildSimpleOrchestrationStep(fixture, 7, "Event:API", 90000),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps.map((s) => s.eventType)).toEqual([
                "AUTH",
                "SELFASSERTED",
                "API",
                "API",
            ]);
        });

        it("should handle federated sign-in flow event sequence", () => {
            const logs = [
                buildSimpleOrchestrationStep(fixture, 1, "Event:AUTH", 0),
                buildSimpleOrchestrationStep(fixture, 4, "Event:ClaimsExchange", 60000),
                buildSimpleOrchestrationStep(fixture, 6, "Event:API", 90000),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps.map((s) => s.eventType)).toEqual([
                "AUTH",
                "ClaimsExchange",
                "API",
            ]);
        });
    });
});
