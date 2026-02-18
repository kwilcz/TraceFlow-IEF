import { useReducer } from "react";
import type { PanelCollapseState, CollapseAction } from "./flow-selection.types";

/** Initial state: panel starts expanded, no auto-collapse or user override yet. */
export const initialCollapseState: PanelCollapseState = {
    expanded: true,
    hasAutoCollapsed: false,
    userOverrode: false,
};

/**
 * Pure reducer implementing the panel expand/collapse FSM.
 *
 * - `auto-collapse` fires at most once and only if the user hasn't manually re-expanded.
 * - `manual-toggle` when expanded → collapses the panel.
 * - `manual-toggle` when collapsed → expands AND permanently disables future auto-collapse.
 */
export function collapseReducer(state: PanelCollapseState, action: CollapseAction): PanelCollapseState {
    switch (action.type) {
        case "auto-collapse":
            if (state.hasAutoCollapsed || state.userOverrode) return state;
            return { ...state, expanded: false, hasAutoCollapsed: true };

        case "manual-toggle":
            if (!state.expanded) {
                return { ...state, expanded: true, userOverrode: true };
            }
            return { ...state, expanded: false };
    }
}

/** Hook wrapping the collapse reducer for direct use in components. */
export function usePanelCollapse() {
    return useReducer(collapseReducer, initialCollapseState);
}
