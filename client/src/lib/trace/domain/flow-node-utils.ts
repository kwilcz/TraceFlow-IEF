/**
 * FlowNode Utilities
 *
 * Pure-function helpers for navigating and querying the FlowNode tree.
 * Used by UI components for FlowNode tree navigation and lookup.
 */

import type { FlowNode, StepFlowData, TechnicalProfileFlowData, ClaimsTransformationFlowData } from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";
import { isStepCompletionHandler } from "@/lib/trace/constants/handlers";

// ============================================================================
// Index Building
// ============================================================================

/**
 * Builds a Map from step position (0-based tree order) → FlowNode for O(1) lookup.
 * Only indexes Step-type nodes. Position matches index into traceSteps[].
 */
export function buildFlowNodeIndex(flowTree: FlowNode): Map<number, FlowNode> {
    const index = new Map<number, FlowNode>();
    let counter = 0;
    walkStepNodes(flowTree, (node) => {
        index.set(counter++, node);
    });
    return index;
}

// ============================================================================
// Node Lookup
// ============================================================================

/**
 * Finds a Step FlowNode by its position (index into traceSteps[]).
 * Returns null if not found.
 */
export function findStepFlowNode(flowTree: FlowNode, stepIndex: number): FlowNode | null {
    const steps = collectStepNodes(flowTree);
    return steps[stepIndex] ?? null;
}

/**
 * Finds a child FlowNode by type and item ID within a step node.
 * Used to locate TP/CT/HRD/DC children for inspector rendering.
 */
export function findChildNode(stepNode: FlowNode, type: FlowNodeType, itemId: string): FlowNode | null {
    for (const child of stepNode.children) {
        if (child.type === type) {
            switch (child.data.type) {
                case FlowNodeType.TechnicalProfile:
                    if (child.data.technicalProfileId === itemId) return child;
                    break;
                case FlowNodeType.ClaimsTransformation:
                    if (child.data.transformationId === itemId) return child;
                    break;
                case FlowNodeType.HomeRealmDiscovery:
                    return child; // only one HRD per step
                case FlowNodeType.DisplayControl:
                    if (child.data.displayControlId === itemId) return child;
                    break;
            }
        }
        // Search nested children (e.g., CT under TP, TP under DC)
        const nested = findChildNode(child, type, itemId);
        if (nested) return nested;
    }
    return null;
}

/**
 * Finds the parent FlowNode of a given node within a tree.
 * Returns null if the node is the root or not found.
 */
export function findParentNode(root: FlowNode, target: FlowNode): FlowNode | null {
    for (const child of root.children) {
        if (child === target) return root;
        const parent = findParentNode(child, target);
        if (parent) return parent;
    }
    return null;
}

// ============================================================================
// Step Navigation (for claims-diff predecessor resolution)
// ============================================================================

/**
 * Collects all Step FlowNodes in tree order (depth-first).
 * Used for previous/next step navigation.
 */
export function collectStepNodes(flowTree: FlowNode): FlowNode[] {
    const steps: FlowNode[] = [];
    walkStepNodes(flowTree, (node) => steps.push(node));
    return steps;
}

/**
 * Finds the previous step node in tree order (the step before the given stepIndex).
 * Returns null if this is the first step.
 */
export function findPreviousStepNode(flowTree: FlowNode, currentStepIndex: number): FlowNode | null {
    if (currentStepIndex <= 0) return null;
    const steps = collectStepNodes(flowTree);
    return steps[currentStepIndex - 1] ?? null;
}

/**
 * Finds the next step node in tree order (the step after the given stepIndex).
 * Returns null if this is the last step.
 */
export function findNextStepNode(flowTree: FlowNode, currentStepIndex: number): FlowNode | null {
    const steps = collectStepNodes(flowTree);
    if (currentStepIndex < 0 || currentStepIndex >= steps.length - 1) return null;
    return steps[currentStepIndex + 1] ?? null;
}

// ============================================================================
// Step Derivation Helpers
// ============================================================================

