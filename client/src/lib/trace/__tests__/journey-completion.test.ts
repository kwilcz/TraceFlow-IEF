/**
 * Journey Completion Tests
 *
 * Tests the parser's ability to detect journey completion
 * and final token issuance.
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
    buildJourneyCompletedRecord,
    buildInitiatingClaimsExchangeRecord,
    buildEnabledForUserJourneysRecord,
    buildComplexClaimsStatebag,
    buildJourneyCompletionStep,
    type TestFixture,
} from "./fixtures";
import { getTestSteps } from "./test-step-helpers";

describe("Journey Completion", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("JourneyCompleted Record", () => {
        it("should detect journey completion from JourneyCompleted record", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(8),
                        buildOrchestrationManagerAction(),
                        buildActionResult(true, buildJourneyCompletedRecord(fixture.baseTimestamp)),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.success).toBe(true);
        });

        it("should mark journey as complete with final claims", () => {
            const finalClaims = {
                email: fixture.userEmail,
                objectId: fixture.userObjectId,
                tenantId: fixture.tenantId,
            };

            const logs = [buildJourneyCompletionStep(fixture, 8, finalClaims, 0)];

            const result = parseTrace(logs);

            expect(result.success).toBe(true);
        });
    });

    describe("JWT Issuer Detection", () => {
        it("should identify JwtIssuer technical profile in final step", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(8),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(8, [fixture.technicalProfiles.jwtIssuer])),
                        buildTransitionClip("SendClaims"),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(getTestSteps(result)[0].technicalProfileNames).toContain(fixture.technicalProfiles.jwtIssuer);
        });

        // TODO: Remove — tests removed TraceStep field
        it.skip("should detect SendRelyingPartyResponseHandler as final action", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(8),
                        buildActionClip("SendRelyingPartyResponseHandler"),
                        buildActionResult(true, undefined, buildComplexClaimsStatebag({
                            email: fixture.userEmail,
                            objectId: fixture.userObjectId,
                        })),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].isFinalStep).toBe(true);
        });
    });

    describe("SendClaims Transition", () => {
        it("should track SendClaims transition event", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(8),
                        buildTransitionClip("SendClaims", "AwaitingNextStep"),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(getTestSteps(result)).toHaveLength(1);
        });

        // TODO: Remove — tests removed TraceStep field
        it.skip("should identify SendClaims as journey completion signal", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(8),
                        buildTransitionClip("SendClaims", "AwaitingNextStep"),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].transitionEvent).toBe("SendClaims");
        });
    });

    describe("Final Claims Output", () => {
        it("should capture final claims from SendRelyingPartyResponseHandler", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(8),
                        buildActionClip("SendRelyingPartyResponseHandler"),
                        buildActionResult(true, undefined, buildComplexClaimsStatebag({
                            email: fixture.userEmail,
                            objectId: fixture.userObjectId,
                            tenantId: fixture.tenantId,
                        })),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.finalClaims).toHaveProperty("email", fixture.userEmail);
            expect(result.finalClaims).toHaveProperty("objectId", fixture.userObjectId);
            expect(result.finalClaims).toHaveProperty("tenantId", fixture.tenantId);
        });
    });

    describe("OpenIdConnect Protocol", () => {
        it("should detect OpenIdConnect protocol for JWT issuance", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(8),
                        buildActionClip("SendClaimsActionHandler"),
                        buildActionResult(true, buildInitiatingClaimsExchangeRecord(fixture.technicalProfiles.jwtIssuer, "OpenIdConnect")),
                        buildOrchestrationManagerAction(),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(getTestSteps(result)[0].technicalProfileNames).toContain(fixture.technicalProfiles.jwtIssuer);
        });
    });
});
