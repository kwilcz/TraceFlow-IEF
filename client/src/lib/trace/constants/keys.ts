/**
 * B2C Trace Constants - Keys and Enums
 *
 * Centralized type-safe constants for all keys used in B2C trace parsing.
 * These enums prevent magic strings and provide compile-time safety.
 */

/**
 * Clip Kind values from Application Insights logs.
 * These represent the different types of clips in a trace.
 */
export enum ClipKind {
    /** HTTP headers and correlation information */
    Headers = "Headers",
    /** Log transition information */
    Transition = "Transition",
    /** Handler action being executed */
    Action = "Action",
    /** Predicate evaluation */
    Predicate = "Predicate",
    /** Result of a handler execution */
    HandlerResult = "HandlerResult",
    /** Exception/error information */
    Exception = "Exception",
}

/**
 * Statebag keys used in B2C traces.
 * These are the "k" values in statebag entries.
 *
 * Format:
 * - Short codes like "CTP", "SE" are internal B2C abbreviations
 * - "Complex-*" are structured/nested data entries
 * - "ORCH_*" are orchestration-related
 */
export enum StatebagKey {
    /** Current Technical Profile being executed */
    CTP = "CTP",
    /** Step Element - current orchestration step identifier */
    SE = "SE",
    /** Orchestration Current Step number */
    ORCH_CS = "ORCH_CS",
    /** Orchestration Index */
    ORCH_IDX = "ORCH_IDX",
    /** Machine State */
    MACHSTATE = "MACHSTATE",
    /** Journey Context */
    JC = "JC",
    /** Return Address */
    RA = "RA",
    /** Relying Party Protocol */
    RPP = "RPP",
    /** Relying Party Input Protocol Parameters */
    RPIPP = "RPIPP",
    /** Original Transaction ID */
    OTID = "OTID",
    /** Application Version */
    APPMV = "APPMV",
    /** Client Type */
    CT = "CT",
    /** Client Capability */
    CC = "CC",
    /** Client Capability Mode */
    CCM = "CCM",
    /** Initial Context */
    IC = "IC",
    /** Entity ID */
    EID = "EID",
    /** Current Message */
    CMESSAGE = "CMESSAGE",
    /** Initial Message */
    IMESSAGE = "IMESSAGE",
    /** Channel Name / Login Method */
    CNLM = "CNLM",
    /** Target Entity - ClaimsExchange ID triggered by user selection */
    TAGE = "TAGE",

    /** Protocol call details and response */
    PROT = "PROT",

    /** Complex Claims - nested claims object */
    ComplexClaims = "Complex-CLMS",
    /** Complex API Result */
    ComplexApiResult = "Complex-API_RESULT",
    /** Complex Items indicator */
    ComplexItems = "ComplexItems",

    /** Validation Request */
    ValidationRequest = "ValidationRequest",
    /** Validation Response */
    ValidationResponse = "ValidationResponse",
    /** Self-Asserted Attribute Claims */
    SAAClaims = "SAA-Claims",
}

/**
 * RecorderRecord key values used in HandlerResult.RecorderRecord.Values.
 * These identify different types of recorded data.
 */
export enum RecorderRecordKey {
    /** Claims exchange initiation */
    InitiatingClaimsExchange = "InitiatingClaimsExchange",
    /** Backend claims exchange initiation */
    InitiatingBackendClaimsExchange = "InitiatingBackendClaimsExchange",
    /** Technical profiles enabled for user journeys */
    EnabledForUserJourneysTrue = "EnabledForUserJourneysTrue",
    /** Technical profile enabled status */
    TechnicalProfileEnabled = "TechnicalProfileEnabled",
    /** Home realm discovery data */
    HomeRealmDiscovery = "HomeRealmDiscovery",
    /** Validation technical profile data */
    Validation = "Validation",
    /** Validation technical profile reference */
    ValidationTechnicalProfile = "ValidationTechnicalProfile",
    /** Output claims transformation */
    OutputClaimsTransformation = "OutputClaimsTransformation",
    /** Claims transformation details */
    ClaimsTransformation = "ClaimsTransformation",
    /** Transformation ID */
    Id = "Id",
    /** Input claim for transformation */
    InputClaim = "InputClaim",
    /** Input parameter for transformation */
    InputParameter = "InputParameter",
    /** Transformation result */
    Result = "Result",
    /** SubJourney reference */
    SubJourney = "SubJourney",
    /** SubJourney ID */
    SubJourneyId = "SubJourneyId",
    /** Journey completed indicator */
    JourneyCompleted = "JourneyCompleted",
    /** SubJourney invoked indicator */
    SubJourneyInvoked = "SubJourneyInvoked",
    /** Technical profile ID */
    TechnicalProfileId = "TechnicalProfileId",
    /** Protocol provider type */
    ProtocolProviderType = "ProtocolProviderType",
    /** Submitted by field */
    SubmittedBy = "SubmittedBy",
    /** Validation request URL */
    ValidationRequestUrl = "ValidationRequestUrl",
    /** Validation result */
    ValidationResult = "ValidationResult",
    /** Claim mapping - partner type */
    MappingPartnerTypeForClaim = "MappingPartnerTypeForClaim",
    /** Claim mapping - default value */
    MappingDefaultValueForClaim = "MappingDefaultValueForClaim",

