/**
 * User Journey Trace Mode - Type Definitions
 *
 * Types for representing the linear execution trace of a B2C user journey.
 * This module provides types for stitching together multiple log segments
 * into a coherent timeline for visualization.
 */

import type { FlowNode } from "./flow-node";

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
 * Information about a session boundary detected during parsing.
 * Multiple sessions can exist within a single flow when the user
 * navigates back with the browser, causing B2C to start a new
 * authentication session with the same correlationId.
 */
export interface SessionInfo {
    /** Zero-based session index */
    sessionIndex: number;
    /** When this session started (timestamp of the first Event:AUTH log) */
    startTimestamp: Date;
    /** Number of trace steps produced by this session */
    stepCount: number;
}

/**
 * Result of trace parsing.
 */
export interface TraceParseResult {
    /** Hierarchical flow tree built during pipeline processing */
    flowTree: FlowNode;
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
    /** Session boundaries detected during parsing (1 session = normal, 2+ = browser back detected) */
    sessions: SessionInfo[];
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
