/**
 * FlowNode Utilities
 *
 * Pure-function helpers for navigating and querying the FlowNode tree.
 * Used by UI components for FlowNode tree navigation and lookup.
 */

import type { FlowNode, StepFlowData, TechnicalProfileFlowData, ClaimsTransformationFlowData } from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";

// ============================================================================
// Index Building
// ============================================================================

/**
 * Builds a Map from stepIndex → FlowNode for O(1) lookup.
 * Only indexes Step-type nodes.
 */
export function buildFlowNodeIndex(flowTree: FlowNode): Map<number, FlowNode> {
    const index = new Map<number, FlowNode>();
    walkStepNodes(flowTree, (node) => {
        if (node.data.type === FlowNodeType.Step) {
            index.set(node.data.stepIndex, node);
        }
    });
    return index;
}

// ============================================================================
// Node Lookup
// ============================================================================

/**
 * Finds a Step FlowNode by its stepIndex (index into traceSteps[]).
 * Returns null if not found.
 */
export function findStepFlowNode(flowTree: FlowNode, stepIndex: number): FlowNode | null {
    let found: FlowNode | null = null;
    walkStepNodes(flowTree, (node) => {
        if (node.data.type === FlowNodeType.Step && node.data.stepIndex === stepIndex) {
            found = node;
        }
    });
    return found;
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
    const steps = collectStepNodes(flowTree);
    const currentIdx = steps.findIndex(
        (n) => n.data.type === FlowNodeType.Step && n.data.stepIndex === currentStepIndex,
    );
    if (currentIdx <= 0) return null;
    return steps[currentIdx - 1];
}

/**
 * Finds the next step node in tree order (the step after the given stepIndex).
 * Returns null if this is the last step.
 */
export function findNextStepNode(flowTree: FlowNode, currentStepIndex: number): FlowNode | null {
    const steps = collectStepNodes(flowTree);
    const currentIdx = steps.findIndex(
        (n) => n.data.type === FlowNodeType.Step && n.data.stepIndex === currentStepIndex,
    );
    if (currentIdx < 0 || currentIdx >= steps.length - 1) return null;
    return steps[currentIdx + 1];
}

// ============================================================================
// Step Derivation Helpers
// ============================================================================

/**
 * Collects TP IDs from a step's direct TP children.
 */
export function getStepTpNames(stepNode: FlowNode): string[] {
    return stepNode.children
        .filter((c) => c.type === FlowNodeType.TechnicalProfile)
        .map((c) => (c.data as TechnicalProfileFlowData).technicalProfileId);
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
 * A step is final when its handler is "SendClaims" (token issuance).
 */
export function isStepFinal(stepData: StepFlowData): boolean {
    return stepData.actionHandler === "SendClaims";
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
