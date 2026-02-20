/**
 * User Journey Trace Mode - Type Definitions
 *
 * Types for representing the linear execution trace of a B2C user journey.
 * This module provides types for stitching together multiple log segments
 * into a coherent timeline for visualization.
 */

/**
 * Result of a trace step execution.
 */
export type StepResult = "Success" | "Skipped" | "Error" | "PendingInput";

/**
 * Result of a user interaction (from Complex-API_RESULT).
 */
export type InteractionResult = "Continue" | "Cancelled" | "Error";

/**
 * Details about a claims transformation execution.
 */
export interface ClaimsTransformationDetail {
    /** The ID of the claims transformation */
    id: string;
    /** Input claims with their values */
    inputClaims: Array<{ claimType: string; value: string }>;
    /** Input parameters */
    inputParameters: Array<{ id: string; value: string }>;
    /** Output/result claims with their values */
    outputClaims: Array<{ claimType: string; value: string }>;
}

/**
 * Details about a technical profile execution including provider type.
 */
export interface TechnicalProfileDetail {
    /** The technical profile ID */
    id: string;
    /** The protocol provider type (e.g., AzureActiveDirectoryProvider, SelfAssertedAttributeProvider) */
    providerType: string;
    /** The protocol type (e.g., "backend protocol", "OpenIdConnect") */
    protocolType?: string;
    /** Claims transformations executed within this TP */
    claimsTransformations?: ClaimsTransformationDetail[];
    /** Claims snapshot taken AFTER this TP's handler was applied. */
    claimsSnapshot?: Record<string, string>;
}

/**
 * Details about a technical profile invoked within a display control action.
 * A single DC action can invoke multiple TPs in sequence.
 */
export interface DisplayControlTechnicalProfile {
    /** The technical profile ID */
    technicalProfileId: string;
    /** Claims transformations executed within this TP */
    claimsTransformations?: ClaimsTransformationDetail[];
    /** Claim mappings for this TP */
    claimMappings?: ClaimMapping[];
}

/**
 * Details about a display control action execution.
 * Extracted from SendDisplayControlActionResponseHandler.
 */
export interface DisplayControlAction {
    /** The display control ID (e.g., "captchaControlChallengeCode") */
    displayControlId: string;
    /** The action performed (e.g., "GetChallenge", "VerifyCode", "SendCode") */
    action: string;
    /** 
     * @deprecated Use technicalProfiles array instead for multiple TPs
     * The technical profile invoked by this action (kept for backward compatibility)
     */
    technicalProfileId?: string;
    /** All technical profiles invoked by this action (in execution order) */
    technicalProfiles?: DisplayControlTechnicalProfile[];
    /** HTTP result code if applicable */
    resultCode?: string;
    /** Claim mappings for this action */
    claimMappings?: ClaimMapping[];
}

/**
 * Mapping from external claims to policy claims.
 */
export interface ClaimMapping {
    /** The claim type from the external provider */
    partnerClaimType: string;
    /** The claim type in the policy */
    policyClaimType: string;
}

/**
 * UI settings extracted from ApiUiManagerInfo.
 */
export interface UiSettings {
    /** The language/locale code */
    language?: string;
    /** The page type (CombinedSigninAndSignup, SelfAsserted, etc.) */
    pageType?: string;
    /** The page view ID */
    pageId?: string;
    /** The content definition ID (from EID statebag) */
    contentDefinition?: string;
    /** Remote resource URL for custom UI template */
    remoteResource?: string;
    /** Input claims shown on self-asserted pages */
    inputClaims?: string[];
    /** Available identity providers in ClaimsProviderSelection */
    availableProviders?: string[];
    /** Error code from Complex-CLMS */
    errorCode?: string;
    /** Error message displayed */
    errorMessage?: string;
    /** HResult error code (hex string without 0x prefix) */
    errorHResult?: string;
    /** Display controls configuration */
    displayControls?: Array<{
        id: string;
        type: string;
        actions?: string[];
    }>;
    /** Page-specific configuration */
    config?: Record<string, string>;
    /** Tenant branding settings */
    tenantBranding?: {
        bannerLogoUrl?: string;
        backgroundColor?: string;
    };
    /** Display claims shown in the UI */
    displayClaims?: Array<{ claimTypeId: string; displayName: string }>;
    /** Buttons shown in the UI */
    buttons?: Array<{ id: string; displayName: string }>;
    /** Raw settings JSON */
    rawSettings?: string;
}

/**
 * Backend API call details extracted from PROT statebag.
 */
export interface BackendApiCall {
    /** The AAD request type (e.g., "User.Read") */
    requestType?: string;
    /** The request URI */
    requestUri?: string;
    /** Parsed response data */
    response?: Record<string, unknown>;
    /** Raw response string */
    rawResponse?: string;
}

