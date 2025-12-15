import { describe, it, expect } from "vitest";
import { TraceParser, parseTrace, logsToTraceInput, getTraceStepsForNode } from "@/lib/trace";
import { TraceLogInput, TraceStep } from "@/types/trace";
import { ClipsArray, HeadersClip, HandlerResultClip, ActionClip, PredicateClip } from "@/types/journey-recorder";

/**
 * Test fixture helpers for creating trace log inputs.
 * Updated to match new parsing logic that requires Event:AUTH or Event:API.
 */
function createHeadersClip(policyId: string, correlationId: string, eventInstance: string = "Event:API"): HeadersClip {
    return {
        Kind: "Headers",
        Content: {
            UserJourneyRecorderEndpoint: "urn:journeyrecorder:applicationinsights",
            CorrelationId: correlationId,
            EventInstance: eventInstance,
            TenantId: "test.onmicrosoft.com",
            PolicyId: policyId,
        },
    };
}

function createOrchestrationManagerClip(): ActionClip {
    return {
        Kind: "Action",
        Content: "Web.TPEngine.OrchestrationManager",
    };
}

function createHandlerResultClip(
    orchCs: number,
    result: boolean = true,
    predicateResult?: string,
    exception?: { Message: string },
    recorderRecord?: { Values: Array<{ Key: string; Value: unknown }> },
    statebagExtras?: Record<string, { c: string; k: string; v: string; p: boolean }>
): HandlerResultClip {
    return {
        Kind: "HandlerResult",
        Content: {
            Result: result,
            PredicateResult: predicateResult,
            Exception: exception,
            RecorderRecord: recorderRecord,
            Statebag: {
                ORCH_CS: { c: "2024-01-15T10:30:00.000Z", k: "ORCH_CS", v: String(orchCs), p: true },
                ...statebagExtras,
            },
        },
    };
}

function createActionClip(action: string): ActionClip {
    return {
        Kind: "Action",
        Content: action,
    };
}

function createPredicateClip(predicate: string): PredicateClip {
    return {
        Kind: "Predicate",
        Content: predicate,
    };
}

function createTraceLogInput(
    clips: ClipsArray,
    timestamp: Date = new Date("2024-01-15T10:30:00.000Z"),
    policyId: string = "B2C_1A_SignUpOrSignIn"
): TraceLogInput {
    return {
        id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp,
        policyId,
        correlationId: "test-correlation-id",
        clips,
    };
}

/**
 * Create a complete step sequence as it appears in real Event:AUTH/Event:API logs.
 * OrchestrationManager -> HandlerResult pattern.
 */
function createStepSequence(
    policyId: string,
    stepNumbers: number[],
    options: { timestamp?: Date } = {}
): ClipsArray {
    const clips: ClipsArray = [createHeadersClip(policyId, "corr-123")];
    
    for (const stepNum of stepNumbers) {
        // OrchestrationManager signals start of step
        clips.push(createOrchestrationManagerClip());
        // HandlerResult contains the step data
        clips.push(createHandlerResultClip(stepNum));
    }
    
    return clips;
}

