/** Expand/collapse state for the flow selection panel. */
export interface PanelCollapseState {
    /** Whether the panel table is currently visible */
    expanded: boolean;
    /** True after first auto-collapse has fired */
    hasAutoCollapsed: boolean;
    /** True after user manually re-expanded — disables future auto-collapse */
    userOverrode: boolean;
}

/** Actions for the panel collapse state machine. */
export type CollapseAction =
    | { type: "auto-collapse" }
    | { type: "manual-toggle" };
