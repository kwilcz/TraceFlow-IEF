/**
 * Clip Fixtures
 *
 * Test fixtures for various clip types used in trace parsing tests.
 * These fixtures represent real B2C clip structures.
 */

import type {
    Clip,
    ClipsArray,
    HeadersContent,
    TransitionContent,
    HandlerResultContent,
    Statebag,
    RecorderRecord,
} from "@/types/journey-recorder";

// =============================================================================
// RANDOM DATA GENERATORS
// =============================================================================

/** Generate a randomized policy ID */
const generatePolicyId = () => `B2C_1A_TEST_SignUpOrSignIn_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// Default policy ID for this module
const defaultClipPolicyId = generatePolicyId();

// =============================================================================
// HEADERS FIXTURES
// =============================================================================

export const createHeadersContent = (
    overrides: Partial<HeadersContent> = {}
): HeadersContent => ({
    UserJourneyRecorderEndpoint: "urn:journeyrecorder:applicationinsights",
    CorrelationId: "test-correlation-id",
    EventInstance: "Event:AUTH",
    TenantId: "test-tenant.onmicrosoft.com",
    PolicyId: defaultClipPolicyId,
    ...overrides,
});

export const createHeadersClip = (
    overrides: Partial<HeadersContent> = {}
): Clip => ({
    Kind: "Headers",
    Content: createHeadersContent(overrides),
});

// =============================================================================
// TRANSITION FIXTURES
// =============================================================================

export const createTransitionContent = (
    overrides: Partial<TransitionContent> = {}
): TransitionContent => ({
    EventName: "AUTH",
    StateName: "Initial",
    ...overrides,
});

export const createTransitionClip = (
    eventName = "AUTH",
    stateName = "Initial"
): Clip => ({
    Kind: "Transition",
    Content: { EventName: eventName, StateName: stateName },
});

// =============================================================================
// ACTION / PREDICATE FIXTURES
// =============================================================================

export const createActionClip = (handlerName: string): Clip => ({
    Kind: "Action",
    Content: handlerName,
});

export const createPredicateClip = (predicateName: string): Clip => ({
    Kind: "Predicate",
    Content: predicateName,
});

// =============================================================================
// STATEBAG FIXTURES
// =============================================================================

export const createStatebagEntry = (
    key: string,
    value: string,
    persisted = true
) => ({
    c: new Date().toISOString(),
    k: key,
    v: value,
    p: persisted,
});

export const createStatebag = (
    orchStep = 1,
    additionalEntries: Record<string, string> = {}
): Statebag => {
    const statebag: Statebag = {
        ORCH_CS: createStatebagEntry("ORCH_CS", String(orchStep)),
        MACHSTATE: createStatebagEntry("MACHSTATE", "AwaitingNextStep"),
    };

    for (const [key, value] of Object.entries(additionalEntries)) {
        statebag[key] = createStatebagEntry(key, value);
    }

    return statebag;
};

export const createClaimsStatebag = (
    claims: Record<string, string>
): Statebag => ({
    "Complex-CLMS": claims,
    ComplexItems: "CLMS",
});

// =============================================================================
// HANDLER RESULT FIXTURES
// =============================================================================

export const createHandlerResultContent = (
    overrides: Partial<HandlerResultContent> = {}
): HandlerResultContent => ({
    Result: true,
    Statebag: createStatebag(1),
    ...overrides,
});

export const createHandlerResultClip = (
    overrides: Partial<HandlerResultContent> = {}
): Clip => ({
    Kind: "HandlerResult",
    Content: createHandlerResultContent(overrides),
});

export const createSuccessHandlerResult = (
    orchStep: number,
    claims: Record<string, string> = {}
): Clip => ({
    Kind: "HandlerResult",
    Content: {
        Result: true,
        Statebag: {
            ...createStatebag(orchStep),
            "Complex-CLMS": claims,
        },
    },
});

export const createErrorHandlerResult = (errorMessage: string): Clip => ({
    Kind: "HandlerResult",
    Content: {
        Result: false,
        Exception: {
            Message: errorMessage,
        },
    },
});

// =============================================================================
// RECORDER RECORD FIXTURES
// =============================================================================

export const createRecorderRecord = (
    entries: Array<{ Key: string; Value: unknown }>
): RecorderRecord => ({
    Values: entries,
});

export const createInitiatingClaimsExchangeRecord = (
    technicalProfileId: string,
    protocolType = "OIDC"
): RecorderRecord =>
    createRecorderRecord([
        {
            Key: "InitiatingClaimsExchange",
            Value: {
                ProtocolType: protocolType,
                TargetEntity: "Cpim",
                TechnicalProfileId: technicalProfileId,
                ProtocolProviderType: protocolType,
            },
        },
    ]);

export const createClaimsTransformationRecord = (
    id: string,
    inputClaims: Array<{ type: string; value: string }> = [],
    outputClaims: Array<{ type: string; value: string }> = []
): RecorderRecord =>
    createRecorderRecord([
        {
            Key: "OutputClaimsTransformation",
            Value: {
                Values: [
                    {
                        Key: "ClaimsTransformation",
                        Value: {
                            Values: [
                                { Key: "Id", Value: id },
                                ...inputClaims.map((c) => ({
                                    Key: "InputClaim",
                                    Value: { PolicyClaimType: c.type, Value: c.value },
                                })),
                                ...outputClaims.map((c) => ({
                                    Key: "Result",
                                    Value: { PolicyClaimType: c.type, Value: c.value },
                                })),
                            ],
                        },
                    },
                ],
            },
        },
    ]);

export const createHrdEnabledRecord = (
    technicalProfiles: string[]
): RecorderRecord =>
    createRecorderRecord([
        {
            Key: "EnabledForUserJourneysTrue",
            Value: {
                Values: technicalProfiles.map((tp) => ({
                    Key: "TechnicalProfileEnabled",
                    Value: { TechnicalProfile: tp, EnabledResult: true },
                })),
            },
        },
    ]);

export const createSubJourneyRecord = (subJourneyId: string): RecorderRecord =>
    createRecorderRecord([
        {
            Key: "SubJourney",
            Value: subJourneyId,
        },
    ]);

// =============================================================================
// FATAL EXCEPTION FIXTURES
// =============================================================================

export const createFatalExceptionClip = (message: string): Clip => ({
    Kind: "FatalException",
    Content: {
        Exception: { Message: message },
        Time: new Date().toISOString(),
    },
});

// =============================================================================
// COMPLETE CLIP SEQUENCE FIXTURES
// =============================================================================

/**
 * Creates a basic orchestration action sequence.
 */
export const createOrchestrationSequence = (stepNumber: number): ClipsArray => [
    createPredicateClip("PredicateTrue"),
    createActionClip("OrchestrationActionHandler"),
    createSuccessHandlerResult(stepNumber),
];

/**
 * Creates a claims exchange sequence.
 */
export const createClaimsExchangeSequence = (
    technicalProfileId: string,
    stepNumber: number
): ClipsArray => [
    createPredicateClip("PredicateTrue"),
    createActionClip("ClaimsExchangeActionHandler"),
    {
        Kind: "HandlerResult",
        Content: {
            Result: true,
            Statebag: createStatebag(stepNumber),
            RecorderRecord: createInitiatingClaimsExchangeRecord(technicalProfileId),
        },
    },
];

/**
 * Creates a self-asserted form sequence.
 */
export const createSelfAssertedSequence = (
    technicalProfileId: string,
    stepNumber: number,
    submittedClaims: Record<string, string> = {}
): ClipsArray => [
    createPredicateClip("PredicateTrue"),
    createActionClip("SelfAssertedAttributeProviderActionHandler"),
    {
        Kind: "HandlerResult",
        Content: {
            Result: true,
            Statebag: {
                ...createStatebag(stepNumber),
                "Complex-CLMS": submittedClaims,
            },
            RecorderRecord: createInitiatingClaimsExchangeRecord(technicalProfileId, "SelfAsserted"),
        },
    },
];

/**
 * Creates an HRD sequence with provider selection.
 */
export const createHrdSequence = (
    enabledProviders: string[],
    stepNumber: number
): ClipsArray => [
    createPredicateClip("PredicateTrue"),
    createActionClip("HomeRealmDiscoveryActionHandler"),
    {
        Kind: "HandlerResult",
        Content: {
            Result: true,
            Statebag: createStatebag(stepNumber),
            RecorderRecord: createHrdEnabledRecord(enabledProviders),
        },
    },
];

/**
 * Creates a SubJourney dispatch sequence.
 */
export const createSubJourneyDispatchSequence = (
    subJourneyId: string,
    stepNumber: number
): ClipsArray => [
    createPredicateClip("PredicateTrue"),
    createActionClip("SubJourneyDispatchActionHandler"),
    {
        Kind: "HandlerResult",
        Content: {
            Result: true,
            Statebag: createStatebag(stepNumber),
            RecorderRecord: createSubJourneyRecord(subJourneyId),
        },
    },
];
