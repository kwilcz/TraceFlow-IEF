/**
 * B2C Handler Constants
 *
 * Centralized registry of all Azure AD B2C state machine handler names.
 * These are the fully qualified .NET class names used internally by B2C.
 *
 * Handler Naming Convention:
 * - `Web.TPEngine.StateMachineHandlers.*` - Core state machine operations
 * - `Web.TPEngine.SSO.*` - Single Sign-On related handlers
 * - `Web.TPEngine.Api.*` - API/UI related handlers
 */

// ============================================================================
// ORCHESTRATION HANDLERS
// ============================================================================

/** Main orchestrator - signals step transitions */
export const ORCHESTRATION_MANAGER = "Web.TPEngine.OrchestrationManager";

/** Determines if an orchestration step should be invoked */
export const SHOULD_STEP_BE_INVOKED = "Web.TPEngine.StateMachineHandlers.ShouldOrchestrationStepBeInvokedHandler";

// ============================================================================
// CLAIMS EXCHANGE PROTOCOL HANDLERS
// ============================================================================

/** Backend service calls (Azure AD, REST APIs) */
export const CLAIMS_EXCHANGE_SERVICE_CALL = "Web.TPEngine.StateMachineHandlers.IsClaimsExchangeProtocolAServiceCallHandler";

/** External IdP redirections (OAuth, OIDC, SAML) */
export const CLAIMS_EXCHANGE_REDIRECTION = "Web.TPEngine.StateMachineHandlers.IsClaimsExchangeProtocolARedirectionHandler";

/** API-based claims exchange */
export const CLAIMS_EXCHANGE_API = "Web.TPEngine.StateMachineHandlers.IsClaimsExchangeProtocolAnApiHandler";

/** Checks if claims exchange is complete */
export const CLAIMS_EXCHANGE_COMPLETE = "Web.TPEngine.StateMachineHandlers.IsClaimsExchangeComplete";

// ============================================================================
// CLAIMS TRANSFORMATION HANDLERS
// ============================================================================

/** Input claims transformation before step execution */
export const INPUT_CLAIMS_TRANSFORMATION = "Web.TPEngine.StateMachineHandlers.InputClaimsTransformationHandler";

/** Output claims transformation after step execution */
export const OUTPUT_CLAIMS_TRANSFORMATION = "Web.TPEngine.StateMachineHandlers.OutputClaimsTransformationHandler";

/** Persisted claims transformation for storage */
export const PERSISTED_CLAIMS_TRANSFORMATION = "Web.TPEngine.StateMachineHandlers.PersistedClaimsTransformationHandler";

/** Client-side input claims transformation */
export const CLIENT_INPUT_CLAIMS_TRANSFORMATION = "Web.TPEngine.StateMachineHandlers.ClientInputClaimsTransformationHandler";

// ============================================================================
// HOME REALM DISCOVERY HANDLERS
// ============================================================================

/** Home realm discovery for combined sign-in/sign-up steps */
export const HOME_REALM_DISCOVERY = "Web.TPEngine.StateMachineHandlers.HomeRealmDiscoveryHandler";

// ============================================================================
// SELF-ASSERTED/UI HANDLERS
// ============================================================================

/** Validates user input from self-asserted pages */
export const SELF_ASSERTED_VALIDATION = "Web.TPEngine.StateMachineHandlers.SelfAssertedMessageValidationHandler";

/** Combined sign-in/sign-up API load */
export const SIGNIN_SIGNUP_API_LOAD = "Web.TPEngine.StateMachineHandlers.SigninSignUpApiLoadHandler";

/** Converts claims to attribute fields for UI display */
export const CONVERT_TO_ATTRIBUTE_FIELD = "Web.TPEngine.StateMachineHandlers.ConvertToAttributeFieldHandler";

/** Display control action request detection (predicate) */
export const DISPLAY_CONTROL_ACTION_REQUEST = "Web.TPEngine.StateMachineHandlers.IsDisplayControlActionRequestHandler";

/** Display control action response handler (action) */
export const DISPLAY_CONTROL_ACTION_RESPONSE = "Web.TPEngine.StateMachineHandlers.SendDisplayControlActionResponseHandler";

