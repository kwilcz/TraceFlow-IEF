/**
 * Azure Application Insights User Journey Recorder - Type Definitions
 *
 * This module provides comprehensive type definitions for parsing and working with
 * B2C User Journey Recorder logs from Application Insights.
 *
 * Design Goals:
 * - Type-safe parsing of all known clip types
 * - Support for building state machines from parsed logs
 * - Easy iteration, filtering, and querying of journey data
 * - Extensible for unknown/new clip types
 */

// ============================================================================
// STATEBAG TYPES - Core state tracking structures
// ============================================================================

/**
 * Standard statebag entry with metadata.
 * Most statebag values follow this structure.
 */
export interface StatebagEntry {
    /** ISO8601 timestamp when the entry was created/modified */
    c: string;
    /** Key name (same as the property name in the parent object) */
    k: string;
    /** The actual value (always a string, may need parsing) */
    v: string;
    /** Whether this entry is persisted */
    p: boolean;
}

/**
 * Message token entry - extends standard entry with token type.
 * Used for MSG(...) keys containing OAuth/JWT tokens.
 */
export interface MessageTokenEntry extends StatebagEntry {
    /** Token type (e.g., "OAuth2", "Jwt") */
    t: string;
}

/**
 * Token statebag item with explicit type marker.
 * Used for special token storage.
 */
export interface TokenStatebagItem {
    $type: "Web.TPEngine.TokenStateBagItem";
    ContentType: "Jwt" | "Json" | "WsFed" | "Saml11" | string;
    Value: string;
}

/**
 * Complex claims dictionary - direct key-value pairs without metadata wrapper.
 */
export interface ComplexClaims {
    [claimName: string]: string;
}

/**
 * Known statebag keys for type-safe access.
 */
export type KnownStatebagKey =
    | "MACHSTATE"   // State machine state
    | "JC"          // Journey culture/language
    | "ORCH_CS"     // Current orchestration step
    | "RA"          // Internal
    | "RPP"         // Protocol (e.g., "OAUTH2")
    | "RPIPP"       // Protocol provider
    | "OTID"        // Original tenant ID
    | "APPMV"       // App model version
    | "TAGE"        // Target entity
    | "CMESSAGE"    // Current message ID
    | "IMESSAGE"    // Initial message ID
    | "ComplexItems"; // List of complex item names

/**
 * Statebag - the complete state container.
 * Supports both known and unknown keys.
 */
export interface Statebag {
    /** State machine state */
    MACHSTATE?: StatebagEntry;
    /** Journey culture/language */
    JC?: StatebagEntry;
    /** Current orchestration step (value is string of number) */
    ORCH_CS?: StatebagEntry;
    /** Internal */
    RA?: StatebagEntry;
    /** Protocol (e.g., "OAUTH2") */
    RPP?: StatebagEntry;
    /** Protocol provider */
    RPIPP?: StatebagEntry;
    /** Original tenant ID */
    OTID?: StatebagEntry;
    /** App model version */
    APPMV?: StatebagEntry;
    /** Target entity */
    TAGE?: StatebagEntry;
    /** Current message ID */
    CMESSAGE?: StatebagEntry;
    /** Initial message ID */
    IMESSAGE?: StatebagEntry;
    /** List of complex item names (comma-separated string) */
    ComplexItems?: string;
    /** Complex claims dictionary */
    "Complex-CLMS"?: ComplexClaims;
    /** Allow message tokens and other dynamic keys */
    [key: string]: StatebagEntry | MessageTokenEntry | TokenStatebagItem | ComplexClaims | string | undefined;
}

// ============================================================================
// RECORDER RECORD TYPES - Detailed execution information
// ============================================================================

/**
 * Generic key-value record entry.
 */
export interface RecorderRecordEntry<TKey extends string = string, TValue = unknown> {
    Key: TKey;
    Value: TValue;
}

/**
 * Container for recorder record values.
 */
export interface RecorderRecord {
    Values: RecorderRecordEntry[];
}

/**
 * Technical profile enabled status.
 */
export interface TechnicalProfileEnabled {
    EnabledRule: string;
    EnabledResult: boolean;
    TechnicalProfile: string;
}

/**
 * Enabled for user journeys record value.
 */
export interface EnabledForUserJourneysValue {
    Values: Array<
        | RecorderRecordEntry<"CurrentStep", number>
        | RecorderRecordEntry<"TechnicalProfileEnabled", TechnicalProfileEnabled>
    >;
}

