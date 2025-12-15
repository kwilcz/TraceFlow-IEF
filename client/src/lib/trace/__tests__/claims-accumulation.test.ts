/**
 * Claims Accumulation Tests
 *
 * Tests the parser's ability to track claims as they accumulate
 * throughout the B2C journey execution.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import {
    createTestFixture,
    buildTraceLogInput,
    buildHeadersClip,
    buildOrchestrationManagerAction,
    buildOrchestrationResult,
    buildComplexClaimsStatebag,
    type TestFixture,
} from "./fixtures";

describe("Claims Accumulation", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("Claims Progression", () => {
        it("should track claims as they accumulate across steps", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1, buildComplexClaimsStatebag({
                            signInName: fixture.userEmail,
                        })),
                    ],
                    0
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(6, buildComplexClaimsStatebag({
                            signInName: fixture.userEmail,
                            objectId: fixture.userObjectId,
                        })),
                    ],
                    1000
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(7, buildComplexClaimsStatebag({
                            signInName: fixture.userEmail,
                            objectId: fixture.userObjectId,
                            displayName: "Test User",
                        })),
                    ],
                    2000
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].claimsSnapshot).toHaveProperty("signInName");
            expect(result.traceSteps[0].claimsSnapshot).not.toHaveProperty("objectId");

            expect(result.traceSteps[1].claimsSnapshot).toHaveProperty("signInName");
            expect(result.traceSteps[1].claimsSnapshot).toHaveProperty("objectId");

            expect(result.traceSteps[2].claimsSnapshot).toHaveProperty("displayName");
        });

        it("should provide final claims state after journey completion", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1, buildComplexClaimsStatebag({
                            email: fixture.userEmail,
                        })),
                    ],
                    0
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(8, buildComplexClaimsStatebag({
                            email: fixture.userEmail,
                            objectId: fixture.userObjectId,
                            displayName: "Test User",
                            authenticationSource: "localAccountAuthentication",
                        })),
                    ],
                    1000
                ),
            ];

            const result = parseTrace(logs);

            expect(result.finalClaims).toHaveProperty("email", fixture.userEmail);
            expect(result.finalClaims).toHaveProperty("objectId", fixture.userObjectId);
            expect(result.finalClaims).toHaveProperty("displayName", "Test User");
            expect(result.finalClaims).toHaveProperty("authenticationSource", "localAccountAuthentication");
        });
    });

    describe("Claims Snapshot per Step", () => {
        it("should preserve independent claim snapshots for each step", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1, buildComplexClaimsStatebag({ claim1: "value1" })),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2, buildComplexClaimsStatebag({ claim1: "value1", claim2: "value2" })),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].claimsSnapshot).toEqual({ claim1: "value1" });
            expect(result.traceSteps[1].claimsSnapshot).toEqual({ claim1: "value1", claim2: "value2" });
        });

        it("should handle claim value changes between steps", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1, buildComplexClaimsStatebag({ status: "pending" })),
                    ],
                    0
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2, buildComplexClaimsStatebag({ status: "verified" })),
                    ],
                    1000
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].claimsSnapshot.status).toBe("pending");
            expect(result.traceSteps[1].claimsSnapshot.status).toBe("verified");
        });
    });

    describe("Final Statebag", () => {
        it("should provide final statebag state after journey", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1, buildComplexClaimsStatebag({
                            isNewSession: "True",
                        })),
                    ],
                    0
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(8, buildComplexClaimsStatebag({
                            isNewSession: "True",
                            email: fixture.userEmail,
                            tenantId: fixture.tenantId,
                        })),
                    ],
                    1000
                ),
            ];

            const result = parseTrace(logs);

            // Claims are in finalClaims, not finalStatebag
            expect(result.finalClaims).toHaveProperty("isNewSession", "True");
            expect(result.finalClaims).toHaveProperty("email", fixture.userEmail);
            expect(result.finalClaims).toHaveProperty("tenantId", fixture.tenantId);
            
            // Final statebag contains orchestration state
            expect(result.finalStatebag).toHaveProperty("ORCH_CS", "8");
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty claims gracefully", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1, buildComplexClaimsStatebag({})),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].claimsSnapshot).toEqual({});
        });

        it("should handle claims with special characters in values", () => {
            const testEmailWithPlus = `user+test-${fixture.randomSuffix}@test-domain.example`;
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1, buildComplexClaimsStatebag({
                            email: testEmailWithPlus,
                            displayName: "Test User, Sample",
                        })),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].claimsSnapshot.email).toBe(testEmailWithPlus);
            expect(result.traceSteps[0].claimsSnapshot.displayName).toBe("Test User, Sample");
        });
    });
});
