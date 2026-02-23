/**
 * Statebag Key Mappings
 *
 * Maps cryptic B2C statebag keys to user-friendly display names,
 * along with category and visibility tier metadata used by the
 * debugger inspector panels.
 */

// ============================================================================
// Types
// ============================================================================

/** Semantic grouping for statebag keys. */
export type StatebagCategory =
    | "status"
    | "orchestration"
    | "authentication"
    | "protocol"
    | "ui"
    | "session"
    | "internal";

/**
 * Visibility tier controlling how the key is rendered in the inspector.
 *
 * - **chip**    — promoted to the sticky header as a status chip.
 * - **visible** — shown in the normal property list.
 * - **complex** — rendered with an expandable / structured viewer.
 * - **hidden**  — internal engine noise, behind a "show hidden" toggle.
 */
export type StatebagTier = "chip" | "visible" | "complex" | "hidden";

/** Full metadata for a known statebag key. */
export interface StatebagLabelEntry {
    label: string;
    category: StatebagCategory;
    tier: StatebagTier;
}

// ============================================================================
// Label Map
// ============================================================================

/**
 * Map of statebag keys to their friendly display names + metadata.
 */
export const STATEBAG_LABELS: Record<string, StatebagLabelEntry> = {
    // ── Status (chip) ────────────────────────────────────────────────────
    ORCH_CS:    { label: "Current Step",              category: "status",         tier: "chip" },
    MACHSTATE:  { label: "Machine State",             category: "status",         tier: "chip" },
    CTP:        { label: "Current Technical Profile",  category: "status",         tier: "chip" },
    UJ_S:       { label: "User Journey Status",       category: "status",         tier: "chip" },
    REAUTH:     { label: "Re-auth Required",          category: "status",         tier: "chip" },
    CI:         { label: "User Identity (OID)",       category: "authentication", tier: "chip" },

    // ── Orchestration ────────────────────────────────────────────────────
    RA:         { label: "Retry Attempt",             category: "orchestration",  tier: "visible" },
    TAGE:       { label: "Target Entity",             category: "orchestration",  tier: "visible" },
    ORCH_IDX:   { label: "Orchestration Index",       category: "orchestration",  tier: "hidden" },

    // ── Authentication ───────────────────────────────────────────────────
    OTID:       { label: "Original Tenant ID",        category: "authentication", tier: "visible" },
    IC:         { label: "Is Continuation",           category: "authentication", tier: "visible" },
    SSO:        { label: "Single Sign-On State",      category: "authentication", tier: "visible" },
    SSO_SESS:   { label: "SSO Session ID",            category: "authentication", tier: "visible" },

    // ── Protocol ─────────────────────────────────────────────────────────
    RPP:        { label: "Relying Party Protocol",    category: "protocol",       tier: "visible" },
    RPIPP:      { label: "RP Identity Provider Protocol", category: "protocol",   tier: "visible" },
    CT:         { label: "Client Type",               category: "protocol",       tier: "visible" },
    IMESSAGE:   { label: "Initiating Message ID",     category: "protocol",       tier: "hidden" },
    CMESSAGE:   { label: "Current Message ID",        category: "protocol",       tier: "hidden" },
    CC:         { label: "Code Challenge (PKCE)",     category: "protocol",       tier: "hidden" },
    CCM:        { label: "Code Challenge Method",     category: "protocol",       tier: "hidden" },
    PROT:       { label: "Protocol Trace (AAD Graph)", category: "protocol",      tier: "complex" },

    // ── UI ───────────────────────────────────────────────────────────────
    JC:         { label: "Journey Culture (Locale)",  category: "ui",             tier: "visible" },
    EID:        { label: "Element ID (Page Layout)",  category: "ui",             tier: "visible" },
    SA_FIELDS:  { label: "Self-Asserted Fields",      category: "ui",             tier: "hidden" },
    UXRC:       { label: "UX Resource Context",       category: "ui",             tier: "hidden" },

    // ── Session ──────────────────────────────────────────────────────────
    SE:         { label: "Session Entity",            category: "session",        tier: "visible" },

    // ── Internal ─────────────────────────────────────────────────────────
    APPMV:      { label: "App Model Version",         category: "internal",       tier: "visible" },
    CP:         { label: "Claims Provider",           category: "internal",       tier: "visible" },
    REPRM:      { label: "Request Parameters",        category: "internal",       tier: "hidden" },
    ARC:        { label: "API Resource Context",      category: "internal",       tier: "hidden" },
    TCTX:       { label: "Technical Context",         category: "internal",       tier: "hidden" },
    _MachineEventQ: { label: "Machine Event Queue",   category: "internal",       tier: "hidden" },
    ComplexItems:   { label: "Complex Items List",     category: "internal",       tier: "hidden" },
    S_CTP:      { label: "Saved Technical Profile",   category: "internal",       tier: "hidden" },
    AUPRM:      { label: "Auth Parameters",           category: "internal",       tier: "hidden" },
    PRMCH:      { label: "Parameter Chain",           category: "internal",       tier: "hidden" },

    // ── Complex objects ──────────────────────────────────────────────────
    "Complex-CLMS":       { label: "Claims Bag (Snapshot)",           category: "authentication", tier: "complex" },
    "Complex-API_RESULT": { label: "API/UI Result",                   category: "protocol",       tier: "complex" },
    ValidationRequest:    { label: "Validation Request",              category: "protocol",       tier: "complex" },
    ValidationResponse:   { label: "Validation Response",             category: "protocol",       tier: "complex" },
    "SAA-Claims":         { label: "Self-Asserted Aggregated Claims", category: "authentication", tier: "complex" },
};

// ============================================================================
// Ordered chip keys (display order for sticky header)
// ============================================================================

/** The 6 status-chip keys in the order they appear in the inspector header. */
export const STATUS_CHIP_KEYS: string[] = [
    "ORCH_CS",
    "MACHSTATE",
    "CTP",
    "UJ_S",
    "CI",
    "REAUTH",
];

// ============================================================================
// Helpers — backward-compatible
// ============================================================================

/**
 * Get the friendly label for a statebag key.
 * Returns the original key if no mapping exists.
 */
export function getStatebagLabel(key: string): string {
    return STATEBAG_LABELS[key]?.label ?? key;
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
        label: isKnown ? STATEBAG_LABELS[key].label : key,
        description: isKnown ? key : null,
        isKnown,
    };
}

// ============================================================================
// Helpers — new
// ============================================================================

/** Get the full metadata entry for a statebag key. */
export function getStatebagEntry(key: string): StatebagLabelEntry | undefined {
    return STATEBAG_LABELS[key];
}

/** Returns `true` when the key's tier is `"hidden"`. */
export function isHiddenByDefault(key: string): boolean {
    return STATEBAG_LABELS[key]?.tier === "hidden";
}

/** Returns `true` when the key's tier is `"chip"` (promoted to sticky header). */
export function isStatusChip(key: string): boolean {
    return STATEBAG_LABELS[key]?.tier === "chip";
}

/**
 * Returns `true` when the value should use an expandable / structured renderer.
 *
 * Matches:
 * - Keys with tier `"complex"` in the static map
 * - Keys prefixed with `"Complex-"` (dynamic complex items)
 * - Keys matching the `"MSG("` pattern (dynamic message payloads)
 */
export function isComplexValue(key: string): boolean {
    if (STATEBAG_LABELS[key]?.tier === "complex") return true;
    if (key.startsWith("Complex-")) return true;
    if (key.startsWith("MSG(")) return true;
    return false;
}