/** Display control handlers collection */
export const DISPLAY_CONTROL_HANDLERS = [
    DISPLAY_CONTROL_ACTION_REQUEST,
    DISPLAY_CONTROL_ACTION_RESPONSE,
] as const;

/** Claim verification request detection */
export const CLAIM_VERIFICATION_REQUEST = "Web.TPEngine.StateMachineHandlers.IsClaimVerificationRequestHandler";

/** API UI manager */
export const API_UI_MANAGER = "Web.TPEngine.Api.ApiUIManager";

// ============================================================================
// JOURNEY CONTROL HANDLERS
// ============================================================================

/** Enqueues a new SubJourney */
export const ENQUEUE_NEW_JOURNEY = "Web.TPEngine.StateMachineHandlers.EnqueueNewJourneyHandler";

/** Handles journey restart */
export const JOURNEY_RESTART = "Web.TPEngine.StateMachineHandlers.JourneyRestartHandler";

/** Sends claims to relying party */
export const SEND_CLAIMS = "Web.TPEngine.StateMachineHandlers.SendClaimsHandler";

/** Sends claims action handler */
export const SEND_CLAIMS_ACTION = "Web.TPEngine.StateMachineHandlers.SendClaimsActionHandler";

/** Sends relying party response */
export const SEND_RP_RESPONSE = "Web.TPEngine.StateMachineHandlers.SendRelyingPartyResponseHandler";

/** General response handler */
export const SEND_RESPONSE = "Web.TPEngine.StateMachineHandlers.SendResponseHandler";

/** Token generation for presentation */
export const PRESENTATION_TOKEN = "Web.TPEngine.StateMachineHandlers.PresentationTokenGenerationHandler";

// ============================================================================
// VALIDATION HANDLERS
// ============================================================================

/** Validates initiating message (request) */
export const INITIATING_MESSAGE_VALIDATION = "Web.TPEngine.StateMachineHandlers.InitiatingMessageValidationHandler";

/** CSRF validation */
export const CSRF_VALIDATION = "Web.TPEngine.StateMachineHandlers.CrossSiteRequestForgeryValidationHandler";

/** API response validation */
export const VALIDATE_API_RESPONSE = "Web.TPEngine.StateMachineHandlers.ValidateApiResponseHandler";

// ============================================================================
// SSO HANDLERS
// ============================================================================

/** Resets SSO session */
export const SSO_RESET = "Web.TPEngine.SSO.ResetSSOSessionHandler";

/** Checks if SSO session participant */
export const SSO_PARTICIPANT = "Web.TPEngine.SSO.IsSSOSessionParticipantHandler";

/** General SSO session handler */
export const SSO_SESSION = "Web.TPEngine.SSO.SSOSessionHandler";

/** Activates SSO session */
export const SSO_ACTIVATE = "Web.TPEngine.SSO.ActivateSSOSessionHandler";

// ============================================================================
// SETUP/INFRASTRUCTURE HANDLERS
// ============================================================================

/** Pre-setup handler (runs at start) */
export const PRE_SETUP = "Web.TPEngine.StateMachineHandlers.PreSetupHandler";

/** No-op placeholder handler */
export const NO_OP = "Web.TPEngine.StateMachineHandlers.NoOpHandler";

/** Request input parameter generation */
export const GENERATE_REQUEST_INPUT = "Web.TPEngine.StateMachineHandlers.GenerateRequestInputParamsHandler";

/** Protocol to API switch */
export const SWITCH_PROTOCOL_TO_API = "Web.TPEngine.StateMachineHandlers.SwitchFromProtocolToApiHandler";

/** Transaction end handler */
export const TRANSACTION_END = "Web.TPEngine.StateMachineHandlers.TransactionEndHandler";

/** Logout request detection */
export const LOGOUT_REQUEST = "Web.TPEngine.StateMachineHandlers.IsLogoutRequestHandler";

/** Custom refresh token redemption */
export const CUSTOM_REFRESH_TOKEN = "Web.TPEngine.StateMachineHandlers.IsClaimsExchangeCustomRefreshTokenRedemptionHandler";

