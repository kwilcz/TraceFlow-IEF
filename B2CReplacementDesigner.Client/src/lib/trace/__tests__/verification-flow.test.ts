/**
 * Verification Flow Tests
 *
 * Tests the parser's ability to handle email/OTP verification flows
 * including C2CVER patterns and ProcessVerificationRequestHandler.
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
    buildVerificationRecorderRecord,
    buildEnabledForUserJourneysRecord,
    buildClaimsStatebag,
    buildComplexClaimsStatebag,
    type TestFixture,
} from "./fixtures";

describe("Verification Flow", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("C2CVER Event Detection", () => {
        it.skip("should detect C2CVER event type", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:C2CVER"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        buildActionClip("ProcessVerificationRequestHandler"),
                        buildActionResult(true, buildVerificationRecorderRecord(fixture.technicalProfiles.emailVerification)),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].eventType).toBe("C2CVER");
        });

        it.skip("should identify verification technical profile from C2CVER", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:C2CVER"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        buildActionClip("ProcessVerificationRequestHandler"),
                        buildActionResult(true, buildVerificationRecorderRecord(fixture.technicalProfiles.emailVerification)),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].technicalProfiles).toContain(fixture.technicalProfiles.emailVerification);
        });
    });

    describe("ProcessVerificationRequestHandler", () => {
        it.skip("should handle ProcessVerificationRequestHandler for OTP", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:C2CVER"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        buildActionClip("ProcessVerificationRequestHandler"),
                        buildActionResult(true, buildVerificationRecorderRecord(fixture.technicalProfiles.displayControl)),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].isVerificationStep).toBe(true);
        });

        it.skip("should extract verification control ID", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:C2CVER"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        buildActionClip("ProcessVerificationRequestHandler"),
                        buildActionResult(true, buildVerificationRecorderRecord(fixture.technicalProfiles.displayControl, "emailVerificationControl")),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].hasVerificationContext).toBe(true);
        });
    });

    describe("Verification Success/Failure", () => {
        it.skip("should detect successful verification", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:C2CVER"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        buildActionClip("ProcessVerificationRequestHandler"),
                        buildActionResult(true, buildVerificationRecorderRecord(fixture.technicalProfiles.emailVerification)),
                        buildTransitionClip("Continue", "AwaitingNextStep"),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].interactionResult?.success).toBe(true);
        });

        it.skip("should detect failed verification attempt", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:C2CVER"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        buildActionClip("ProcessVerificationRequestHandler"),
                        buildActionResult(false, buildVerificationRecorderRecord(fixture.technicalProfiles.emailVerification)),
                        buildTransitionClip("Fail", "AwaitingInput"),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].interactionResult?.success).toBe(false);
        });
    });

    describe("Email Verification with Claims", () => {
        it.skip("should extract email claim during verification", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:C2CVER"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        buildActionClip("ProcessVerificationRequestHandler"),
                        buildActionResult(true, buildVerificationRecorderRecord(fixture.technicalProfiles.emailVerification), buildClaimsStatebag("email", fixture.userEmail)),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].claims).toHaveProperty("email", fixture.userEmail);
        });

        it.skip("should track readOnly verification from email", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:C2CVER"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        buildActionClip("ProcessVerificationRequestHandler"),
                        buildActionResult(true, buildVerificationRecorderRecord(fixture.technicalProfiles.emailVerification), buildComplexClaimsStatebag({
                            readOnlyEmail: fixture.userEmail,
                            email: fixture.userEmail,
                        })),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].claims).toHaveProperty("readOnlyEmail");
        });
    });

    describe("Display Control Verification", () => {
        it.skip("should link verification to display control", () => {
            const controlId = `displayControl_${fixture.randomSuffix}`;
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:C2CVER"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        buildActionClip("ProcessVerificationRequestHandler"),
                        buildActionResult(true, buildVerificationRecorderRecord(fixture.technicalProfiles.displayControl, controlId)),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].technicalProfiles).toContain(fixture.technicalProfiles.displayControl);
        });
    });
});