/**
 * Claims exchange initiation details.
 */
export interface InitiatingClaimsExchangeValue {
    ProtocolType: string;
    TargetEntity: string;
    TechnicalProfileId: string;
    ProtocolProviderType: string;
}

/**
 * Backend claims exchange initiation.
 */
export interface InitiatingBackendClaimsExchangeValue {
    TechnicalProfileId: string;
    ProtocolProviderType: string;
}

/**
 * Claim mapping between partner and policy claim types.
 */
export interface ClaimMapping {
    PartnerClaimType: string;
    PolicyClaimType: string;
}

/**
 * Default value mapping for claims.
 */
export interface DefaultValueMapping {
    DefaultValue?: string;
    PartnerClaimType?: string;
    PolicyClaimType: string;
}

/**
 * Claims transformation input claim.
 */
export interface ClaimsTransformationInputClaim {
    PolicyClaimType: string;
    Value: string;
}

/**
 * Claims transformation input parameter.
 */
export interface ClaimsTransformationInputParameter {
    Id: string;
    Value: string;
}

/**
 * Claims transformation result.
 */
export interface ClaimsTransformationResult {
    PolicyClaimType: string;
    Value: string;
}

/**
 * Claims transformation record.
 */
export interface ClaimsTransformationRecord {
    Values: Array<
        | RecorderRecordEntry<"Id", string>
        | RecorderRecordEntry<"InputClaim", ClaimsTransformationInputClaim>
        | RecorderRecordEntry<"InputParameter", ClaimsTransformationInputParameter>
        | RecorderRecordEntry<"Result", ClaimsTransformationResult>
    >;
}

/**
 * Output claims transformation value.
 */
export interface OutputClaimsTransformationValue {
    Values: Array<
        | RecorderRecordEntry<"MappingDefaultValueForClaim", DefaultValueMapping>
        | RecorderRecordEntry<"ClaimsTransformation", ClaimsTransformationRecord>
    >;
}

/**
 * Validation record value.
 */
export interface ValidationValue {
    Values: Array<
        | RecorderRecordEntry<"SubmittedBy", string>
        | RecorderRecordEntry<"ProtocolProviderType", string>
    >;
}

/**
 * API UI Manager info value.
 */
export interface ApiUiManagerInfoValue {
    Values: Array<
        | RecorderRecordEntry<"Language", string>
        | RecorderRecordEntry<"Settings", string>
    >;
}

/**
 * Getting claims value.
 */
export interface GettingClaimsValue {
    Values: Array<RecorderRecordEntry<"InitiatingBackendClaimsExchange", InitiatingBackendClaimsExchangeValue>>;
}

/**
 * Known recorder record entry keys.
 */
export type RecorderRecordKey =
    | "Validation"
    | "EnabledForUserJourneysTrue"
    | "EnabledForUserJourneysFalse"
    | "HomeRealmDiscovery"
    | "InitiatingClaimsExchange"
    | "GettingClaims"
    | "OutputClaimsTransformation"
    | "ApiUiManagerInfo"
    | "CurrentStep"
    | "TechnicalProfileEnabled"
    | "MappingDefaultValueForClaim"
    | "ClaimsTransformation"
    | "SubmittedBy"
    | "ProtocolProviderType"
    | "InitiatingBackendClaimsExchange";

// ============================================================================
// EXCEPTION TYPES
// ============================================================================

/**
 * Exception data - additional error context.
 */
export interface ExceptionData {
    Headers?: string;
    [key: string]: unknown;
}

/**
 * Exception content - recursive structure for error details.
 */
export interface ExceptionContent {
    /** Error message */
    Message: string;
    /** HResult error code (hex string without 0x prefix) */
    HResult?: string;
    /** Kind of exception (e.g., "Handled", "Unhandled") */
    Kind?: string;
    /** Additional exception data */
    Data?: ExceptionData;
    /** Nested exception details */
    Exception?: ExceptionContent;
}

// ============================================================================
// CLIP CONTENT TYPES
// ============================================================================

/**
 * Headers clip content.
 * Note: Does NOT contain CurrentOrchestrationStep, TargetEntity,
 * or ClaimsProviderProtocolProviderType - those come from Statebag.
 */
