import type { TraceStep } from "@/types/trace";

// ============================================================================
// Selection State
// ============================================================================

/** Selection state — which tree item is active in the debugger. */
export interface Selection {
    type: "step" | "technicalProfile" | "transformation" | "hrd" | "displayControl";
    stepIndex: number;
    /** For TP, CT, or selected option */
    itemId?: string;
    /** For displayControl-specific data (displayControlId, action, etc.) */
    metadata?: Record<string, unknown>;
}

/** Actions for the selection reducer. */
export type SelectionAction =
    | { type: "select-step"; stepIndex: number }
    | { type: "select-tp"; stepIndex: number; tpId: string }
    | { type: "select-ct"; stepIndex: number; ctId: string }
    | { type: "select-hrd"; stepIndex: number }
    | { type: "select-dc"; stepIndex: number; dcId: string; metadata: Record<string, unknown> }
    | { type: "clear" };

// ============================================================================
// Tree Node
// ============================================================================

/** Discriminated node type for the journey tree sidebar. */
export type TreeNodeType =
    | "userjourney"
    | "subjourney"
    | "step"
    | "technicalProfile"
    | "transformation"
    | "hrd"
    | "selectedOption"
    | "displayControl"
    | "dcTechnicalProfile"
    | "dcTransformation";

/** Metadata carried by tree nodes for rendering badges and icons. */
export interface TreeNodeMetadata {
    result?: TraceStep["result"];
    isInteractive?: boolean;
    isHrdStep?: boolean;
    duration?: number;
    tpCount?: number;
    ctCount?: number;
    isHrdSelection?: boolean;
    selectedOption?: string;
    selectableOptions?: string[];
    /** Display-control–specific fields */
    displayControlId?: string;
    action?: string;
    technicalProfileId?: string;
    resultCode?: string;
    /** For DC-nested items */
    parentDisplayControlId?: string;
    /** For TP-nested CTs */
    parentTechnicalProfileId?: string;
}

/** Tree node structure for the journey tree sidebar. */
export interface TreeNode {
    id: string;
    label: string;
    type: TreeNodeType;
    children?: TreeNode[];
    /** Reference to the full TraceStep (for step nodes). */
    step?: TraceStep;
    stepIndex?: number;
    metadata?: TreeNodeMetadata;
}
