/**
 * Statebag Key Mappings
 *
 * Maps cryptic B2C statebag keys to user-friendly display names.
 * These are internal Azure AD B2C state machine variables.
 */

/**
 * Map of statebag keys to their friendly display names.
 */
export const STATEBAG_LABELS: Record<string, string> = {
    // Orchestration state
    ORCH_CS: "Current Step",
    ORCH_IDX: "Orchestration Index",
    MACHSTATE: "Machine State",

    // Journey context
    JC: "Journey Culture (Locale)",
    RA: "Retry Attempt",
    TAGE: "Target Entity",

    // Relying Party (RP) settings
    RPP: "Relying Party Protocol",
    RPIPP: "RP Identity Provider Protocol",

    // Tenant and application
    OTID: "Original Tenant ID",
    APPMV: "App Model Version",
    CT: "Client Type",

    // Session and authentication
    SSO: "Single Sign-On State",
    SSO_SESS: "SSO Session ID",

    // Token and security
    REPRM: "Request Parameters",
    IC: "Is Continuation",
    CP: "Claims Provider",

    // UI and self-asserted
    SA_FIELDS: "Self-Asserted Fields",
    EID: "Element ID (Page Layout)",
    UXRC: "UX Resource Context",
    ARC: "API Resource Context",

    // Technical context
    TCTX: "Technical Context",
    _MachineEventQ: "Machine Event Queue",

    // Complex items indicator
    ComplexItems: "Complex Items List",

    // Status indicators
    CC: "Code Challenge (PKCE)",
    CCM: "Code Challenge Method",
    REAUTH: "Re-auth Required",
    CTP: "Current Technical Profile",
    SE: "Session Entity",
    CI: "User Identity (OID)",
    UJ_S: "User Journey Status",

    // Protocol & session
    PROT: "Protocol Trace (AAD Graph)",
    S_CTP: "Saved Technical Profile",
    AUPRM: "Auth Parameters",
    PRMCH: "Parameter Chain",

    // Complex object indicators
    "Complex-CLMS": "Claims Bag (Snapshot)",
    "Complex-API_RESULT": "API/UI Result",

    // Message/validation patterns
    IMESSAGE: "Initiating Message ID",
    CMESSAGE: "Current Message ID",

    // Validation patterns
    ValidationRequest: "Validation Request",
    ValidationResponse: "Validation Response",

    // Claims patterns
    "SAA-Claims": "Self-Asserted Aggregated Claims",
};

/**
 * Get the friendly label for a statebag key.
 * Returns the original key if no mapping exists.
 */
export function getStatebagLabel(key: string): string {
    return STATEBAG_LABELS[key] ?? key;
}

/**
 * Check if a key has a known mapping.
 */
export function hasStatebagLabel(key: string): boolean {
    return key in STATEBAG_LABELS;
}

/**
 * Format a statebag entry for display.
 * Returns an object with label and description.
 */
export function formatStatebagEntry(key: string, value: string): {
    label: string;
    description: string | null;
    isKnown: boolean;
} {
    const isKnown = hasStatebagLabel(key);
    return {
        label: isKnown ? STATEBAG_LABELS[key] : key,
        description: isKnown ? key : null,
        isKnown,
    };
}
