/**
 * Error Handling Tests
 *
 * Tests the parser's ability to detect and report errors
 * from B2C journey execution.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import {
    createTestFixture,
    buildTraceLogInput,
    buildHeadersClip,
    buildOrchestrationManagerAction,
    buildOrchestrationResult,
    buildErrorResult,
    buildCtpStatebag,
    type TestFixture,
} from "./fixtures";
import { getTestSteps, getStepCount } from "./test-step-helpers";

describe("Error Handling", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("Error Detection", () => {
        it("should capture error message from Exception in HandlerResult", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildOrchestrationManagerAction(),
                        buildErrorResult("The required claim was not provided."),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps[0].result).toBe("Error");
            expect(steps[0].errorMessage).toContain("required claim");
        });

        it("should set step result to Error when exception occurs", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(5),
                        buildOrchestrationManagerAction(),
                        buildErrorResult("User not found in directory."),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps[0].result).toBe("Error");
        });

        it("should preserve full error message text", () => {
            const errorMessage = "Validation failed: The password does not meet complexity requirements. Minimum 8 characters required.";

            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildOrchestrationManagerAction(),
                        buildErrorResult(errorMessage),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps[0].errorMessage).toBe(errorMessage);
        });
    });

    describe("Error with Technical Profile Context", () => {
        it("should associate error with the executing technical profile", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2, buildCtpStatebag(fixture.technicalProfiles.localAccountPasswordReset, 2)),
                        buildOrchestrationManagerAction(),
                        buildErrorResult("Password complexity requirements not met."),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps[0].result).toBe("Error");
            expect(steps[0].technicalProfileNames).toContain(fixture.technicalProfiles.localAccountPasswordReset);
        });
    });

    describe("Execution Map Error Status", () => {
        it("should set execution map status to Error for failed steps", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildOrchestrationManagerAction(),
                        buildErrorResult("Authentication failed."),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);
            const graphNodeId = getTestSteps(result)[0].graphNodeId;

            expect(result.executionMap[graphNodeId].status).toBe("Error");
        });
    });

    describe("Multiple Errors in Journey", () => {
        it("should track errors across multiple steps", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildOrchestrationManagerAction(),
                        buildErrorResult("First validation error."),
                    ],
                    0
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildOrchestrationManagerAction(),
                        buildErrorResult("Second validation error."),
                    ],
                    30000
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            const errorSteps = steps.filter((s) => s.result === "Error");
            expect(errorSteps).toHaveLength(2);
        });
    });

    describe("Error Recovery", () => {
        it("should track successful retry after error", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildOrchestrationManagerAction(),
                        buildErrorResult("Invalid credentials."),
                    ],
                    0
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    30000
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(6),
                    ],
                    60000
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps[0].result).toBe("Error");
            expect(steps[1].result).toBe("Success");
            expect(steps[2].result).toBe("Success");
        });
    });
});
