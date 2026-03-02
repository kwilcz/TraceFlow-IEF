import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import type { Selection, SelectionAction } from "./types";

// ============================================================================
// Pure Reducer — exported for unit testing
// ============================================================================

/**
 * Reduces selection actions into the current selection state.
 *
 * Each action maps to a specific `Selection.type`:
 * - `select-step`  → step-level selection
 * - `select-tp`    → technical profile selection
 * - `select-ct`    → claims transformation selection
 * - `select-hrd`   → HRD selection
 * - `select-dc`    → display-control selection (with metadata)
 * - `clear`        → deselects everything
 */
export function selectionReducer(state: Selection | null, action: SelectionAction): Selection | null {
    switch (action.type) {
        case "select-step":
            return { type: "step", nodeId: action.nodeId };
        case "select-tp":
            return { type: "technicalProfile", nodeId: action.nodeId, itemId: action.tpId };
        case "select-ct":
            return { type: "transformation", nodeId: action.nodeId, itemId: action.ctId };
        case "select-hrd":
            return { type: "hrd", nodeId: action.nodeId };
        case "select-dc":
            return { type: "displayControl", nodeId: action.nodeId, itemId: action.dcId, metadata: action.metadata };
        case "clear":
            return null;
        default:
            return state;
    }
}

// ============================================================================
// Context
// ============================================================================

interface DebuggerContextValue {
    selection: Selection | null;
    dispatch: Dispatch<SelectionAction>;
}

const DebuggerContext = createContext<DebuggerContextValue | null>(null);

/** Provides selection state and dispatch to the debugger workspace tree. */
export function DebuggerProvider({ children }: { children: ReactNode }) {
    const [selection, dispatch] = useReducer(selectionReducer, null);

    return (
        <DebuggerContext.Provider value={{ selection, dispatch }}>
            {children}
        </DebuggerContext.Provider>
    );
}

/**
 * Access the debugger selection context.
 * @throws if used outside `<DebuggerProvider>`.
 */
export function useDebuggerContext(): DebuggerContextValue {
    const ctx = useContext(DebuggerContext);
    if (!ctx) throw new Error("useDebuggerContext must be used within a <DebuggerProvider>");
    return ctx;
}