/**
 * Represents a single step in the execution trace.
 * Steps form a linear timeline of the user's journey through the policy.
 */
export interface TraceStep {
    /** Global index (0, 1, 2...) ensuring linear order */
    sequenceNumber: number;

    /** The timestamp of this specific execution step */
    timestamp: Date;

    /**
     * The ID of the log entry that created this step.
     * Used for syncing the tree selection with the log viewer.
     */
    logId: string;

    /**
     * Duration in milliseconds from this step to the next step.
     * Undefined for the last step in the trace.
     */
    duration?: number;

    /**
     * The type of event that triggered this step.
     * - AUTH: Initial session setup (browser redirect to /authorize)
     * - API: Form POST / user interaction response
     * - SELFASSERTED: User submitted self-asserted form (local account sign-in)
     * - ClaimsExchange: Return from external IdP (OAuth/OIDC callback)
     */
    eventType: "AUTH" | "API" | "SELFASSERTED" | "ClaimsExchange";

    /**
     * The ID of the Node in ReactFlow this step corresponds to.
     * Calculated via: `${ParentJourneyId}-Step${Order}`
     */
    graphNodeId: string;

    /** The ID of the UserJourney or SubJourney currently executing */
    journeyContextId: string;

    /**
     * Human-readable name of the current journey context.
     * Shows the actual UserJourney or SubJourney name being executed.
     */
    currentJourneyName: string;

    /** The Orchestration Step Number (ORCH_CS) */
    stepOrder: number;

    /** Result of this step */
    result: StepResult;

    /**
     * Snapshot of the statebag *after* this step completed.
     * Vital for the "Time Travel" debugging feature.
     */
    statebagSnapshot: Record<string, string>;

    /** Claims snapshot after this step (from Complex-CLMS) */
    claimsSnapshot: Record<string, string>;

    /** Any error message if failed */
    errorMessage?: string;

    /** HResult error code (hex string without 0x prefix) */
    errorHResult?: string;

    /** Technical profiles invoked in this step */
    technicalProfiles: string[];

    /**
     * Selectable options for interactive steps (HRD/CombinedSignInAndSignUp).
     * These are NOT invoked profiles - they are choices the user can select.
     */
    selectableOptions: string[];

    /**
     * Whether this is an interactive step requiring user input.
     * True for CombinedSignInAndSignUp, HRD, and similar UI-driven steps.
     */
    isInteractiveStep: boolean;

    /** Claims transformations executed */
    claimsTransformations: string[];

    /** Detailed information about claims transformations (how claims were calculated) */
    claimsTransformationDetails: ClaimsTransformationDetail[];

    /** Display controls used (IDs only) */
    displayControls: string[];

    /** Detailed display control actions with TP and action info */
    displayControlActions: DisplayControlAction[];

    /** The action handler that executed this step */
    actionHandler?: string;

    /** Predicate result if applicable */
    predicateResult?: string;

    // =========================================================================
    // ADVANCED FIELDS (for detailed trace analysis)
    // =========================================================================

    /**
     * The SubJourney ID if this step invoked a SubJourney.
     * Populated when EnqueueNewJourneyHandler fires with SubJourneyInvoked.
     */
    subJourneyId?: string;

    /**
     * Validation technical profiles invoked in self-asserted forms.
     * These TPs validate user input before proceeding.
     */
    validationTechnicalProfiles?: string[];

    /**
     * Claim mappings from validation technical profiles.
     * Maps external provider claims to policy claims.
     */
    claimMappings?: ClaimMapping[];

    /**
     * Detailed technical profile information including provider type.
     * Provides more context than the simple technicalProfiles string array.
     */
    technicalProfileDetails?: TechnicalProfileDetail[];

    /**
     * UI settings from ApiUiManagerInfo.
     * Contains language, display claims, and button configurations.
     */
    uiSettings?: UiSettings;

    /**
     * Backend API calls made during this step (from PROT statebag).
     * Includes AAD Graph API and other backend calls.
     */
    backendApiCalls?: BackendApiCall[];

    /**
     * Claims submitted by the user from SAA-Claims JWT.
     * Contains decoded claims from self-asserted form submissions.
     */
    submittedClaims?: Record<string, string>;

    /**
     * Result of user interaction from Complex-API_RESULT.
     * Indicates whether user continued, cancelled, or encountered an error.
     */
    interactionResult?: InteractionResult;

    /**
     * Whether this is a verification step (OTP, email verification).
     * True when IsClaimVerificationRequestHandler predicate matches.
     */
    isVerificationStep?: boolean;

    /**
     * Whether this step has a verification context (C2CVER in ComplexItems).
     * Indicates OTP verification is active.
     */
    hasVerificationContext?: boolean;