    /** Display control action details */
    DisplayControlAction = "DisplayControlAction",

    // === Additional keys discovered in log analysis ===

    /** Current orchestration step number */
    CurrentStep = "CurrentStep",
    /** Getting claims record (contains InitiatingBackendClaimsExchange) */
    GettingClaims = "GettingClaims",
    /** Sending request indicator */
    SendingRequest = "SendingRequest",
    /** API UI Manager information */
    ApiUiManagerInfo = "ApiUiManagerInfo",
    /** Protocol type (e.g., "backend protocol", "One Way Message Protocol") */
    ProtocolType = "ProtocolType",
    /** Target entity for claims exchange */
    TargetEntity = "TargetEntity",
    /** Enabled rule (e.g., "Always") */
    EnabledRule = "EnabledRule",
    /** Enabled result boolean */
    EnabledResult = "EnabledResult",
    /** Technical profile name in TechnicalProfileEnabled */
    TechnicalProfile = "TechnicalProfile",
}

/**
 * Event instance types from Headers.EventInstance.
 * These indicate the type of B2C event in the trace.
 */
export enum EventInstance {
    /** Authentication event */
    Auth = "Event:AUTH",
    /** API event */
    Api = "Event:API",
    /** Self-asserted form event */
    SelfAsserted = "Event:SELFASSERTED",
    /** Claims exchange event */
    ClaimsExchange = "Event:ClaimsExchange",
}

/** Supported event instances for filtering trace logs. */
export const SUPPORTED_EVENT_INSTANCES = new Set<string>([
    EventInstance.Auth,
    EventInstance.Api,
    EventInstance.SelfAsserted,
    EventInstance.ClaimsExchange,
]);

/** Deduplication threshold in milliseconds for step separation. */
export const DEDUP_THRESHOLD_MS = 1000;

/**
 * Event type values used in TraceStep and FlowNodeContext.
 */
export type EventType = "AUTH" | "API" | "SELFASSERTED" | "ClaimsExchange";

/**
 * Maps EventInstance enum to EventType.
 */
export function eventInstanceToEventType(eventInstance: string): EventType {
    switch (eventInstance) {
        case EventInstance.Auth:
            return "AUTH";
        case EventInstance.SelfAsserted:
            return "SELFASSERTED";
        case EventInstance.ClaimsExchange:
            return "ClaimsExchange";
        case EventInstance.Api:
        default:
            return "API";
    }
}

/**
 * Type guard for ClipKind enum values.
 */
export function isValidClipKind(kind: string): kind is ClipKind {
    return Object.values(ClipKind).includes(kind as ClipKind);
}

/**
 * Type guard for StatebagKey enum values.
 */
export function isKnownStatebagKey(key: string): key is StatebagKey {
    return Object.values(StatebagKey).includes(key as StatebagKey);
}

/**
 * Type guard for RecorderRecordKey enum values.
 */
export function isKnownRecorderRecordKey(key: string): key is RecorderRecordKey {
    return Object.values(RecorderRecordKey).includes(key as RecorderRecordKey);
}

/**
 * Extracts the technical profile name from CTP statebag value.
 * CTP value format: "TechnicalProfileId:stepNumber"
 *
 * @example
 * extractTechnicalProfileFromCTP("SelfAsserted-LocalAccountSignin-Email:1")
 * // Returns "SelfAsserted-LocalAccountSignin-Email"
 */
export function extractTechnicalProfileFromCTP(ctpValue: string): string | null {
    if (!ctpValue || typeof ctpValue !== "string") {
        return null;
    }

    const colonIndex = ctpValue.lastIndexOf(":");
    if (colonIndex === -1) {
        return ctpValue;
    }

    return ctpValue.substring(0, colonIndex);
}

/**
 * Extracts the step number from CTP statebag value.
 * CTP value format: "TechnicalProfileId:stepNumber"
 *
 * @example
 * extractStepFromCTP("SelfAsserted-LocalAccountSignin-Email:1")
 * // Returns 1
 */
export function extractStepFromCTP(ctpValue: string): number | null {
    if (!ctpValue || typeof ctpValue !== "string") {
        return null;
    }

    const colonIndex = ctpValue.lastIndexOf(":");
    if (colonIndex === -1) {
        return null;
    }

    const stepPart = ctpValue.substring(colonIndex + 1);
    const stepNumber = parseInt(stepPart, 10);

    return isNaN(stepNumber) ? null : stepNumber;
}