export interface HeadersContent {
    /** Recorder endpoint, e.g., "urn:journeyrecorder:applicationinsights" */
    UserJourneyRecorderEndpoint: string;
    /** Correlation ID (GUID) */
    CorrelationId: string;
    /** Event instance, e.g., "Event:AUTH" */
    EventInstance: string;
    /** Tenant ID, e.g., "B2CEURWWDEVIDP.onmicrosoft.com" */
    TenantId: string;
    /** Policy name */
    PolicyId: string;
}

/**
 * Transition clip content - records state machine transitions.
 */
export interface TransitionContent {
    /** Event that triggered the transition, e.g., "AUTH", "PreStep", "ClaimsExchange" */
    EventName: string;
    /** Current state name, e.g., "Initial", "AwaitingNextStep" */
    StateName: string;
}

/**
 * Handler result content.
 */
export interface HandlerResultContent {
    /** Handler execution result */
    Result: boolean;
    /** Predicate result as string ("True" or "False"), not boolean */
    PredicateResult?: string;
    /** Updated statebag entries */
    Statebag?: Statebag;
    /** Detailed execution records */
    RecorderRecord?: RecorderRecord;
    /** Exception if handler failed */
    Exception?: ExceptionContent;
}

/**
 * Fatal exception content.
 */
export interface FatalExceptionContent {
    Exception: ExceptionContent;
    Time: string;
}

// ============================================================================
// CLIP TYPES - Discriminated Union
// ============================================================================

/**
 * Base clip structure.
 */
export interface ClipBase<TKind extends string, TContent> {
    Kind: TKind;
    Content: TContent;
}

/** Headers clip - journey metadata */
export type HeadersClip = ClipBase<"Headers", HeadersContent>;

/** Transition clip - state machine transition */
export type TransitionClip = ClipBase<"Transition", TransitionContent>;

/** Predicate clip - handler class name for validation */
export type PredicateClip = ClipBase<"Predicate", string>;

/** Action clip - handler class name for execution */
export type ActionClip = ClipBase<"Action", string>;

/** HandlerResult clip - execution results */
export type HandlerResultClip = ClipBase<"HandlerResult", HandlerResultContent>;

/** FatalException clip - critical error */
export type FatalExceptionClip = ClipBase<"FatalException", FatalExceptionContent>;

/** Generic clip for unknown types */
export interface GenericClip {
    Kind: string;
    Content: unknown;
}

/** All known clip types */
export type KnownClip =
    | HeadersClip
    | TransitionClip
    | PredicateClip
    | ActionClip
    | HandlerResultClip
    | FatalExceptionClip;

/** Any clip (known or generic) */
export type Clip = KnownClip | GenericClip;

/** Known clip kind literals */
export type KnownClipKind = KnownClip["Kind"];

/** Array of clips */
export type ClipsArray = Clip[];

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isClip(value: unknown): value is Clip {
    return (
        typeof value === "object" &&
        value !== null &&
        "Kind" in value &&
        typeof (value as Clip).Kind === "string" &&
        "Content" in value
    );
}

export function isHeadersClip(clip: Clip): clip is HeadersClip {
    return clip.Kind === "Headers";
}

export function isTransitionClip(clip: Clip): clip is TransitionClip {
    return clip.Kind === "Transition";
}

export function isPredicateClip(clip: Clip): clip is PredicateClip {
    return clip.Kind === "Predicate";
}

export function isActionClip(clip: Clip): clip is ActionClip {
    return clip.Kind === "Action";
}

export function isHandlerResultClip(clip: Clip): clip is HandlerResultClip {
    return clip.Kind === "HandlerResult";
}

export function isFatalExceptionClip(clip: Clip): clip is FatalExceptionClip {
    return clip.Kind === "FatalException";
}

export function isKnownClip(clip: Clip): clip is KnownClip {
    const knownKinds: KnownClipKind[] = [
        "Headers",
        "Transition",
        "Predicate",
        "Action",
        "HandlerResult",
        "FatalException",
    ];
    return knownKinds.includes(clip.Kind as KnownClipKind);
}

export function isClipsArray(value: unknown): value is ClipsArray {
    return Array.isArray(value) && value.every(isClip);
}

export function isStatebagEntry(value: unknown): value is StatebagEntry {
    return (
        typeof value === "object" &&
        value !== null &&
        "c" in value &&
        "k" in value &&
        "v" in value &&
        "p" in value
    );
}

