/**
 * Log Fixtures
 *
 * Test fixtures for complete log records used in trace parsing tests.
 */

import type { TraceLogInput } from "@/types/trace";
import type { ClipsArray } from "@/types/journey-recorder";
import {
    createHeadersClip,
    createTransitionClip,
    createOrchestrationSequence,
    createClaimsExchangeSequence,
    createSelfAssertedSequence,
    createHrdSequence,
    createSubJourneyDispatchSequence,
    createFatalExceptionClip,
} from "./clip.fixtures";

// =============================================================================
// RANDOM DATA GENERATORS
// =============================================================================

/** Generate a randomized policy ID */
const generatePolicyId = () => `B2C_1A_TEST_SignUpOrSignIn_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

/** Generate a randomized technical profile ID */
const generateTpId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

/** Generate a randomized email */
const generateEmail = () => `user-${Math.random().toString(36).slice(2, 8)}@test-domain.example`;

// Default policy ID for this module
const defaultPolicyId = generatePolicyId();

// =============================================================================
// LOG INPUT FACTORY
// =============================================================================

/**
 * Creates a TraceLogInput with the given clips.
 */
export const createLogInput = (
    clips: ClipsArray,
    overrides: Partial<Omit<TraceLogInput, "clips">> = {}
): TraceLogInput => ({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date(),
    policyId: defaultPolicyId,
    correlationId: "test-correlation-id",
    clips,
    ...overrides,
});

// =============================================================================
// SINGLE EVENT LOG FIXTURES
// =============================================================================

/**
 * Creates a minimal AUTH event log.
 */
export const createAuthEventLog = (
    journeyId = "SignUpOrSignIn"
): TraceLogInput =>
    createLogInput([
        createHeadersClip({ PolicyId: `B2C_1A_${journeyId}` }),
        createTransitionClip("AUTH", "Initial"),
        ...createOrchestrationSequence(1),
    ]);

/**
 * Creates a claims exchange event log.
 */
export const createClaimsExchangeLog = (
    technicalProfileId: string,
    stepNumber: number
): TraceLogInput =>
    createLogInput([
        createHeadersClip(),
        createTransitionClip("ClaimsExchange", "AwaitingNextStep"),
        ...createClaimsExchangeSequence(technicalProfileId, stepNumber),
    ]);

/**
 * Creates a self-asserted form submission log.
 */
export const createSelfAssertedLog = (
    technicalProfileId: string,
    stepNumber: number,
    claims: Record<string, string> = {}
): TraceLogInput =>
    createLogInput([
        createHeadersClip(),
        createTransitionClip("API", "AwaitingNextStep"),
        ...createSelfAssertedSequence(technicalProfileId, stepNumber, claims),
    ]);

/**
 * Creates an HRD selection log.
 */
export const createHrdLog = (
    enabledProviders: string[],
    stepNumber: number
): TraceLogInput =>
    createLogInput([
        createHeadersClip(),
        createTransitionClip("AUTH", "AwaitingNextStep"),
        ...createHrdSequence(enabledProviders, stepNumber),
    ]);

/**
 * Creates a SubJourney dispatch log.
 */
export const createSubJourneyDispatchLog = (
    subJourneyId: string,
    stepNumber: number
): TraceLogInput =>
    createLogInput([
        createHeadersClip(),
        createTransitionClip("PreStep", "AwaitingNextStep"),
        ...createSubJourneyDispatchSequence(subJourneyId, stepNumber),
    ]);

/**
 * Creates an error log.
 */
export const createErrorLog = (errorMessage: string): TraceLogInput =>
    createLogInput([
        createHeadersClip(),
        createTransitionClip("AUTH", "Error"),
        createFatalExceptionClip(errorMessage),
    ]);

// =============================================================================
// MULTI-STEP LOG FIXTURES
// =============================================================================

/**
 * Creates a sequence of logs representing a complete simple journey.
 */
export const createSimpleJourneyLogs = (): TraceLogInput[] => [
    createAuthEventLog(),
    createSelfAssertedLog(
        generateTpId("SelfAsserted-SignIn"),
        2,
        { email: generateEmail() }
    ),
    createClaimsExchangeLog(generateTpId("AAD-Common"), 3),
];

/**
 * Creates logs with HRD (identity provider selection).
 */
export const createHrdJourneyLogs = (): TraceLogInput[] => [
    createAuthEventLog(),
    createHrdLog(
        [generateTpId("Social-OAuth-1"), generateTpId("Social-OAuth-2"), generateTpId("SelfAsserted-Local")],
        1
    ),
    createClaimsExchangeLog(generateTpId("Social-OAuth"), 2),
    createClaimsExchangeLog(generateTpId("AAD-Common"), 3),
];

/**
 * Creates logs with SubJourney invocation.
 */
export const createSubJourneyLogs = (): TraceLogInput[] => [
    createAuthEventLog(),
    createSubJourneyDispatchLog("PasswordReset", 2),
    createSelfAssertedLog(
        generateTpId("LocalAccount-Discovery"),
        1,
        { email: generateEmail() }
    ),
    createClaimsExchangeLog(generateTpId("AAD-WritePassword"), 2),
];

/**
 * Creates logs ending in an error.
 */
export const createErrorJourneyLogs = (): TraceLogInput[] => [
    createAuthEventLog(),
    createSelfAssertedLog(
        generateTpId("SelfAsserted-SignIn"),
        2,
        { email: "invalid" }
    ),
    createErrorLog("The email claim is invalid."),
];

// =============================================================================
// EDGE CASE FIXTURES
// =============================================================================

/**
 * Creates an empty log (no clips).
 */
export const createEmptyLog = (): TraceLogInput =>
    createLogInput([]);

/**
 * Creates a log with only headers.
 */
export const createHeadersOnlyLog = (): TraceLogInput =>
    createLogInput([createHeadersClip()]);

/**
 * Creates a log with multiple orchestration steps.
 */
export const createMultiStepLog = (stepCount: number): TraceLogInput => {
    const clips: ClipsArray = [
        createHeadersClip(),
        createTransitionClip("AUTH", "Initial"),
    ];

    for (let i = 1; i <= stepCount; i++) {
        clips.push(...createOrchestrationSequence(i));
    }

    return createLogInput(clips);
};

/**
 * Creates logs for a journey restart scenario.
 */
export const createRestartedJourneyLogs = (): TraceLogInput[][] => [
    [
        createAuthEventLog(),
        createErrorLog("User cancelled"),
    ],
    [
        createAuthEventLog(),
        createSelfAssertedLog(
            "SelfAsserted-LocalAccountSignin-Email",
            2,
            { email: "user@example.com" }
        ),
    ],
];