describe("TraceParser", () => {
    describe("Basic Parsing", () => {
        it("should return empty trace for empty logs", () => {
            const result = parseTrace([]);

            expect(result.traceSteps).toHaveLength(0);
            expect(result.success).toBe(false); // No Event:API logs = no success
            expect(result.errors).toHaveLength(1);
        });

        it("should extract main journey ID from Headers clip", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_SignUpOrSignIn", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1),
                ]),
            ];

            const result = parseTrace(logs);

            expect(result.mainJourneyId).toBe("B2C_1A_SignUpOrSignIn");
        });

        it("should create trace steps for each orchestration step", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_SignUpOrSignIn", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(2),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(3),
                ]),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps).toHaveLength(3);
            expect(result.traceSteps[0].stepOrder).toBe(1);
            expect(result.traceSteps[1].stepOrder).toBe(2);
            expect(result.traceSteps[2].stepOrder).toBe(3);
        });

        it("should generate correct graphNodeId format", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_SignUpOrSignIn", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(2),
                ]),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].graphNodeId).toBe("B2C_1A_SignUpOrSignIn-Step1");
            expect(result.traceSteps[1].graphNodeId).toBe("B2C_1A_SignUpOrSignIn-Step2");
        });

        it("should assign sequential sequence numbers", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_SignUpOrSignIn", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(2),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(3),
                ]),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].sequenceNumber).toBe(0);
            expect(result.traceSteps[1].sequenceNumber).toBe(1);
            expect(result.traceSteps[2].sequenceNumber).toBe(2);
        });

        it("should filter out unsupported event types", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_SignUpOrSignIn", "corr-123", "Event:OIDC"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1),
                ]),
            ];

            const result = parseTrace(logs);

            // Non-supported event types (Event:OIDC, etc.) should be filtered out
            // Supported: Event:API, Event:AUTH, Event:SELFASSERTED, Event:ClaimsExchange
            expect(result.traceSteps).toHaveLength(0);
            expect(result.success).toBe(false);
        });

        it("should process both Event:AUTH and Event:API logs", () => {
            const logs: TraceLogInput[] = [
                // Event:AUTH should be processed
                createTraceLogInput([
                    createHeadersClip("B2C_1A_SignUpOrSignIn", "corr-123", "Event:AUTH"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1),
                ], new Date("2024-01-15T10:30:00.000Z")),
                // Event:API should also be processed
                createTraceLogInput([
                    createHeadersClip("B2C_1A_SignUpOrSignIn", "corr-123", "Event:API"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(2),
                ], new Date("2024-01-15T10:31:00.000Z")),
            ];

            const result = parseTrace(logs);

            // Both logs should produce steps
            expect(result.traceSteps).toHaveLength(2);
            expect(result.traceSteps[0].stepOrder).toBe(1);
            expect(result.traceSteps[0].eventType).toBe("AUTH");
            expect(result.traceSteps[1].stepOrder).toBe(2);
            expect(result.traceSteps[1].eventType).toBe("API");
        });

        it("should process Event:SELFASSERTED logs", () => {
            const logs: TraceLogInput[] = [
                // Event:AUTH creates step with HRD options
                createTraceLogInput([
                    createHeadersClip("B2C_1A_SignUpOrSignIn", "corr-123", "Event:AUTH"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1),
                ], new Date("2024-01-15T10:30:00.000Z")),
                // Event:SELFASSERTED validates user input (should be processed)
                createTraceLogInput([
                    createHeadersClip("B2C_1A_SignUpOrSignIn", "corr-123", "Event:SELFASSERTED"),
                    // SELFASSERTED doesn't have OrchestrationManager, it validates existing step
                ], new Date("2024-01-15T10:31:00.000Z")),
            ];

            const result = parseTrace(logs);

            // AUTH log should produce step, SELFASSERTED updates existing step
            expect(result.traceSteps).toHaveLength(1);
            expect(result.traceSteps[0].stepOrder).toBe(1);
            expect(result.success).toBe(true);
        });

        it("should process Event:ClaimsExchange logs (return from external IdP)", () => {
            const logs: TraceLogInput[] = [
                // Event:AUTH creates initial step
                createTraceLogInput([
                    createHeadersClip("B2C_1A_SignUpOrSignIn", "corr-123", "Event:AUTH"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1),
                ], new Date("2024-01-15T10:30:00.000Z")),
                // Event:ClaimsExchange returns from external IdP with subsequent steps
                createTraceLogInput([
                    createHeadersClip("B2C_1A_SignUpOrSignIn", "corr-123", "Event:ClaimsExchange"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(4), // Step 4 after external IdP returns
                ], new Date("2024-01-15T10:32:00.000Z")),
            ];

            const result = parseTrace(logs);

            // Both AUTH and ClaimsExchange should produce steps
            expect(result.traceSteps).toHaveLength(2);
            expect(result.traceSteps[0].stepOrder).toBe(1);
            expect(result.traceSteps[0].eventType).toBe("AUTH");
            expect(result.traceSteps[1].stepOrder).toBe(4);
            expect(result.traceSteps[1].eventType).toBe("ClaimsExchange");
            expect(result.success).toBe(true);
        });
    });

    describe("Step Result Detection", () => {
        it("should mark step as Success when Result is true", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_Test", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1, true),
                ]),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].result).toBe("Success");
        });

        it("should mark step as Error when Exception is present", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_Test", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1, false, undefined, { Message: "Test error" }),
                ]),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].result).toBe("Error");
            expect(result.traceSteps[0].errorMessage).toBe("Test error");
        });
    });

    describe("Statebag and Claims Tracking", () => {
        it("should have step-scoped statebag (cleared between steps)", () => {
            // B2C statebag is step-scoped - it gets cleared when a new orchestration step starts.
            // Only claims (Complex-CLMS) persist across steps.
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_Test", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1, true, undefined, undefined, undefined, {
                        email: { c: "2024-01-15T10:30:00.000Z", k: "email", v: "user@example.com", p: true },
                    }),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(2, true, undefined, undefined, undefined, {
                        displayName: { c: "2024-01-15T10:30:01.000Z", k: "displayName", v: "John Doe", p: true },
                    }),
                ]),
            ];

            const result = parseTrace(logs);

            // First step should have email (set in step 1)
            expect(result.traceSteps[0].statebagSnapshot).toHaveProperty("email", "user@example.com");
            expect(result.traceSteps[0].statebagSnapshot).not.toHaveProperty("displayName");

            // Second step should ONLY have displayName (statebag cleared, email was step-scoped)
            expect(result.traceSteps[1].statebagSnapshot).not.toHaveProperty("email");
            expect(result.traceSteps[1].statebagSnapshot).toHaveProperty("displayName", "John Doe");
        });

        it("should track final statebag state (only from last step)", () => {
            // Final statebag only contains entries from the last step since statebag is step-scoped
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_Test", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1, true, undefined, undefined, undefined, {
                        claim1: { c: "2024-01-15T10:30:00.000Z", k: "claim1", v: "value1", p: true },
                    }),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(2, true, undefined, undefined, undefined, {
                        claim2: { c: "2024-01-15T10:30:01.000Z", k: "claim2", v: "value2", p: true },
                    }),
                ]),
            ];

            const result = parseTrace(logs);

            // Final statebag only contains entries from the last step
            expect(result.finalStatebag).not.toHaveProperty("claim1");
            expect(result.finalStatebag).toHaveProperty("claim2", "value2");
        });
    });

    describe("Execution Map", () => {
        it("should populate execution map with node statuses", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_Test", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1, true),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(2, false, undefined, { Message: "Error" }), // Error
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(3, true),
                ]),
            ];

            const result = parseTrace(logs);

            expect(result.executionMap["B2C_1A_Test-Step1"]).toBeDefined();
            expect(result.executionMap["B2C_1A_Test-Step1"].status).toBe("Success");

            expect(result.executionMap["B2C_1A_Test-Step2"]).toBeDefined();
            expect(result.executionMap["B2C_1A_Test-Step2"].status).toBe("Error");

            expect(result.executionMap["B2C_1A_Test-Step3"]).toBeDefined();
            expect(result.executionMap["B2C_1A_Test-Step3"].status).toBe("Success");
        });

        it("should track visit count for nodes visited multiple times", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_Test", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1, true),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(2, true),
                ]),
            ];

            const result = parseTrace(logs);

            // The first step should be visited exactly once
            const step1 = result.executionMap["B2C_1A_Test-Step1"];
            expect(step1).toBeDefined();
            expect(step1.visitCount).toBe(1);
        });

        it("should store step indices in execution map", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_Test", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1, true),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(2, true),
                ]),
            ];

            const result = parseTrace(logs);

            expect(result.executionMap["B2C_1A_Test-Step1"].stepIndices).toContain(0);
            expect(result.executionMap["B2C_1A_Test-Step2"].stepIndices).toContain(1);
        });
    });

    describe("Technical Profile Extraction", () => {
        it("should extract available technical profiles to selectableOptions from step invoke handler with multiple TPs", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_Test", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1),
                    // The predicate sets the context
                    createPredicateClip("Web.TPEngine.StateMachineHandlers.ShouldOrchestrationStepBeInvokedHandler"),
                    // Multiple TPs enabled = choice step
                    createHandlerResultClip(1, true, undefined, undefined, {
                        Values: [
                            {
                                Key: "EnabledForUserJourneysTrue",
                                Value: {
                                    Values: [
                                        { Key: "CurrentStep", Value: 1 },
                                        { Key: "TechnicalProfileEnabled", Value: { TechnicalProfile: "AAD-UserReadUsingObjectId" } },
                                    ],
                                },
                            },
                            {
                                Key: "EnabledForUserJourneysTrue",
                                Value: {
                                    Values: [
                                        { Key: "TechnicalProfileEnabled", Value: { TechnicalProfile: "Facebook-OAUTH" } },
                                    ],
                                },
                            },
                        ],
                    }),
                    createOrchestrationManagerClip(), // Finalize previous step
                ]),
            ];

            const result = parseTrace(logs);

            // ShouldOrchestrationStepBeInvokedHandler extracts available TPs to selectableOptions when multiple TPs
            expect(result.traceSteps[0].selectableOptions).toContain("AAD-UserReadUsingObjectId");
            expect(result.traceSteps[0].selectableOptions).toContain("Facebook-OAUTH");
            expect(result.traceSteps[0].isInteractiveStep).toBe(true);
        });

        it("should extract triggered technical profile from InitiatingClaimsExchange", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_Test", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1),
                    // Step invoke handler shows available TPs
                    createPredicateClip("Web.TPEngine.StateMachineHandlers.ShouldOrchestrationStepBeInvokedHandler"),
                    createHandlerResultClip(1, true, undefined, undefined, {
                        Values: [
                            {
                                Key: "EnabledForUserJourneysTrue",
                                Value: {
                                    Values: [
                                        { Key: "CurrentStep", Value: 1 },
                                        { Key: "TechnicalProfileEnabled", Value: { TechnicalProfile: "AAD-UserReadUsingObjectId" } },
                                    ],
                                },
                            },
                        ],
                    }),
                    // Claims exchange handler shows which TP was actually triggered
                    createPredicateClip("Web.TPEngine.StateMachineHandlers.IsClaimsExchangeProtocolAServiceCallHandler"),
                    createHandlerResultClip(1, true, undefined, undefined, {
                        Values: [
                            {
                                Key: "InitiatingClaimsExchange",
                                Value: {
                                    ProtocolType: "None",
                                    TargetEntity: "AAD-UserReadUsingObjectId",
                                    TechnicalProfileId: "AAD-UserReadUsingObjectId",
                                    ProtocolProviderType: "None",
                                },
                            },
                        ],
                    }),
                    createOrchestrationManagerClip(), // Finalize previous step
                ]),
            ];

            const result = parseTrace(logs);

            // InitiatingClaimsExchange determines the triggered TP
            expect(result.traceSteps[0].technicalProfiles).toContain("AAD-UserReadUsingObjectId");
        });

        it("should deduplicate selectable options with multiple TPs", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_Test", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1),
                    // Multiple TPs with one duplicate
                    createPredicateClip("Web.TPEngine.StateMachineHandlers.ShouldOrchestrationStepBeInvokedHandler"),
                    createHandlerResultClip(1, true, undefined, undefined, {
                        Values: [
                            {
                                Key: "EnabledForUserJourneysTrue",
                                Value: {
                                    Values: [
                                        { Key: "TechnicalProfileEnabled", Value: { TechnicalProfile: "AAD-Common" } },
                                    ],
                                },
                            },
                            {
                                Key: "EnabledForUserJourneysTrue",
                                Value: {
                                    Values: [
                                        { Key: "TechnicalProfileEnabled", Value: { TechnicalProfile: "Facebook-OAuth" } },
                                    ],
                                },
                            },
                        ],
                    }),
                    // Another handler result with same TPs (duplicate)
                    createPredicateClip("Web.TPEngine.StateMachineHandlers.ShouldOrchestrationStepBeInvokedHandler"),
                    createHandlerResultClip(1, true, undefined, undefined, {
                        Values: [
                            {
                                Key: "EnabledForUserJourneysTrue",
                                Value: {
                                    Values: [
                                        { Key: "TechnicalProfileEnabled", Value: { TechnicalProfile: "AAD-Common" } },
                                    ],
                                },
                            },
                            {
                                Key: "EnabledForUserJourneysTrue",
                                Value: {
                                    Values: [
                                        { Key: "TechnicalProfileEnabled", Value: { TechnicalProfile: "Facebook-OAuth" } },
                                    ],
                                },
                            },
                        ],
                    }),
                    createOrchestrationManagerClip(), // Finalize
                ]),
            ];

            const result = parseTrace(logs);

            // SelectableOptions should be deduplicated
            const aadCount = result.traceSteps[0].selectableOptions?.filter((opt) => opt === "AAD-Common").length ?? 0;
            expect(aadCount).toBe(1);
        });
    });

    describe("Action and Predicate Tracking", () => {
        it("should capture action handler for steps", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_Test", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1, true),
                ]),
            ];

            const result = parseTrace(logs);

            // OrchestrationManager is the action handler that creates steps
            expect(result.traceSteps[0].actionHandler).toBe("Web.TPEngine.OrchestrationManager");
        });
    });

    describe("Multiple Log Segments", () => {
        it("should stitch together multiple log segments by timestamp", () => {
            const logs: TraceLogInput[] = [
                // First segment
                createTraceLogInput(
                    [
                        createHeadersClip("B2C_1A_Test", "corr-123"),
                        createOrchestrationManagerClip(),
                        createHandlerResultClip(1, true),
                    ],
                    new Date("2024-01-15T10:30:00.000Z")
                ),
                // Second segment (after UI pause) - needs headers to be detected as Event:AUTH/Event:API
                createTraceLogInput(
                    [
                        createHeadersClip("B2C_1A_Test", "corr-123"),
                        createOrchestrationManagerClip(),
                        createHandlerResultClip(2, true),
                    ],
                    new Date("2024-01-15T10:31:00.000Z")
                ),
                // Third segment
                createTraceLogInput(
                    [
                        createHeadersClip("B2C_1A_Test", "corr-123"),
                        createOrchestrationManagerClip(),
                        createHandlerResultClip(3, true),
                    ],
                    new Date("2024-01-15T10:32:00.000Z")
                ),
            ];

            const result = parseTrace(logs);

            // All steps should be in sequential order
            expect(result.traceSteps).toHaveLength(3);
            expect(result.traceSteps[0].stepOrder).toBe(1);
            expect(result.traceSteps[1].stepOrder).toBe(2);
            expect(result.traceSteps[2].stepOrder).toBe(3);
        });

        it("should sort clips by timestamp across segments", () => {
            // Out of order segments
            const logs: TraceLogInput[] = [
                createTraceLogInput(
                    [
                        createHeadersClip("B2C_1A_Test", "corr-123"),
                        createOrchestrationManagerClip(),
                        createHandlerResultClip(3, true),
                    ],
                    new Date("2024-01-15T10:32:00.000Z")
                ),
                createTraceLogInput(
                    [
                        createHeadersClip("B2C_1A_Test", "corr-123"),
                        createOrchestrationManagerClip(),
                        createHandlerResultClip(1, true),
                    ],
                    new Date("2024-01-15T10:30:00.000Z")
                ),
                createTraceLogInput(
                    [
                        createHeadersClip("B2C_1A_Test", "corr-123"),
                        createOrchestrationManagerClip(),
                        createHandlerResultClip(2, true),
                    ],
                    new Date("2024-01-15T10:31:00.000Z")
                ),
            ];

            const result = parseTrace(logs);

            // Should be sorted by timestamp
            expect(result.traceSteps[0].stepOrder).toBe(1);
            expect(result.traceSteps[1].stepOrder).toBe(2);
            expect(result.traceSteps[2].stepOrder).toBe(3);
        });
    });

    describe("Helper Functions", () => {
        it("getTraceStepsForNode should return all steps for a node", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_Test", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1, true),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(2, true),
                ]),
            ];

            const result = parseTrace(logs);
            const step1Steps = getTraceStepsForNode(result, "B2C_1A_Test-Step1");

            expect(step1Steps).toHaveLength(1);
            expect(step1Steps[0].stepOrder).toBe(1);
        });

        it("getTraceStepsForNode should return empty array for unknown node", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_Test", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1, true),
                ]),
            ];

            const result = parseTrace(logs);
            const unknownSteps = getTraceStepsForNode(result, "UnknownNode");

            expect(unknownSteps).toHaveLength(0);
        });
    });

    describe("Error Handling", () => {
        it("should handle logs without Headers clip", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1, true),
                ]),
            ];

            // No Headers = no Event:AUTH/Event:API = no trace
            const result = parseTrace(logs);

            expect(result).toBeDefined();
            expect(result.success).toBe(false);
            expect(result.traceSteps).toHaveLength(0);
        });

        it("should handle HandlerResult without Statebag", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_Test", "corr-123"),
                    createOrchestrationManagerClip(),
                    {
                        Kind: "HandlerResult",
                        Content: {
                            Result: true,
                            // No Statebag - no ORCH_CS = no step detected
                        },
                    },
                ]),
            ];

            const result = parseTrace(logs);

            // Should not throw - but no steps since no ORCH_CS
            expect(result).toBeDefined();
            expect(result.traceSteps).toHaveLength(0);
        });

        it("should skip Step 0 (preStep)", () => {
            const logs: TraceLogInput[] = [
                createTraceLogInput([
                    createHeadersClip("B2C_1A_Test", "corr-123"),
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(0, true), // Step 0 should be ignored
                    createOrchestrationManagerClip(),
                    createHandlerResultClip(1, true), // Step 1 should be included
                ]),
            ];

            const result = parseTrace(logs);

            // Only Step 1 should be present, Step 0 is skipped
            expect(result.traceSteps).toHaveLength(1);
            expect(result.traceSteps[0].stepOrder).toBe(1);
        });
    });
});

describe("logsToTraceInput", () => {
    it("should convert LogRecord array to TraceLogInput array", () => {
        const logs = [
            {
                id: "log-1",
                timestamp: new Date("2024-01-15T10:30:00.000Z"),
                policyId: "B2C_1A_Test",
                correlationId: "corr-123",
                cloudRoleInstance: "instance-1",
                rawIds: ["log-1"],
                payloadText: "[]",
                parsedPayload: [],
                clips: [createHeadersClip("B2C_1A_Test", "corr-123")],
                customDimensions: {
                    correlationId: "corr-123",
                    eventName: "test",
                    tenant: "test.onmicrosoft.com",
                    userJourney: "B2C_1A_Test",
                    version: "1.0",
                },
            },
        ];

        const result = logsToTraceInput(logs);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("log-1");
        expect(result[0].policyId).toBe("B2C_1A_Test");
        expect(result[0].clips).toHaveLength(1);
    });
});
