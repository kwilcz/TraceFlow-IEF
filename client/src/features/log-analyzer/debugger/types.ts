import type { StepResult } from "@/types/trace";
import type { FlowNode } from "@/types/flow-node";

// ============================================================================
// Selection State
// ============================================================================

/** Selection state — which tree item is active in the debugger. */
export interface Selection {
    type: "step" | "technicalProfile" | "transformation" | "hrd" | "displayControl";
    nodeId: string;
    /** For TP, CT, or selected option */
    itemId?: string;
    /** For displayControl-specific data (displayControlId, action, etc.) */
    metadata?: Record<string, unknown>;
}

/** Actions for the selection reducer. */
export type SelectionAction =
    | { type: "select-step"; nodeId: string }
    | { type: "select-tp"; nodeId: string; tpId: string }
    | { type: "select-ct"; nodeId: string; ctId: string }
    | { type: "select-hrd"; nodeId: string }
    | { type: "select-dc"; nodeId: string; dcId: string; metadata: Record<string, unknown> }
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
    | "hrdOption"
    | "selectedOption"
    | "displayControl"
    | "dcTechnicalProfile"
    | "dcTransformation";

/** Metadata carried by tree nodes for rendering badges and icons. */
export interface TreeNodeMetadata {
    result?: StepResult;
    isInteractive?: boolean;
    isHrdStep?: boolean;
    isFinalStep?: boolean;
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
    nodeId?: string;
    /** The FlowNode this tree node was built from. */
    flowNode?: FlowNode;
    metadata?: TreeNodeMetadata;
}
