/**
 * FlowNode — Unified tree structure for B2C trace visualization.
 *
 * Built during pipeline processing (not reconstructed from flat steps).
 * Each node represents a structural element of the B2C policy execution.
 *
 * The tree hierarchy:
 *   Root
 *     └── SubJourney
 *           └── Step
 *                 ├── TechnicalProfile
 *                 │     ├── TechnicalProfile (nested validation TPs)
 *                 │     └── ClaimsTransformation
 *                 ├── ClaimsTransformation (orphan CTs)
 *                 ├── HomeRealmDiscovery
 *                 └── DisplayControl
 *                       └── TechnicalProfile
 *                             └── ClaimsTransformation
 */

import type {
    StepResult,
    ClaimMapping,
    UiSettings,
    BackendApiCall,
} from "./trace";

// ============================================================================
// Node Types
// ============================================================================

/**
 * Discriminant enum for FlowNode types.
 * Used as both the FlowNode.type field and the FlowNodeData.type discriminant.
 */
export enum FlowNodeType {
    Root = "root",
    SubJourney = "subjourney",
    Step = "step",
    TechnicalProfile = "tp",
    ClaimsTransformation = "ct",
    HomeRealmDiscovery = "hrd",
    DisplayControl = "dc",
    SendClaims = "sendClaims",
}

// ============================================================================
// FlowNode
// ============================================================================

/**
 * A node in the flow execution tree.
 *
 * The tree is built during pipeline processing by `FlowTreeBuilder`.
 * Each node represents a structural element of the B2C policy execution.
 */
export interface FlowNode {
    /** Unique identifier (e.g., "sj-AuthN-LocalOnly", "step-AuthN-LocalOnly-1") */
    readonly id: string;
    /** Display name from logs */
    readonly name: string;
    /** Node type discriminant */
    readonly type: FlowNodeType;
    /** ORCH_CS value when this node was triggered */
    readonly triggeredAtStep: number;
    /** Last ORCH_CS value seen. For SubJourneys: last child's ORCH_CS. */
    lastStep: number;
    /** Child nodes */
    readonly children: FlowNode[];
    /** Type-specific data payload */
    readonly data: FlowNodeData;
    /** Pipeline context snapshot at creation time */
    readonly context: FlowNodeContext;
}

// ============================================================================
// FlowNodeContext — shared snapshot
// ============================================================================

/**
 * Snapshot of pipeline context at the time a FlowNode was created.
 * Contains common data needed by all renderers (statebag, claims, timing).
 */
export interface FlowNodeContext {
    readonly timestamp: Date;
    readonly sequenceNumber: number;
    readonly logId: string;
    readonly eventType: string;
    /** Statebag snapshot after this node's step completed. Used by InspectorHeader, StatebagSection. */
    readonly statebagSnapshot: Record<string, string>;
    /** Claims snapshot after this node's step completed. Used for claims-diff. */
    readonly claimsSnapshot: Record<string, string>;
}

// ============================================================================
// FlowNodeData — discriminated union
// ============================================================================

/**
 * Type-specific data payload for FlowNode.
 * Discriminated on the `type` field (matches FlowNodeType enum).
 */
export type FlowNodeData =
    | RootFlowData
    | SubJourneyFlowData
    | StepFlowData
    | TechnicalProfileFlowData
    | ClaimsTransformationFlowData
    | HomeRealmDiscoveryFlowData
    | DisplayControlFlowData
    | SendClaimsFlowData;

// ============================================================================
// FlowNodeChild — interpreter output building block
// ============================================================================

/**
 * Intermediate structure returned by interpreters to describe FlowNode children.
 * The FlowTreeBuilder converts these into actual FlowNode instances.
 */
export interface FlowNodeChild {
    readonly data: Exclude<FlowNodeData, RootFlowData | SubJourneyFlowData | StepFlowData>;
    readonly children?: FlowNodeChild[];
}

// ============================================================================
// StepError — structured error representation
// ============================================================================

/**
 * Structured error collected during step execution.
 * Supports both general exceptions and handler-specific errors.
 */
export interface StepError {
    readonly kind: "Handled" | "Unhandled";
    readonly hResult: string;
    readonly message: string;
}

// ─── Root ───────────────────────────────────────────────────────────────────

export interface RootFlowData {
    readonly type: FlowNodeType.Root;
    /** The policy ID for this flow */
    readonly policyId: string;
}

// ─── SubJourney ─────────────────────────────────────────────────────────────

export interface SubJourneyFlowData {
    readonly type: FlowNodeType.SubJourney;
    /** The SubJourney ID (matches journeyContextId of child steps) */
    readonly journeyId: string;
}

// ─── Step ───────────────────────────────────────────────────────────────────

/**
 * Data for an orchestration step node.
 * Generic step-level data. Details (TPs, CTs, DCs, HRD) live on child FlowNodes.
 *
 * Children: TechnicalProfile, ClaimsTransformation (orphans), HomeRealmDiscovery, DisplayControl
 */
