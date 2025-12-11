/**
 * Scenario Fixtures
 *
 * Test fixtures representing complete end-to-end user journey scenarios.
 * These are high-level fixtures for integration tests.
 */

import type { TraceLogInput } from "@/types/trace";
import {
    createSimpleJourneyLogs,
    createHrdJourneyLogs,
    createSubJourneyLogs,
    createErrorJourneyLogs,
} from "./log.fixtures";

// =============================================================================
// SCENARIO TYPES
// =============================================================================

/**
 * A complete test scenario with logs and expected outcomes.
 */
export interface TestScenario {
    /** Human-readable name for the scenario */
    name: string;

    /** Description of what the scenario tests */
    description: string;

    /** The logs that make up this scenario */
    logs: TraceLogInput[];

    /** Expected number of trace steps */
    expectedStepCount: number;

    /** Expected main journey ID */
    expectedJourneyId: string;

    /** SubJourneys expected to be invoked */
    expectedSubJourneys: string[];

    /** Whether the scenario should complete successfully */
    expectSuccess: boolean;

    /** Whether errors are expected */
    expectErrors: boolean;

    /** Expected technical profiles invoked */
    expectedTechnicalProfiles: string[];

    /** Additional assertions to run */
    assertions?: (result: unknown) => void;
}

// =============================================================================
// SCENARIO FIXTURES
// =============================================================================

/**
 * Simple local account sign-in scenario.
 */
// Generate randomized technical profile names
const randomSuffix = Math.random().toString(36).slice(2, 8);
const testTechnicalProfiles = {
    selfAssertedSignIn: `SelfAsserted-SignIn-${randomSuffix}`,
    aadCommon: `AAD-Common-${randomSuffix}`,
    socialOAuth: `Social-OAuth-${randomSuffix}`,
    localAccountDiscovery: `LocalAccount-Discovery-${randomSuffix}`,
    passwordWrite: `AAD-WritePassword-${randomSuffix}`,
};

export const localAccountSignInScenario: TestScenario = {
    name: "Local Account Sign-In",
    description: "User signs in with email and password",
    logs: createSimpleJourneyLogs(),
    expectedStepCount: 3,
    expectedJourneyId: "SignUpOrSignIn",
    expectedSubJourneys: [],
    expectSuccess: true,
    expectErrors: false,
    expectedTechnicalProfiles: [
        testTechnicalProfiles.selfAssertedSignIn,
        testTechnicalProfiles.aadCommon,
    ],
};

/**
 * Social sign-in with HRD scenario.
 */
export const socialSignInWithHrdScenario: TestScenario = {
    name: "Social Sign-In with HRD",
    description: "User selects a social identity provider from list",
    logs: createHrdJourneyLogs(),
    expectedStepCount: 3,
    expectedJourneyId: "SignUpOrSignIn",
    expectedSubJourneys: [],
    expectSuccess: true,
    expectErrors: false,
    expectedTechnicalProfiles: [testTechnicalProfiles.socialOAuth, testTechnicalProfiles.aadCommon],
};

/**
 * Password reset via SubJourney scenario.
 */
export const passwordResetScenario: TestScenario = {
    name: "Password Reset SubJourney",
    description: "User invokes password reset SubJourney",
    logs: createSubJourneyLogs(),
    expectedStepCount: 3,
    expectedJourneyId: "SignUpOrSignIn",
    expectedSubJourneys: ["PasswordReset"],
    expectSuccess: true,
    expectErrors: false,
    expectedTechnicalProfiles: [
        testTechnicalProfiles.localAccountDiscovery,
        testTechnicalProfiles.passwordWrite,
    ],
};

/**
 * Failed sign-in scenario.
 */
export const failedSignInScenario: TestScenario = {
    name: "Failed Sign-In",
    description: "User enters invalid email and journey fails",
    logs: createErrorJourneyLogs(),
    expectedStepCount: 2,
    expectedJourneyId: "SignUpOrSignIn",
    expectedSubJourneys: [],
    expectSuccess: false,
    expectErrors: true,
    expectedTechnicalProfiles: [testTechnicalProfiles.selfAssertedSignIn],
};

// =============================================================================
// SCENARIO COLLECTIONS
// =============================================================================

/**
 * All happy path scenarios.
 */
export const happyPathScenarios: TestScenario[] = [
    localAccountSignInScenario,
    socialSignInWithHrdScenario,
    passwordResetScenario,
];

/**
 * All error scenarios.
 */
export const errorScenarios: TestScenario[] = [failedSignInScenario];

/**
 * All scenarios.
 */
export const allScenarios: TestScenario[] = [
    ...happyPathScenarios,
    ...errorScenarios,
];

// =============================================================================
// SCENARIO HELPERS
// =============================================================================

/**
 * Gets a scenario by name.
 */
export function getScenarioByName(name: string): TestScenario | undefined {
    return allScenarios.find((s) => s.name === name);
}

/**
 * Runs assertions for a scenario.
 */
export function assertScenario(
    scenario: TestScenario,
    result: {
        traceSteps: unknown[];
        mainJourneyId: string;
        success: boolean;
        errors: string[];
    }
): void {
    if (result.traceSteps.length !== scenario.expectedStepCount) {
        throw new Error(
            `Expected ${scenario.expectedStepCount} steps, got ${result.traceSteps.length}`
        );
    }

    if (result.mainJourneyId !== scenario.expectedJourneyId) {
        throw new Error(
            `Expected journey ${scenario.expectedJourneyId}, got ${result.mainJourneyId}`
        );
    }

    if (result.success !== scenario.expectSuccess) {
        throw new Error(
            `Expected success=${scenario.expectSuccess}, got ${result.success}`
        );
    }

    if (scenario.expectErrors && result.errors.length === 0) {
        throw new Error("Expected errors but got none");
    }

    if (!scenario.expectErrors && result.errors.length > 0) {
        throw new Error(`Expected no errors but got: ${result.errors.join(", ")}`);
    }

    scenario.assertions?.(result);
}
