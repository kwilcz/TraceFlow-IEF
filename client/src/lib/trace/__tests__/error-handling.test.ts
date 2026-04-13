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
    buildActionClip,
    buildActionResult,
    buildOrchestrationManagerAction,
    buildOrchestrationResult,
    buildErrorResult,
    buildCtpStatebag,
    buildPredicateClip,
    buildPredicateResult,
    buildTransitionClip,
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

        it("should surface FatalException clips as flow-level errors even without a step context", () => {
            const errorMessage = "Cross-origin fatal exception";
            const hResult = "80131500";

            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        {
                            Kind: "FatalException",
                            Content: {
                                Exception: {
                                    Message: errorMessage,
                                    HResult: hResult,
                                    Data: { TechnicalProfileId: "TP-Fatal" },
                                },
                                Time: fixture.baseTimestamp.toISOString(),
                            },
                        },
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(getStepCount(result)).toBe(0);
            expect(result.globalError).toMatchObject({
                errorType: "FatalException",
                message: errorMessage,
                hResult,
                data: { TechnicalProfileId: "TP-Fatal" },
            });
        });

        it("should retain FatalException details on the active step when a step is in progress", () => {
            const errorMessage = "Validation pipeline aborted.";
            const hResult = "80004005";

            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        {
                            Kind: "FatalException",
                            Content: {
                                Exception: {
                                    Message: errorMessage,
                                    HResult: hResult,
                                },
                                Time: fixture.baseTimestamp.toISOString(),
                            },
                        },
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps).toHaveLength(1);
            expect(steps[0].result).toBe("Error");
            expect(steps[0].errorMessage).toBe(errorMessage);
            expect(steps[0].errorHResult).toBe(hResult);
            expect(result.globalError).toMatchObject({
                errorType: "FatalException",
                message: errorMessage,
                hResult,
            });
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

    describe("Global Exception Transitions", () => {
        it("should surface ClaimsExchange exception transitions as flow-level errors", () => {
            const errorMessage =
                "An error was encountered while applying output claims transformations on technical profile with ID 'HRD-ValidateDomainWithLoginHint'";

            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildActionClip("OutputClaimsTransformationHandler"),
                        buildActionResult(true),
                        {
                            Kind: "Transition",
                            Content: {
                                EventName: "ClaimsExchange",
                                StateName: "Microsoft.Cpim.Data.Transformations.ClaimsTransformationException",
                            },
                        },
                        buildPredicateClip("NoOpHandler"),
                        buildPredicateResult(true),
                        buildActionClip("SendErrorHandler"),
                        buildActionResult(
                            true,
                            {
                                Values: [
                                    {
                                        Key: "SendErrorTechnicalProfile",
                                        Value: "OpenIdConnectProtocolProvider",
                                    },
                                    {
                                        Key: "Exception",
                                        Value: {
                                            Kind: "Handled",
                                            HResult: "80131500",
                                            Message: errorMessage,
                                            Data: { IsPolicySpecificError: false },
                                        },
                                    },
                                ],
                            },
                            {
                                SE: {
                                    c: fixture.baseTimestamp.toISOString(),
                                    k: "SE",
                                    v: "",
                                    p: true,
                                },
                            },
                        ),
                        buildActionClip("TransactionEndHandler"),
                        buildActionResult(true),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps).toHaveLength(1);
            expect(steps[0].result).toBe("Error");
            expect(steps[0].errorMessage).toContain("was encountered");
            expect(result.globalError).toMatchObject({
                errorType: "ClaimsTransformationException",
                stateName: "Microsoft.Cpim.Data.Transformations.ClaimsTransformationException",
                message: errorMessage,
                hResult: "80131500",
                data: { IsPolicySpecificError: false },
            });
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

    describe("Nested Exception in Global PolicyException Flow", () => {
        const GENERIC_MESSAGE =
            "An error occurred while processing the request. Please contact administrator of the site you are trying to access.";
        const NESTED_MESSAGE =
            'A claim could not be found for lookup claim with id "alternativeSecurityId" defined in technical profile with id "AAD-UserReadUsingAlternativeSecurityId-NoError" policy "B2C_1A_DEV" of tenant "B2CTEST.onmicrosoft.com".';
        const INNER_MESSAGE = "Claim with id 'alternativeSecurityId' was not found in the collection.";
        const INNERMOST_MESSAGE = "The given key was not present in the dictionary.";

        function buildGlobalPolicyExceptionLogs(f: TestFixture) {
            return [
                buildTraceLogInput(
                    f,
                    [
                        buildHeadersClip(f, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(3),
                        buildActionClip("ClaimsExchangeActionHandler"),
                        buildActionResult(
                            true,
                            {
                                Values: [
                                    {
                                        Key: "InitiatingClaimsExchange",
                                        Value: {
                                            TechnicalProfileId:
                                                "AAD-UserReadUsingAlternativeSecurityId-NoError",
                                            ProtocolType: "backend protocol",
                                            TargetEntity: "LocalAccountSigninEmailExchange",
                                            ProtocolProviderType: "AzureActiveDirectoryProvider",
                                        },
                                    },
                                ],
                            },
                            {
                                MACHSTATE: {
                                    c: f.baseTimestamp.toISOString(),
                                    k: "MACHSTATE",
                                    v: "Microsoft.Cpim.Common.PolicyException",
                                    p: true,
                                },
                            }
                        ),
                        buildTransitionClip("Global", "Microsoft.Cpim.Common.PolicyException"),
                        buildPredicateClip("NoOpHandler"),
                        buildPredicateResult(true),
                        buildActionClip("WarningExceptionTraceHandler"),
                        buildActionResult(true),
                        buildActionClip("SSO.SSOSessionEndHandler", "Web.TPEngine"),
                        buildActionResult(true),
                        buildActionClip("SendErrorHandler"),
                        buildActionResult(
                            true,
                            {
                                Values: [
                                    {
                                        Key: "SendErrorTechnicalProfile",
                                        Value: "OpenIdConnectProtocolProvider",
                                    },
                                    {
                                        Key: "Exception",
                                        Value: {
                                            Kind: "Handled",
                                            HResult: "80131500",
                                            Message: GENERIC_MESSAGE,
                                            Data: { IsPolicySpecificError: true },
                                            Exception: {
                                                Kind: "Handled",
                                                HResult: "80131500",
                                                Message: NESTED_MESSAGE,
                                                Data: {
                                                    IsPolicySpecificError: true,
                                                    TenantId: "B2CTEST.onmicrosoft.com",
                                                    PolicyId: "B2C_1A_DEV",
                                                    "technicalProfile.Id":
                                                        "AAD-UserReadUsingAlternativeSecurityId-NoError",
                                                },
                                            },
                                        },
                                    },
                                ],
                            },
                            {
                                SE: {
                                    c: f.baseTimestamp.toISOString(),
                                    k: "SE",
                                    v: "",
                                    p: true,
                                },
                            }
                        ),
                    ],
                    0
                ),
            ];
        }

        /** 4-level deep exception matching the original issue sample log. */
        function buildDeepNestedExceptionLogs(f: TestFixture) {
            return [
                buildTraceLogInput(
                    f,
                    [
                        buildHeadersClip(f, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(3),
                        buildActionClip("ClaimsExchangeActionHandler"),
                        buildActionResult(
                            true,
                            {
                                Values: [
                                    {
                                        Key: "InitiatingClaimsExchange",
                                        Value: {
                                            TechnicalProfileId:
                                                "AAD-UserReadUsingAlternativeSecurityId-NoError",
                                            ProtocolType: "backend protocol",
                                            TargetEntity: "LocalAccountSigninEmailExchange",
                                            ProtocolProviderType: "AzureActiveDirectoryProvider",
                                        },
                                    },
                                ],
                            },
                            {
                                MACHSTATE: {
                                    c: f.baseTimestamp.toISOString(),
                                    k: "MACHSTATE",
                                    v: "Microsoft.Cpim.Common.PolicyException",
                                    p: true,
                                },
                            }
                        ),
                        buildTransitionClip("Global", "Microsoft.Cpim.Common.PolicyException"),
                        buildPredicateClip("NoOpHandler"),
                        buildPredicateResult(true),
                        buildActionClip("WarningExceptionTraceHandler"),
                        buildActionResult(true),
                        buildActionClip("SSO.SSOSessionEndHandler", "Web.TPEngine"),
                        buildActionResult(true),
                        buildActionClip("SendErrorHandler"),
                        buildActionResult(
                            true,
                            {
                                Values: [
                                    {
                                        Key: "SendErrorTechnicalProfile",
                                        Value: "OpenIdConnectProtocolProvider",
                                    },
                                    {
                                        Key: "Exception",
                                        Value: {
                                            Kind: "Handled",
                                            HResult: "80131500",
                                            Message: GENERIC_MESSAGE,
                                            Data: { IsPolicySpecificError: true },
                                            Exception: {
                                                Kind: "Handled",
                                                HResult: "80131500",
                                                Message: NESTED_MESSAGE,
                                                Data: {
                                                    IsPolicySpecificError: true,
                                                    TenantId: "B2CTEST.onmicrosoft.com",
                                                    PolicyId: "B2C_1A_DEV",
                                                    "technicalProfile.Id":
                                                        "AAD-UserReadUsingAlternativeSecurityId-NoError",
                                                },
                                                Exception: {
                                                    Kind: "Handled",
                                                    HResult: "80131577",
                                                    Message: INNER_MESSAGE,
                                                    Data: {
                                                        "identifierClaimMapping.PolicyClaimType.Id":
                                                            "alternativeSecurityId",
                                                    },
                                                    Exception: {
                                                        Kind: "Handled",
                                                        HResult: "80131577",
                                                        Message: INNERMOST_MESSAGE,
                                                        Data: {},
                                                    },
                                                },
                                            },
                                        },
                                    },
                                ],
                            },
                            {
                                SE: {
                                    c: f.baseTimestamp.toISOString(),
                                    k: "SE",
                                    v: "",
                                    p: true,
                                },
                            }
                        ),
                    ],
                    0
                ),
            ];
        }

        it("should use the nested message as the primary error, not the generic wrapper", () => {
            const logs = buildGlobalPolicyExceptionLogs(fixture);
            const result = parseTrace(logs);

            expect(result.globalError?.message).toBe(NESTED_MESSAGE);
            expect(result.globalError?.message).not.toBe(GENERIC_MESSAGE);
        });

        it("should include technicalProfile.Id in the primary error data", () => {
            const logs = buildGlobalPolicyExceptionLogs(fixture);
            const result = parseTrace(logs);

            expect(result.globalError?.data).toMatchObject({
                "technicalProfile.Id": "AAD-UserReadUsingAlternativeSecurityId-NoError",
            });
        });

        it("should mark the pending TP step as Error when SendErrorHandler fires", () => {
            const logs = buildGlobalPolicyExceptionLogs(fixture);
            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps[0].result).toBe("Error");
        });

        it("should attach the error to the step associated with the TP in the exception data", () => {
            const logs = buildGlobalPolicyExceptionLogs(fixture);
            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps[0].errors[0].message).toBe(NESTED_MESSAGE);
            expect(steps[0].errors[0].data).toMatchObject({
                "technicalProfile.Id": "AAD-UserReadUsingAlternativeSecurityId-NoError",
            });
        });

        it("should expose the first-level inner exception in the chain", () => {
            const logs = buildDeepNestedExceptionLogs(fixture);
            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            const innerExceptions = steps[0].errors[0].innerExceptions;
            expect(innerExceptions).toHaveLength(1);
            expect(innerExceptions![0].message).toBe(INNER_MESSAGE);
            expect(innerExceptions![0].data).toMatchObject({
                "identifierClaimMapping.PolicyClaimType.Id": "alternativeSecurityId",
            });
        });

        it("should propagate the full 3-level inner exception chain", () => {
            const logs = buildDeepNestedExceptionLogs(fixture);
            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            const inner = steps[0].errors[0].innerExceptions![0];
            const innermost = inner.innerExceptions![0];
            expect(innermost.message).toBe(INNERMOST_MESSAGE);
            expect(innermost.innerExceptions).toBeUndefined();
        });

        it("should propagate innerExceptions on globalError as well", () => {
            const logs = buildDeepNestedExceptionLogs(fixture);
            const result = parseTrace(logs);

            const innerExceptions = result.globalError?.innerExceptions;
            expect(innerExceptions).toHaveLength(1);
            expect(innerExceptions![0].message).toBe(INNER_MESSAGE);
        });

        it("should not attach innerExceptions when the most-specific exception has no nested exception", () => {
            const logs = buildGlobalPolicyExceptionLogs(fixture);
            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            const stepError = steps[0].errors[0];
            expect(stepError.message).toBe(NESTED_MESSAGE);
            expect(stepError.innerExceptions).toBeUndefined();
        });
    });
});