export interface StepFlowData {
    readonly type: FlowNodeType.Step;

    // ── Identity / ordering ──
    /** The ORCH_CS step order */
    readonly stepOrder: number;
    /** Human-readable journey name */
    readonly currentJourneyName: string;

    // ── Status / result ──
    /** Step execution result */
    result: StepResult;
    /** Duration in ms from this step to the next (set by post-processor) */
    duration?: number;
    /** Structured errors collected during step execution */
    readonly errors: StepError[];

    // ── Handler / context ──
    /** Action handler that executed this step */
    readonly actionHandler?: string;

    // ── UI ──
    /** UI settings from ApiUiManagerInfo */
    readonly uiSettings?: UiSettings;

    // ── HRD / interactive ──
    /** Selectable options for interactive/HRD steps */
    readonly selectableOptions: string[];
    /** Option selected by the user in an interactive step */
    selectedOption?: string;

    // ── API calls ──
    /** Backend API calls made during this step (from PROT statebag) */
    readonly backendApiCalls?: BackendApiCall[];
}

// ─── Technical Profile ──────────────────────────────────────────────────────

/**
 * Data for a technical profile execution node.
 *
 * TPs can appear as children of: Step, TechnicalProfile (nested validation TPs),
 * or DisplayControl (DC-invoked TPs).
 *
 * Children: TechnicalProfile (nested validation TPs), ClaimsTransformation
 */
export interface TechnicalProfileFlowData {
    readonly type: FlowNodeType.TechnicalProfile;
    /** The technical profile ID */
    readonly technicalProfileId: string;
    /** Protocol provider type (e.g., AzureActiveDirectoryProvider, SelfAssertedAttributeProvider) */
    readonly providerType: string;
    /** Protocol type (e.g., "backend protocol", "OpenIdConnect") */
    readonly protocolType?: string;
    /**
     * Claims snapshot taken AFTER this TP's handler was applied.
     * Used for per-TP claims diff in the inspector.
     */
    readonly claimsSnapshot?: Record<string, string>;
    /** Claim mappings from validation technical profile execution */
    readonly claimMappings?: ClaimMapping[];
}

// ─── Claims Transformation ──────────────────────────────────────────────────

/**
 * Data for a claims transformation execution node.
 *
 * Can appear as children of: Step (orphan CTs), TechnicalProfile, DisplayControl TP.
 * No children.
 */
export interface ClaimsTransformationFlowData {
    readonly type: FlowNodeType.ClaimsTransformation;
    /** The claims transformation ID */
    readonly transformationId: string;
    /** Input claims with their values */
    readonly inputClaims: ReadonlyArray<{ claimType: string; value: string }>;
    /** Input parameters */
    readonly inputParameters: ReadonlyArray<{ id: string; value: string }>;
    /** Output/result claims with their values */
    readonly outputClaims: ReadonlyArray<{ claimType: string; value: string }>;
}

// ─── Home Realm Discovery ───────────────────────────────────────────────────

/**
 * Data for a home realm discovery node.
 *
 * Appears as child of a Step node when the step is an interactive HRD step.
 * Children: none (provider options rendered from selectableOptions array).
 */
export interface HomeRealmDiscoveryFlowData {
    readonly type: FlowNodeType.HomeRealmDiscovery;
    /** Available identity providers to choose from */
    readonly selectableOptions: string[];
    /** The option selected by the user */
    selectedOption?: string;
    /** UI settings for the HRD page */
    readonly uiSettings?: UiSettings;
}

// ─── Display Control ────────────────────────────────────────────────────────

/**
 * Data for a display control action execution node.
 *
 * Appears as child of a Step node.
 * Children: TechnicalProfile (DC-invoked TPs, which may have CT children).
 */
export interface DisplayControlFlowData {
    readonly type: FlowNodeType.DisplayControl;
    /** The display control ID (e.g., "captchaControlChallengeCode") */
    readonly displayControlId: string;
    /** The action performed (e.g., "GetChallenge", "VerifyCode", "SendCode") */
    readonly action: string;
    /** HTTP result code if applicable */
    readonly resultCode?: string;
    /** Claim mappings for this action */
    readonly claimMappings?: ClaimMapping[];
}

// ─── Send Claims (Relying Party Response) ───────────────────────────────────

/**
 * Data for the final "send claims to relying party" node.
 *
 * Appears as child of a Step node when the journey completes via
 * SendRelyingPartyResponseHandler. Represents token issuance.
 *
 * Children: none.
 */
export interface SendClaimsFlowData {
    readonly type: FlowNodeType.SendClaims;
    /** The relying party technical profile ID */
    readonly technicalProfileId: string;
    /** Protocol used (e.g., "OpenIdConnect", "SAML2") */
    readonly protocol?: string;
    /** Output claims sent to the relying party */
    readonly outputClaims?: ReadonlyArray<{ claimType: string; value: string }>;
}