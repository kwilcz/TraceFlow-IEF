/**
 * Early Validation Error Tests
 *
 * Tests for scenarios where the flow fails immediately during initial validation,
 * before any orchestration steps execute (e.g., invalid redirect URI, client ID).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import type { TraceLogInput } from "@/types/trace";
import type { ClipsArray, Clip, HandlerResultContent, HeadersClip } from "@/types/journey-recorder";
import { getTestSteps } from "./test-step-helpers";

function createHeadersClip(
    policyId: string,
    correlationId: string,
    eventType: "Event:AUTH" | "Event:API" = "Event:AUTH"
): HeadersClip {
    return {
        Kind: "Headers",
        Content: {
            UserJourneyRecorderEndpoint: "urn:journeyrecorder:applicationinsights",
            CorrelationId: correlationId,
            EventInstance: eventType,
            TenantId: "test.onmicrosoft.com",
            PolicyId: policyId,
        },
    };
}

// Generate a policy ID for test defaults
const defaultTestPolicyId = `B2C_1A_TEST_SignUpOrSignIn_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

function createTraceLogInput(
    clips: ClipsArray,
    timestamp: Date = new Date("2024-01-15T10:30:00.000Z"),
    policyId: string = defaultTestPolicyId
): TraceLogInput {
    return {
        id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp,
        policyId,
        correlationId: "test-correlation-id",
        clips,
    };
}

describe("Early Validation Error Handling", () => {
    it("should create an error step for invalid redirect URI", () => {
        const testPolicyId = `B2C_1A_TEST_SignUpOrSignIn_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const testClientId = `${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 14)}`;
        const errorMessage = `The redirect URI 'exp://192.168.0.1:8081' provided in the request is not registered for the client id '${testClientId}'.`;
        
        const logs: TraceLogInput[] = [
            createTraceLogInput([
                createHeadersClip(testPolicyId, "corr-123"),
                { Kind: "Transition", Content: { EventName: "AUTH", StateName: "Initial" } },
                { Kind: "Predicate", Content: "Web.TPEngine.StateMachineHandlers.NoOpHandler" },
                {
                    Kind: "HandlerResult",
                    Content: {
                        Result: true,
                        Statebag: {
                            MACHSTATE: { c: "2025-12-04T14:34:07.2900666Z", k: "MACHSTATE", v: "Initial", p: true },
                        },
                        PredicateResult: "True",
                    } as HandlerResultContent,
                },
                { Kind: "Action", Content: "Web.TPEngine.OrchestrationManager" },
                {
                    Kind: "HandlerResult",
                    Content: {
                        Result: true,
                        Statebag: {
                            "Complex-CLMS": {},
                            ORCH_CS: { c: "2025-12-04T14:34:07.2920615Z", k: "ORCH_CS", v: "0", p: true },
                        },
                    } as HandlerResultContent,
                },
                { Kind: "Predicate", Content: "Web.TPEngine.StateMachineHandlers.InitiatingMessageValidationHandler" },
                {
                    Kind: "HandlerResult",
                    Content: {
                        Result: false,
                        RecorderRecord: {
                            Values: [
                                {
                                    Key: "Validation",
                                    Value: {
                                        Values: [
                                            { Key: "SubmittedBy", Value: "Application" },
                                            { Key: "ProtocolProviderType", Value: "OpenIdConnectProtocolProvider" },
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
                                },
                            ],
                        },
                        Exception: {
                            Kind: "Handled",
                            HResult: "80131500",
                            Message: errorMessage,
                            Data: { IsPolicySpecificError: false },
                        },
                        PredicateResult: "False",
                    } as HandlerResultContent,
                },
                { Kind: "Action", Content: "Web.TPEngine.StateMachineHandlers.SendErrorHandler" },
                {
                    Kind: "HandlerResult",
                    Content: {
                        Result: true,
                        RecorderRecord: {
                            Values: [
                                { Key: "SendErrorTechnicalProfile", Value: "OpenIdConnectProtocolProvider" },
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
                    } as HandlerResultContent,
                },
            ] as Clip[]),
        ];

        const result = parseTrace(logs);
        const steps = getTestSteps(result);

        // Should have created an error step despite ORCH_CS being 0
        expect(steps.length).toBeGreaterThanOrEqual(1);
        
        // Find the error step
        const errorStep = steps.find(s => s.result === "Error");
        expect(errorStep).toBeDefined();
        expect(errorStep?.errorMessage).toContain("redirect URI");
        expect(errorStep?.errorHResult).toBe("80131500"); // HResult should be captured
        expect(errorStep?.orchestrationStep).toBe(0); // Error occurred at step 0
    });

    it("should include error step in trace errors", () => {
        const testPolicyId = `B2C_1A_TEST_SignUpOrSignIn_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const errorMessage = "Invalid client_id parameter.";
        
        const logs: TraceLogInput[] = [
            createTraceLogInput([
                createHeadersClip(testPolicyId, "corr-456"),
                { Kind: "Action", Content: "Web.TPEngine.OrchestrationManager" },
                {
                    Kind: "HandlerResult",
                    Content: {
                        Result: true,
                        Statebag: {
                            ORCH_CS: { c: "2025-12-04T14:34:07.2920615Z", k: "ORCH_CS", v: "0", p: true },
                        },
                    } as HandlerResultContent,
                },
                { Kind: "Predicate", Content: "Web.TPEngine.StateMachineHandlers.InitiatingMessageValidationHandler" },
                {
                    Kind: "HandlerResult",
                    Content: {
                        Result: false,
                        Exception: {
                            Kind: "Handled",
                            HResult: "80070057",
                            Message: errorMessage,
                        },
                        PredicateResult: "False",
                    } as HandlerResultContent,
                },
            ] as Clip[]),
        ];

        const result = parseTrace(logs);
        const steps = getTestSteps(result);

        // Should have at least one error step
        const errorSteps = steps.filter(s => s.result === "Error");
        expect(errorSteps.length).toBeGreaterThanOrEqual(1);
        
        // The error message and HResult should be captured
        expect(errorSteps[0]?.errorMessage).toBe(errorMessage);
        expect(errorSteps[0]?.errorHResult).toBe("80070057");
    });
});