// ============================================================================
// ACTION HANDLER ALIASES (for interpreter use)
// ============================================================================

/** ClaimsExchange action handler */
export const CLAIMS_EXCHANGE_ACTION = "Web.TPEngine.StateMachineHandlers.ClaimsExchangeActionHandler";

/** ClaimsExchange redirect handler */
export const CLAIMS_EXCHANGE_REDIRECT = "Web.TPEngine.StateMachineHandlers.ClaimsExchangeRedirectHandler";

/** ClaimsExchange submit handler (return from IdP) */
export const CLAIMS_EXCHANGE_SUBMIT = "Web.TPEngine.StateMachineHandlers.ClaimsExchangeSubmitHandler";

/** ClaimsExchange select handler (provider selection) */
export const CLAIMS_EXCHANGE_SELECT = "Web.TPEngine.StateMachineHandlers.ClaimsExchangeSelectHandler";

/** Claims transformation action handler */
export const CLAIMS_TRANSFORMATION_ACTION = "Web.TPEngine.StateMachineHandlers.ClaimsTransformationActionHandler";

/** Home realm discovery action handler */
export const HOME_REALM_DISCOVERY_ACTION = "Web.TPEngine.StateMachineHandlers.HomeRealmDiscoveryActionHandler";

/** Self-asserted action handler */
export const SELF_ASSERTED_ACTION = "Web.TPEngine.StateMachineHandlers.SelfAssertedAttributeProviderActionHandler";

/** Self-asserted redirect handler */
export const SELF_ASSERTED_REDIRECT = "Web.TPEngine.StateMachineHandlers.SelfAssertedAttributeProviderRedirectHandler";

/** SubJourney dispatch handler */
export const SUBJOURNEY_DISPATCH = "Web.TPEngine.StateMachineHandlers.SubJourneyDispatchActionHandler";

/** SubJourney transfer handler */
export const SUBJOURNEY_TRANSFER = "Web.TPEngine.StateMachineHandlers.SubJourneyTransferActionHandler";

/** SubJourney exit handler */
export const SUBJOURNEY_EXIT = "Web.TPEngine.StateMachineHandlers.SubJourneyExitActionHandler";

// ============================================================================
// HANDLER GROUPS - For categorization and filtering
// ============================================================================

/** All claims transformation handlers */
export const CLAIMS_TRANSFORMATION_HANDLERS = [
    INPUT_CLAIMS_TRANSFORMATION,
    OUTPUT_CLAIMS_TRANSFORMATION,
    PERSISTED_CLAIMS_TRANSFORMATION,
    CLIENT_INPUT_CLAIMS_TRANSFORMATION,
    CLAIMS_TRANSFORMATION_ACTION,
] as const;

/** All claims exchange protocol handlers (predicates/checks) */
export const CLAIMS_EXCHANGE_PROTOCOL_HANDLERS = [
    CLAIMS_EXCHANGE_SERVICE_CALL,
    CLAIMS_EXCHANGE_REDIRECTION,
    CLAIMS_EXCHANGE_API,
] as const;

/** All claims exchange action handlers */
export const CLAIMS_EXCHANGE_HANDLERS = [
    CLAIMS_EXCHANGE_ACTION,
    CLAIMS_EXCHANGE_REDIRECT,
    CLAIMS_EXCHANGE_SUBMIT,
    CLAIMS_EXCHANGE_SELECT,
] as const;

/** All HRD-related handlers */
export const HRD_HANDLERS = [
    HOME_REALM_DISCOVERY,
    HOME_REALM_DISCOVERY_ACTION,
] as const;

/** All self-asserted handlers */
export const SELF_ASSERTED_HANDLERS = [
    SELF_ASSERTED_VALIDATION,
    SELF_ASSERTED_ACTION,
    SELF_ASSERTED_REDIRECT,
] as const;

/** All SubJourney handlers */
export const SUBJOURNEY_HANDLERS = [
    ENQUEUE_NEW_JOURNEY,
    SUBJOURNEY_DISPATCH,
    SUBJOURNEY_TRANSFER,
    SUBJOURNEY_EXIT,
] as const;

