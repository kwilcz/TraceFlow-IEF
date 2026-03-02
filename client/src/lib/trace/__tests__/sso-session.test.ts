/**
 * SSO Session Tests
 *
 * Tests the parser's ability to detect and track SSO session
 * participation and activation patterns.
 *
 * Based on real B2C AppInsights log patterns:
 * - IsSSOSessionParticipantHandler: Predicate that checks if TP participates in SSO
 * - SSOSessionHandler: Action that handles SSO session reading
 * - ActivateSSOSessionHandler: Action that activates SSO session after successful auth
 * - ResetSSOSessionHandler: Action that resets SSO session
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import { getTestSteps } from "./test-step-helpers";
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
    buildEnabledForUserJourneysRecord,
    type TestFixture,
} from "./fixtures";

describe("SSO Session", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("SSO Session Participation", () => {
        // TODO: Remove — tests removed SSO field (ssoSessionParticipant not in FlowNode model)
        it.skip("should detect SSO session participant flag when True", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildPredicateClip("IsSSOSessionParticipantHandler", "Web.TPEngine.SSO"),
                        buildPredicateResult(true, undefined, "True"),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].ssoSessionParticipant).toBe(true);
        });

        // TODO: Remove — tests removed SSO field (ssoSessionParticipant not in FlowNode model)
        it.skip("should detect non-SSO steps when PredicateResult is False", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(3),
                        buildPredicateClip("IsSSOSessionParticipantHandler", "Web.TPEngine.SSO"),
                        buildPredicateResult(false), // false = PredicateResult: "False"
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].ssoSessionParticipant).toBe(false);
        });
    });

    describe("SSO Session Activation", () => {
        // TODO: Remove — tests removed SSO field (ssoSessionActivated not in FlowNode model)
        it.skip("should detect when SSO session is activated", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildActionClip("ActivateSSOSessionHandler", "Web.TPEngine.SSO"),
                        buildActionResult(true),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].ssoSessionActivated).toBe(true);
        });

        // TODO: Remove — tests removed SSO field (ssoSessionActivated not in FlowNode model)
        it.skip("should not mark SSO as activated when SSOSessionHandler runs (reading session)", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildActionClip("SSOSessionHandler", "Web.TPEngine.SSO"),
                        buildActionResult(true),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            // SSOSessionHandler reads session, doesn't activate
            expect(result.traceSteps[0].ssoSessionActivated).toBeUndefined();
        });
    });

    describe("SSO Skip Detection", () => {
        it.skip("should detect when step is skipped due to SSO", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(false, {
                            _type_: "SkipReason",
                            Reason: "SSOSessionValid",
                            SessionProvider: fixture.technicalProfiles.ssoSession,
                        }),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            // Step should be marked as skipped or not invoked
            expect(result.traceSteps[0].skipped).toBe(true);
            expect(result.traceSteps[0].skipReason).toBe("SSOSessionValid");
        });

        it.skip("should show claims restored from SSO session", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildActionClip("SSOSessionHandler", "Web.TPEngine.SSO"),
                        buildActionResult(true, {
                            _type_: "SSOSessionInfo",
                            SessionActivated: true,
                            RestoredClaims: ["email", "displayName", "objectId"],
                        }),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].claims).toHaveProperty("email");
        });
    });

    describe("SSO Reset", () => {
        // TODO: Remove — tests removed SSO field (ssoSessionActivated not in FlowNode model)
        it.skip("should detect when SSO session is reset", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildActionClip("ResetSSOSessionHandler", "Web.TPEngine.SSO"),
                        buildActionResult(true),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            // Reset handler indicates SSO session was cleared
            expect(result.traceSteps[0].ssoSessionActivated).toBeUndefined();
        });
    });

    describe("Multi-Tenant SSO", () => {
        it.skip("should track SSO across tenant boundaries", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildActionClip("SSOSessionHandler", "Web.TPEngine.SSO"),
                        buildActionResult(true, {
                            _type_: "SSOSessionInfo",
                            SessionActivated: true,
                            SessionProvider: fixture.technicalProfiles.ssoSession,
                            TenantId: fixture.tenantId,
                            CrossTenant: false,
                        }),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].ssoSessionActivated).toBe(true);
        });
    });

    describe("SSO Session Claims Exchange", () => {
        // TODO: Remove — tests removed SSO fields (ssoSessionParticipant not in FlowNode model)
        it.skip("should track SSO session participation and claims exchange together", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildPredicateClip("IsSSOSessionParticipantHandler", "Web.TPEngine.SSO"),
                        buildPredicateResult(true, undefined, "True"),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(1, [fixture.technicalProfiles.ssoSession])),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].ssoSessionParticipant).toBe(true);
            expect(result.traceSteps[0].technicalProfiles).toContain(fixture.technicalProfiles.ssoSession);
        });
    });
});