export function isMessageTokenEntry(value: unknown): value is MessageTokenEntry {
    return isStatebagEntry(value) && "t" in value;
}

export function isComplexClaims(key: string, value: unknown): value is ComplexClaims {
    return key === "Complex-CLMS" && typeof value === "object" && value !== null;
}

// ============================================================================
// PARSED JOURNEY TYPES - High-level structures for state machine building
// ============================================================================

/**
 * Extracted statebag values in a more usable format.
 */
export interface ParsedStatebag {
    /** Current orchestration step number */
    orchestrationStep: number | null;
    /** State machine state */
    machineState: string | null;
    /** Target entity */
    targetEntity: string | null;
    /** Journey culture */
    culture: string | null;
    /** Current message ID */
    currentMessageId: string | null;
    /** Initial message ID */
    initialMessageId: string | null;
    /** Protocol (e.g., "OAUTH2") */
    protocol: string | null;
    /** Claims dictionary */
    claims: Record<string, string>;
    /** All raw entries for advanced access */
    raw: Statebag;
}

/**
 * A single state in the journey state machine.
 */
export interface JourneyState {
    /** State name from Transition clip */
    name: string;
    /** Event that triggered entry to this state */
    triggerEvent: string;
    /** Index in the clips array where this state starts */
    clipIndex: number;
    /** Timestamp when this state was entered */
    timestamp: Date;
}

/**
 * An orchestration step with all related data.
 */
export interface OrchestrationStep {
    /** Step number (1-based) */
    stepNumber: number;
    /** Statebag snapshot at this step */
    statebag: ParsedStatebag;
    /** Claims at this step */
    claims: Record<string, string>;
    /** Technical profiles involved */
    technicalProfiles: string[];
    /** Whether this step was skipped */
    skipped: boolean;
    /** Clips that belong to this step */
    clips: Clip[];
    /** Index range in original clips array */
    clipRange: { start: number; end: number };
}

/**
 * A handler execution with predicate, action, and result.
 */
export interface HandlerExecution {
    /** Predicate handler name */
    predicate: string | null;
    /** Action handler name */
    action: string | null;
    /** Execution result */
    result: HandlerResultContent | null;
    /** Index in clips array */
    clipIndex: number;
}

/**
 * Complete parsed journey for state machine building.
 */
export interface ParsedJourney {
    /** Journey metadata from Headers clip */
    headers: HeadersContent | null;
    /** All state transitions */
    states: JourneyState[];
    /** All orchestration steps with snapshots */
    orchestrationSteps: OrchestrationStep[];
    /** All handler executions */
    handlers: HandlerExecution[];
    /** Fatal exception if journey failed */
    fatalException: FatalExceptionContent | null;
    /** Final statebag at journey end */
    finalStatebag: ParsedStatebag | null;
    /** Final claims at journey end */
    finalClaims: Record<string, string>;
    /** Raw clips array */
    clips: ClipsArray;
    /** Quick access to current orchestration step */
    currentStep: number | null;
    /** Whether journey completed successfully */
    isComplete: boolean;
    /** Whether journey has errors */
    hasErrors: boolean;
}

/**
 * Journey query/filter options.
 */
export interface JourneyQueryOptions {
    /** Filter by orchestration step */
    step?: number;
    /** Filter by state name */
    state?: string;
    /** Filter by clip kind */
    clipKind?: KnownClipKind;
    /** Filter by having errors */
    hasErrors?: boolean;
    /** Filter by technical profile */
    technicalProfile?: string;
}

// ============================================================================
// UTILITY TYPES FOR STATE MACHINE BUILDING
// ============================================================================

/**
 * State machine node for visualization.
 */
export interface StateMachineNode {
    id: string;
    label: string;
    type: "state" | "step" | "handler" | "error";
    data: {
        statebag?: ParsedStatebag;
        claims?: Record<string, string>;
        [key: string]: unknown;
    };
}

/**
 * State machine edge for visualization.
 */
export interface StateMachineEdge {
    id: string;
    source: string;
    target: string;
    label: string;
    type: "transition" | "execution" | "error";
}

/**
 * Complete state machine for visualization.
 */
export interface StateMachine {
    nodes: StateMachineNode[];
    edges: StateMachineEdge[];
    metadata: {
        policyId: string;
        correlationId: string;
        startTime: Date;
        endTime: Date | null;
        totalSteps: number;
        currentStep: number | null;
    };
}