/** All SSO-related handlers */
export const SSO_HANDLERS = [
    SSO_RESET,
    SSO_PARTICIPANT,
    SSO_SESSION,
    SSO_ACTIVATE,
] as const;

/** Handlers that indicate step completion */
export const STEP_COMPLETION_HANDLERS = [
    SEND_CLAIMS,
    SEND_CLAIMS_ACTION,
    SEND_RP_RESPONSE,
    SEND_RESPONSE,
] as const;

// ============================================================================
// TYPE HELPERS
// ============================================================================

/** Type for all known handler names */
export type HandlerName = 
    | typeof ORCHESTRATION_MANAGER
    | typeof SHOULD_STEP_BE_INVOKED
    | typeof CLAIMS_EXCHANGE_SERVICE_CALL
    | typeof CLAIMS_EXCHANGE_REDIRECTION
    | typeof CLAIMS_EXCHANGE_API
    | typeof CLAIMS_EXCHANGE_COMPLETE
    | typeof CLAIMS_EXCHANGE_ACTION
    | typeof CLAIMS_EXCHANGE_REDIRECT
    | typeof CLAIMS_EXCHANGE_SUBMIT
    | typeof CLAIMS_EXCHANGE_SELECT
    | typeof INPUT_CLAIMS_TRANSFORMATION
    | typeof OUTPUT_CLAIMS_TRANSFORMATION
    | typeof PERSISTED_CLAIMS_TRANSFORMATION
    | typeof CLIENT_INPUT_CLAIMS_TRANSFORMATION
    | typeof CLAIMS_TRANSFORMATION_ACTION
    | typeof HOME_REALM_DISCOVERY
    | typeof HOME_REALM_DISCOVERY_ACTION
    | typeof SELF_ASSERTED_VALIDATION
    | typeof SELF_ASSERTED_ACTION
    | typeof SELF_ASSERTED_REDIRECT
    | typeof SIGNIN_SIGNUP_API_LOAD
    | typeof CONVERT_TO_ATTRIBUTE_FIELD
    | typeof DISPLAY_CONTROL_ACTION_REQUEST
    | typeof DISPLAY_CONTROL_ACTION_RESPONSE
    | typeof CLAIM_VERIFICATION_REQUEST
    | typeof API_UI_MANAGER
    | typeof ENQUEUE_NEW_JOURNEY
    | typeof SUBJOURNEY_DISPATCH
    | typeof SUBJOURNEY_TRANSFER
    | typeof SUBJOURNEY_EXIT
    | typeof JOURNEY_RESTART
    | typeof SEND_CLAIMS
    | typeof SEND_CLAIMS_ACTION
    | typeof SEND_RP_RESPONSE
    | typeof SEND_RESPONSE
    | typeof PRESENTATION_TOKEN
    | typeof INITIATING_MESSAGE_VALIDATION
    | typeof CSRF_VALIDATION
    | typeof VALIDATE_API_RESPONSE
    | typeof SSO_RESET
    | typeof SSO_PARTICIPANT
    | typeof SSO_SESSION
    | typeof SSO_ACTIVATE
    | typeof PRE_SETUP
    | typeof NO_OP
    | typeof GENERATE_REQUEST_INPUT
    | typeof SWITCH_PROTOCOL_TO_API
    | typeof TRANSACTION_END
    | typeof LOGOUT_REQUEST
    | typeof CUSTOM_REFRESH_TOKEN;

/**
 * Check if a handler is a claims transformation handler.
 */
export function isClaimsTransformationHandler(handler: string): boolean {
    return (CLAIMS_TRANSFORMATION_HANDLERS as readonly string[]).includes(handler);
}

/**
 * Check if a handler is a claims exchange protocol handler.
 */
export function isClaimsExchangeHandler(handler: string): boolean {
    return (CLAIMS_EXCHANGE_HANDLERS as readonly string[]).includes(handler);
}

/**
 * Check if a handler indicates step/journey completion.
 */
export function isStepCompletionHandler(handler: string): boolean {
    return (STEP_COMPLETION_HANDLERS as readonly string[]).includes(handler);
}
