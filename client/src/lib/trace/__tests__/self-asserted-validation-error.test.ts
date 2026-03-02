/**
 * Self-Asserted Validation Error Tests
 *
 * Tests that validation errors in self-asserted steps are properly detected.
 * This covers the case where a validation technical profile (e.g., login-NonInteractive)
 * fails and returns an exception in the SelfAssertedMessageValidationHandler.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import { getTestSteps } from "./test-step-helpers";
import type { TraceLogInput } from "@/types/trace";
import type { ClipsArray } from "@/types/journey-recorder";

describe("Self-Asserted Validation Errors", () => {
    const baseTimestamp = new Date("2025-01-01T10:00:00Z");

    /**
     * Creates a log input for testing.
     */
    function createLogInput(clips: ClipsArray, offsetMs = 0): TraceLogInput {
        return {
            id: `log-${offsetMs}`,
            timestamp: new Date(baseTimestamp.getTime() + offsetMs),
            clips,
        };
    }

    describe("Exception Detection in SelfAssertedMessageValidationHandler", () => {
        it("should detect error when Exception is in RecorderRecord.Values.Validation", () => {
            const logs: TraceLogInput[] = [
                createLogInput([
                    {
                        Kind: "Headers",
                        Content: {
                            UserJourneyRecorderEndpoint: "urn:journeyrecorder:applicationinsights",
                            CorrelationId: "test-correlation-id",
                            EventInstance: "Event:SELFASSERTED",
                            TenantId: "testtenant.onmicrosoft.com",
                            PolicyId: "B2C_1A_TEST_SignUpSignIn",
                        },
                    },
                    {
                        Kind: "Action",
                        Content: "Web.TPEngine.OrchestrationManager",
                    },
                    {
                        Kind: "HandlerResult",
                        Content: {
                            Result: true,
                            Statebag: {
                                ORCH_CS: { c: "2025-01-01T10:00:00Z", k: "ORCH_CS", v: "2", p: true },
                            },
                        },
                    },
                    {
                        Kind: "Predicate",
                        Content: "Web.TPEngine.StateMachineHandlers.SelfAssertedMessageValidationHandler",
                    },
                    {
                        Kind: "HandlerResult",
                        Content: {
                            Result: false,
                            PredicateResult: "False",
                            RecorderRecord: {
                                Values: [
                                    {
                                        Key: "Validation",
                                        Value: {
                                            Values: [
                                                { Key: "ProtocolProviderType", Value: "SelfAssertedAttributeProvider" },
                                                {
                                                    Key: "TechnicalProfileEnabled",
                                                    Value: {
                                                        EnabledRule: "Always",
                                                        EnabledResult: true,
                                                        TechnicalProfile: "login-NonInteractive",
                                                    },
                                                },
                                                {
                                                    Key: "ValidationTechnicalProfile",
                                                    Value: {
                                                        Values: [
                                                            { Key: "TechnicalProfileId", Value: "login-NonInteractive" },
                                                        ],
                                                    },
                                                },
                                                {
                                                    Key: "Exception",
                                                    Value: {
                                                        Kind: "Handled",
                                                        HResult: "80131500",
                                                        Message: "A user with the specified credential could not be found.",
                                                        Data: { IsPolicySpecificError: false },
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            },
                            Exception: {
                                Kind: "Handled",
                                HResult: "80131500",
                                Message: "A user with the specified credential could not be found.",
                            },
                        },
                    },
                    {
                        Kind: "Action",
                        Content: "Web.TPEngine.StateMachineHandlers.SendRetryHandler",
                    },
                    {
                        Kind: "HandlerResult",
                        Content: { Result: true },
                    },
                ]),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            // Should have a step with Error result
            const errorSteps = steps.filter((s) => s.result === "Error");
            expect(errorSteps.length).toBeGreaterThan(0);

            // The error message should contain the exception message
            const stepWithError = steps.find((s) => s.errorMessage);
            expect(stepWithError).toBeDefined();
            expect(stepWithError?.errorMessage).toContain("user with the specified credential could not be found");
        });

        it("should detect error when Exception is at top level of HandlerResult", () => {
            const logs: TraceLogInput[] = [
                createLogInput([
                    {
                        Kind: "Headers",
                        Content: {
                            UserJourneyRecorderEndpoint: "urn:journeyrecorder:applicationinsights",
                            CorrelationId: "test-correlation-id-2",
                            EventInstance: "Event:SELFASSERTED",
                            TenantId: "testtenant.onmicrosoft.com",
                            PolicyId: "B2C_1A_TEST_SignUpSignIn",
                        },
                    },
                    {
                        Kind: "Action",
                        Content: "Web.TPEngine.OrchestrationManager",
                    },
                    {
                        Kind: "HandlerResult",
                        Content: {
                            Result: true,
                            Statebag: {
                                ORCH_CS: { c: "2025-01-01T10:00:00Z", k: "ORCH_CS", v: "1", p: true },
                            },
                        },
                    },
                    {
                        Kind: "Predicate",
                        Content: "Web.TPEngine.StateMachineHandlers.SelfAssertedMessageValidationHandler",
                    },
                    {
                        Kind: "HandlerResult",
                        Content: {
                            Result: false,
                            PredicateResult: "False",
                            Exception: {
                                Kind: "Handled",
                                HResult: "80131500",
                                Message: "Invalid password format.",
                            },
                        },
                    },
                ]),
            ];

            const result = parseTrace(logs);

            const stepWithError = getTestSteps(result).find((s) => s.result === "Error");
            expect(stepWithError).toBeDefined();
            expect(stepWithError?.errorMessage).toContain("Invalid password format");
        });

        it("should NOT set error when validation succeeds (no Exception)", () => {
            const logs: TraceLogInput[] = [
                createLogInput([
                    {
                        Kind: "Headers",
                        Content: {
                            UserJourneyRecorderEndpoint: "urn:journeyrecorder:applicationinsights",
                            CorrelationId: "test-correlation-id-3",
                            EventInstance: "Event:SELFASSERTED",
                            TenantId: "testtenant.onmicrosoft.com",
                            PolicyId: "B2C_1A_TEST_SignUpSignIn",
                        },
                    },
                    {
                        Kind: "Action",
                        Content: "Web.TPEngine.OrchestrationManager",
                    },
                    {
                        Kind: "HandlerResult",
                        Content: {
                            Result: true,
                            Statebag: {
                                ORCH_CS: { c: "2025-01-01T10:00:00Z", k: "ORCH_CS", v: "1", p: true },
                            },
                        },
                    },
                    {
                        Kind: "Predicate",
                        Content: "Web.TPEngine.StateMachineHandlers.SelfAssertedMessageValidationHandler",
                    },
                    {
                        Kind: "HandlerResult",
                        Content: {
                            Result: true,
                            PredicateResult: "True",
                            RecorderRecord: {
                                Values: [
                                    {
                                        Key: "Validation",
                                        Value: {
                                            Values: [
                                                { Key: "ProtocolProviderType", Value: "SelfAssertedAttributeProvider" },
                                                {
                                                    Key: "ValidationTechnicalProfile",
                                                    Value: {
                                                        Values: [
                                                            { Key: "TechnicalProfileId", Value: "login-NonInteractive" },
                                                        ],
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            },
                        },
                    },
                    // Self-asserted action after successful validation
                    {
                        Kind: "Action",
                        Content: "Web.TPEngine.StateMachineHandlers.SelfAssertedAttributeProviderActionHandler",
                    },
                    {
                        Kind: "HandlerResult",
                        Content: { Result: true },
                    },
                ]),
            ];

            const result = parseTrace(logs);

            // Should not have any error steps
            const errorSteps = getTestSteps(result).filter((s) => s.result === "Error");
            expect(errorSteps).toHaveLength(0);
        });

        it("should capture validation technical profile when error occurs", () => {
            const logs: TraceLogInput[] = [
                createLogInput([
                    {
                        Kind: "Headers",
                        Content: {
                            UserJourneyRecorderEndpoint: "urn:journeyrecorder:applicationinsights",
                            CorrelationId: "test-correlation-id-4",
                            EventInstance: "Event:SELFASSERTED",
                            TenantId: "testtenant.onmicrosoft.com",
                            PolicyId: "B2C_1A_TEST_SignUpSignIn",
                        },
                    },
                    {
                        Kind: "Action",
                        Content: "Web.TPEngine.OrchestrationManager",
                    },
                    {
                        Kind: "HandlerResult",
                        Content: {
                            Result: true,
                            Statebag: {
                                ORCH_CS: { c: "2025-01-01T10:00:00Z", k: "ORCH_CS", v: "2", p: true },
                            },
                        },
                    },
                    {
                        Kind: "Predicate",
                        Content: "Web.TPEngine.StateMachineHandlers.SelfAssertedMessageValidationHandler",
                    },
                    {
                        Kind: "HandlerResult",
                        Content: {
                            Result: false,
                            PredicateResult: "False",
                            RecorderRecord: {
                                Values: [
                                    {
                                        Key: "Validation",
                                        Value: {
                                            Values: [
                                                {
                                                    Key: "ValidationTechnicalProfile",
                                                    Value: {
                                                        Values: [
                                                            { Key: "TechnicalProfileId", Value: "AAD-UserReadUsingSignInName" },
                                                        ],
                                                    },
                                                },
                                                {
                                                    Key: "Exception",
                                                    Value: {
                                                        Kind: "Handled",
                                                        Message: "User does not exist.",
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ]),
            ];

            const result = parseTrace(logs);

            // Should have an error step that includes the validation TP
            const errorStep = getTestSteps(result).find((s) => s.result === "Error");
            expect(errorStep).toBeDefined();
            expect(errorStep?.technicalProfileNames).toContain("AAD-UserReadUsingSignInName");
            expect(errorStep?.errorMessage).toContain("User does not exist");
        });
    });
});