    /**
     * Whether this is the final step (SendRelyingPartyResponseHandler).
     * Indicates journey completion with token issuance.
     */
    isFinalStep?: boolean;

    /**
     * The transition event name (e.g., "ClaimsExchange", "SendClaims").
     * From Transition clips in the log.
     */
    transitionEvent?: string;

    /**
     * The option selected by the user in an interactive step.
     * For HRD/CombinedSignInAndSignUp, this is the TP the user clicked.
     */
    selectedOption?: string;

    /**
     * Previous technical profile from S_CTP statebag.
     * Useful for tracking the previous step's TP.
     */
    previousTechnicalProfile?: string;

    /**
     * Whether SSO session participation was detected.
     * True when IsSSOSessionParticipantHandler predicate matches.
     */
    ssoSessionParticipant?: boolean;

    /**
     * Whether SSO session was activated in this step.
     * True when ActivateSSOSessionHandler action executed.
     */
    ssoSessionActivated?: boolean;
}

/**
 * Status information for a node in the execution map.
 */
export interface NodeExecutionStatus {
    /** The latest status of this node in the trace */
    status: StepResult;
    /** Number of times this node was visited (useful for loops) */
    visitCount: number;
    /** References to trace steps array indices */
    stepIndices: number[];
}

/**
 * Map of node IDs to their execution status.
 */
export interface TraceExecutionMap {
    [nodeId: string]: NodeExecutionStatus;
}

/**
 * Context for tracking journey stack during parsing.
 */
export interface JourneyContext {
    /** The journey ID (UserJourney or SubJourney) */
    journeyId: string;
    /** Human-readable name of the journey */
    journeyName: string;
    /** The last seen ORCH_CS in this context */
    lastOrchStep: number;
    /** The entry timestamp */
    entryTimestamp: Date;
}

/**
 * Represents a distinct user flow instance.
 * A flow is identified by correlationId and bounded by step 0 occurrences.
 * Multiple flows can share the same correlationId if the journey restarts.
 */
export interface UserFlow {
    /** Unique identifier for this flow instance */
    id: string;
    /** Correlation ID from Application Insights */
    correlationId: string;
    /** The main policy ID for this flow */
    policyId: string;
    /** Timestamp when this flow started */
    startTime: Date;
    /** Timestamp of the last activity in this flow */
    endTime: Date;
    /** Number of steps executed in this flow */
    stepCount: number;
    /** Whether the flow completed successfully */
    completed: boolean;
    /** Whether the flow had errors */
    hasErrors: boolean;
    /** Whether the flow was cancelled by the user */
    cancelled: boolean;
    /** SubJourneys invoked during this flow */
    subJourneys: string[];
    /** All log record IDs that belong to this flow */
    logIds: string[];
    /** User's sign-in email from Complex-CLMS signInName claim */
    userEmail?: string;
    /** User's AAD object ID from Complex-CLMS objectId claim */
    userObjectId?: string;
}

/**
 * Input for trace parsing - a log record with its clips.
 */
export interface TraceLogInput {
    /** Unique identifier for the log record */
    id: string;
    /** Timestamp of the log record */
    timestamp: Date;
    /** Policy ID from the log */
    policyId: string;
    /** Correlation ID for tracking */
    correlationId: string;
    /** The parsed clips array */
    clips: import("./journey-recorder").ClipsArray;
}

/**
 * Result of trace parsing.
 */
export interface TraceParseResult {
    /** Linear array of trace steps */
    traceSteps: TraceStep[];
    /** Map of node IDs to execution status */
    executionMap: TraceExecutionMap;
    /** The main journey ID */
    mainJourneyId: string;
    /** Whether parsing was successful */
    success: boolean;
    /** Any parsing errors */
    errors: string[];
    /** The final statebag state */
    finalStatebag: Record<string, string>;
    /** The final claims state */
    finalClaims: Record<string, string>;
}

/**
 * Changes in claims between steps.
 */
export interface ClaimsDiff {
    added: Record<string, string>;
    modified: Record<string, { oldValue: string; newValue: string }>;
    removed: string[];
}

/**
 * Helper to compute diff between two claim snapshots.
 */
export function computeClaimsDiff(
    before: Record<string, string>,
    after: Record<string, string>
): ClaimsDiff {
    const diff: ClaimsDiff = {
        added: {},
        modified: {},
        removed: [],
    };

    // Find added and modified
    for (const [key, value] of Object.entries(after)) {
        if (!(key in before)) {
            diff.added[key] = value;
        } else if (before[key] !== value) {
            diff.modified[key] = { oldValue: before[key], newValue: value };
        }
    }

    // Find removed
    for (const key of Object.keys(before)) {
        if (!(key in after)) {
            diff.removed.push(key);
        }
    }

    return diff;
}
