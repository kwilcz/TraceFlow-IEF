/**
 * Interpreters Module Index
 *
 * Re-exports all interpreters and provides convenience registration.
 */

// Base types and interfaces
export {
    BaseInterpreter,
    DefaultInterpreter,
    type IClipInterpreter,
    type InterpretContext,
    type InterpretResult,
} from "./base-interpreter";

// Registry
export {
    InterpreterRegistry,
    createInterpreterRegistry,
    registerInterpreters,
    type InterpreterRegistryOptions,
    type InterpreterRegistryStats,
} from "./interpreter-registry";

// Specific interpreters
export {
    OrchestrationInterpreter,
    createOrchestrationInterpreter,
} from "./orchestration.interpreter";

export {
    ClaimsExchangeInterpreter,
    createClaimsExchangeInterpreter,
} from "./claims-exchange.interpreter";

export {
    ClaimsTransformationInterpreter,
    createClaimsTransformationInterpreter,
} from "./claims-transformation.interpreter";

export {
    HomeRealmDiscoveryInterpreter,
    createHomeRealmDiscoveryInterpreter,
} from "./home-realm-discovery.interpreter";

export {
    SubJourneyInterpreter,
    createSubJourneyInterpreter,
} from "./subjourney.interpreter";

export {
    SelfAssertedRedirectInterpreter,
    createSelfAssertedRedirectInterpreter,
} from "./self-asserted-redirect.interpreter";

export {
    SelfAssertedValidationInterpreter,
    createSelfAssertedValidationInterpreter,
} from "./self-asserted-validation.interpreter";

export {
    SelfAssertedActionInterpreter,
    createSelfAssertedActionInterpreter,
} from "./self-asserted-action.interpreter";

export {
    StepInvokeInterpreter,
    createStepInvokeInterpreter,
} from "./step-invoke.interpreter";

export {
    JourneyCompletionInterpreter,
    createJourneyCompletionInterpreter,
} from "./journey-completion.interpreter";

export {
    ValidateApiResponseInterpreter,
    createValidateApiResponseInterpreter,
} from "./validate-api-response.interpreter";

export {
    BackendApiInterpreter,
    createBackendApiInterpreter,
} from "./backend-api.interpreter";

export {
    SsoSessionInterpreter,
    createSsoSessionInterpreter,
} from "./sso-session.interpreter";

export {
    UiSettingsInterpreter,
    createUiSettingsInterpreter,
} from "./ui-settings.interpreter";

export {
    ErrorHandlerInterpreter,
    createErrorHandlerInterpreter,
} from "./error-handler.interpreter";

export {
    DisplayControlInterpreter,
    createDisplayControlInterpreter,
} from "./display-control.interpreter";

// Factory functions array for bulk registration
import { createOrchestrationInterpreter } from "./orchestration.interpreter";
import { createClaimsExchangeInterpreter } from "./claims-exchange.interpreter";
import { createClaimsTransformationInterpreter } from "./claims-transformation.interpreter";
import { createHomeRealmDiscoveryInterpreter } from "./home-realm-discovery.interpreter";
import { createSubJourneyInterpreter } from "./subjourney.interpreter";
import { createSelfAssertedRedirectInterpreter } from "./self-asserted-redirect.interpreter";
import { createSelfAssertedValidationInterpreter } from "./self-asserted-validation.interpreter";
import { createSelfAssertedActionInterpreter } from "./self-asserted-action.interpreter";
import { createStepInvokeInterpreter } from "./step-invoke.interpreter";
import { createJourneyCompletionInterpreter } from "./journey-completion.interpreter";
import { createValidateApiResponseInterpreter } from "./validate-api-response.interpreter";
import { createBackendApiInterpreter } from "./backend-api.interpreter";
import { createSsoSessionInterpreter } from "./sso-session.interpreter";
import { createUiSettingsInterpreter } from "./ui-settings.interpreter";
import { createErrorHandlerInterpreter } from "./error-handler.interpreter";
import { createDisplayControlInterpreter } from "./display-control.interpreter";
import type { IClipInterpreter } from "./base-interpreter";

/**
 * Array of all interpreter factory functions.
 * Use with registerInterpreters() for bulk registration.
 */
const ALL_INTERPRETER_FACTORIES: Array<() => IClipInterpreter> = [
    createOrchestrationInterpreter,
    createStepInvokeInterpreter,
    createClaimsExchangeInterpreter,
    createClaimsTransformationInterpreter,
    createHomeRealmDiscoveryInterpreter,
    createSubJourneyInterpreter,
    createSelfAssertedRedirectInterpreter,
    createSelfAssertedValidationInterpreter,
    createSelfAssertedActionInterpreter,
    createJourneyCompletionInterpreter,
    createValidateApiResponseInterpreter,
    createBackendApiInterpreter,
    createSsoSessionInterpreter,
    createUiSettingsInterpreter,
    createErrorHandlerInterpreter,
    createDisplayControlInterpreter,
];

/**
 * Creates all interpreters and returns them as an array.
 */
function createAllInterpreters(): IClipInterpreter[] {
    return ALL_INTERPRETER_FACTORIES.map((factory) => factory());
}

import { InterpreterRegistry } from "./interpreter-registry";

/**
 * Gets the global interpreter registry with all interpreters registered.
 * This is the main entry point for using the interpreter system.
 */
export function getInterpreterRegistry(): InterpreterRegistry {
    const registry = InterpreterRegistry.getInstance();

    if (registry.getAll().length === 0) {
        registry.registerAll(createAllInterpreters());
    }

    return registry;
}