/**
 * Collects TP IDs from a step's TP children.
 * Includes: direct TPs + TPs nested under other TPs (validation TPs).
 */
export function getStepTpNames(stepNode: FlowNode): string[] {
    const names: string[] = [];
    for (const child of stepNode.children) {
        if (child.type === FlowNodeType.TechnicalProfile) {
            names.push((child.data as TechnicalProfileFlowData).technicalProfileId);
            // Also collect nested validation TPs
            for (const grandchild of child.children) {
                if (grandchild.type === FlowNodeType.TechnicalProfile) {
                    names.push((grandchild.data as TechnicalProfileFlowData).technicalProfileId);
                }
            }
        }
    }
    return names;
}

/**
 * Collects CT IDs from a step's children.
 * Includes: direct orphan CTs + CTs nested under TPs.
 */
export function getStepCtNames(stepNode: FlowNode): string[] {
    const names: string[] = [];
    for (const child of stepNode.children) {
        if (child.type === FlowNodeType.ClaimsTransformation) {
            names.push((child.data as ClaimsTransformationFlowData).transformationId);
        } else if (child.type === FlowNodeType.TechnicalProfile) {
            for (const grandchild of child.children) {
                if (grandchild.type === FlowNodeType.ClaimsTransformation) {
                    names.push((grandchild.data as ClaimsTransformationFlowData).transformationId);
                }
            }
        }
    }
    return names;
}

/**
 * Derives isFinalStep from the step's actionHandler.
 * A step is final when its handler is one of the step-completion handlers
 * (SendClaims, SendClaimsAction, SendRelyingPartyResponse, SendResponse).
 */
export function isStepFinal(stepData: StepFlowData): boolean {
    return !!stepData.actionHandler && isStepCompletionHandler(stepData.actionHandler);
}

/**
 * Derives isInteractiveStep from the step's children.
 * A step is interactive if it has HRD or DisplayControl children.
 */
export function isStepInteractive(stepNode: FlowNode): boolean {
    return stepNode.children.some(
        (c) => c.type === FlowNodeType.HomeRealmDiscovery || c.type === FlowNodeType.DisplayControl,
    );
}

// ============================================================================
// Id-based Lookup
// ============================================================================

/**
 * Builds a Map from FlowNode.id → FlowNode for O(1) id-based lookup.
 * Indexes all node types (root, subjourney, step, tp, ct, hrd, dc, sendClaims).
 */
export function buildFlowNodeIndexById(flowTree: FlowNode): Map<string, FlowNode> {
    const index = new Map<string, FlowNode>();
    walkAllNodes(flowTree, (node) => {
        index.set(node.id, node);
    });
    return index;
}

/**
 * Finds a Step FlowNode by its unique id (e.g., "step-AuthN-LocalOnly-1").
 * Returns null if not found.
 */
export function findStepFlowNodeById(flowTree: FlowNode, nodeId: string): FlowNode | null {
    let found: FlowNode | null = null;
    walkAllNodes(flowTree, (node) => {
        if (node.id === nodeId) found = node;
    });
    return found;
}

/**
 * Returns the tree-order position (0-based) of a step node identified by id.
 * Returns -1 if the node is not a step or not found.
 */
export function getStepPosition(flowTree: FlowNode, stepNodeId: string): number {
    const steps = collectStepNodes(flowTree);
    return steps.findIndex((s) => s.id === stepNodeId);
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Walks the FlowNode tree depth-first and calls the callback for each Step node.
 */
function walkStepNodes(node: FlowNode, callback: (node: FlowNode) => void): void {
    if (node.type === FlowNodeType.Step) {
        callback(node);
    }
    for (const child of node.children) {
        walkStepNodes(child, callback);
    }
}

/**
 * Walks all FlowNodes depth-first regardless of type.
 */
function walkAllNodes(node: FlowNode, callback: (node: FlowNode) => void): void {
    callback(node);
    for (const child of node.children) {
        walkAllNodes(child, callback);
    }
}
