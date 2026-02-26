import type { TreeNode } from "../types";
import type {
    FlowNode,
    StepFlowData,
    TechnicalProfileFlowData,
    ClaimsTransformationFlowData,
    HomeRealmDiscoveryFlowData,
    DisplayControlFlowData,
} from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";

// ============================================================================
// Tree Builder — Pure Functions
// ============================================================================
// Builds TreeNode[] for the journey tree sidebar from a FlowNode tree.
//
// The FlowNode tree encodes the correct hierarchy:
//   Root → SubJourney → Step → TP/CT/HRD/DC
// Step children are walked directly — no TraceStep[] lookup needed.
// ============================================================================

/**
 * Builds the full tree structure from a FlowNode tree.
 *
 * The hierarchy is driven by the FlowNode tree structure
 * (root → subjourneys → steps → TPs/CTs/DCs/HRD).
 * Returns empty array when flowTree is null or has no children.
 */
export function buildTreeStructure(flowTree: FlowNode | null): TreeNode[] {
    if (!flowTree || flowTree.children.length === 0) {
        return [];
    }

    const rootMeta = computeSubtreeMetadata(flowTree);
    const rootNode: TreeNode = {
        id: `userjourney-${flowTree.name}`,
        label: flowTree.name,
        type: "userjourney",
        metadata: {
            tpCount: rootMeta.tpCount,
            result: rootMeta.result,
        },
        children: buildFlowChildren(flowTree),
    };
    return [rootNode];
}

/**
 * Recursively builds TreeNode children from a FlowNode's children.
 *
 * SubJourney FlowNodes become subjourney TreeNodes with recursive children.
 * Step FlowNodes are built from their FlowNode children.
 */
function buildFlowChildren(parent: FlowNode): TreeNode[] {
    const children: TreeNode[] = [];

    for (const child of parent.children) {
        if (child.type === FlowNodeType.SubJourney && child.data.type === FlowNodeType.SubJourney) {
            const sjMeta = computeSubtreeMetadata(child);
            const sjChildren = buildFlowChildren(child);
            children.push({
                id: `journey-${child.data.journeyId}`,
                label: child.name,
                type: "subjourney",
                metadata: {
                    tpCount: sjMeta.tpCount,
                    result: sjMeta.result,
                },
                children: sjChildren.length > 0 ? sjChildren : undefined,
            });
        } else if (child.type === FlowNodeType.Step) {
            children.push(buildStepNode(child));
        }
    }

    return children;
}

/**
 * Walks a FlowNode subtree and aggregates TP count and error status
 * from StepFlowData.
 */
function computeSubtreeMetadata(
    node: FlowNode,
): { tpCount: number; result: "Error" | "Success" } {
    let tpCount = 0;
    let hasError = false;

    function walk(n: FlowNode): void {
        for (const child of n.children) {
            if (child.type === FlowNodeType.Step && child.data.type === FlowNodeType.Step) {
                tpCount += child.children.filter((c: FlowNode) => c.type === FlowNodeType.TechnicalProfile).length;
                if (child.data.result === "Error") hasError = true;
            }
            walk(child);
        }
    }
    walk(node);

    return { tpCount, result: hasError ? "Error" : "Success" };
}

// ============================================================================
// Step children categorization
// ============================================================================

interface CategorizedChildren {
    tp: FlowNode[];
    ct: FlowNode[];
    hrd: FlowNode | null;
    dc: FlowNode[];
}

/**
 * Categorizes a step node's children by FlowNodeType.
 */
function categorizeStepChildren(stepNode: FlowNode): CategorizedChildren {
    const tp: FlowNode[] = [];
    const ct: FlowNode[] = [];
    let hrd: FlowNode | null = null;
    const dc: FlowNode[] = [];

    for (const child of stepNode.children) {
        switch (child.type) {
            case FlowNodeType.TechnicalProfile:
                tp.push(child);
                break;
            case FlowNodeType.ClaimsTransformation:
                ct.push(child);
                break;
            case FlowNodeType.HomeRealmDiscovery:
                hrd = child;
                break;
            case FlowNodeType.DisplayControl:
                dc.push(child);
                break;
        }
    }

    return { tp, ct, hrd, dc };
}

// ============================================================================
// Child node builders
// ============================================================================

/**
 * Builds a TP TreeNode from a TP FlowNode, recursing for nested
 * validation TPs and claims transformations.
 */
function buildTpTreeNode(tpNode: FlowNode, seq: number, stepIndex: number): TreeNode {
    const data = tpNode.data as TechnicalProfileFlowData;
    const tpChildren: TreeNode[] = [];

    for (const child of tpNode.children) {
        if (child.type === FlowNodeType.TechnicalProfile) {
            // Nested validation TP
            tpChildren.push(buildTpTreeNode(child, seq, stepIndex));
        } else if (child.type === FlowNodeType.ClaimsTransformation) {
            const ctData = child.data as ClaimsTransformationFlowData;
            tpChildren.push({
                id: `tp-ct-${seq}-${data.technicalProfileId}-${ctData.transformationId}`,
                label: ctData.transformationId,
                type: "transformation",
                stepIndex,
                flowNode: child,
                metadata: { parentTechnicalProfileId: data.technicalProfileId },
            });
        }
    }

    return {
        id: `tp-${seq}-${data.technicalProfileId}`,
        label: data.technicalProfileId,
        type: "technicalProfile",
        stepIndex,
        flowNode: tpNode,
        children: tpChildren.length > 0 ? tpChildren : undefined,
    };
}

/**
 * Builds a DC TreeNode from a DC FlowNode, recursing for nested
 * TPs and their CTs.
 */
function buildDcTreeNode(dcNode: FlowNode, seq: number, stepIndex: number): TreeNode {
    const data = dcNode.data as DisplayControlFlowData;
    const dcChildren: TreeNode[] = [];

    for (const child of dcNode.children) {
        if (child.type === FlowNodeType.TechnicalProfile) {
            const tpData = child.data as TechnicalProfileFlowData;
            const dcTpChildren: TreeNode[] = [];

            for (const grandchild of child.children) {
                if (grandchild.type === FlowNodeType.ClaimsTransformation) {
                    const ctData = grandchild.data as ClaimsTransformationFlowData;
                    dcTpChildren.push({
                        id: `dc-ct-${seq}-${data.displayControlId}-${data.action}-${tpData.technicalProfileId}-${ctData.transformationId}`,
                        label: ctData.transformationId,
                        type: "dcTransformation",
                        stepIndex,
                        flowNode: grandchild,
                        metadata: { parentDisplayControlId: data.displayControlId },
                    });
                }
            }

            dcChildren.push({
                id: `dc-tp-${seq}-${data.displayControlId}-${data.action}-${tpData.technicalProfileId}`,
                label: tpData.technicalProfileId,
                type: "dcTechnicalProfile",
                stepIndex,
                flowNode: child,
                children: dcTpChildren.length > 0 ? dcTpChildren : undefined,
                metadata: { parentDisplayControlId: data.displayControlId },
            });
        }
    }

    const dcLabel = data.action
        ? `${data.displayControlId} → ${data.action}`
        : data.displayControlId;

    return {
        id: `dc-${seq}-${data.displayControlId}-${data.action}`,
        label: dcLabel,
        type: "displayControl",
        stepIndex,
        flowNode: dcNode,
        children: dcChildren.length > 0 ? dcChildren : undefined,
        metadata: {
            displayControlId: data.displayControlId,
            action: data.action,
            resultCode: data.resultCode,
        },
    };
}

/**
 * Builds an HRD TreeNode from an HRD FlowNode.
 *
 * Selectable options become children (selectedOption / hrdOption).
 * Validation TP TreeNodes are nested under the selected option.
 */
function buildHrdTreeNode(
    hrdNode: FlowNode,
    seq: number,
    stepIndex: number,
    vtpNodes?: TreeNode[],
): TreeNode {
    const data = hrdNode.data as HomeRealmDiscoveryFlowData;

    const children: TreeNode[] = data.selectableOptions.map((provider) => {
        const isSelected = provider === data.selectedOption;
        return {
            id: `hrd-${seq}-${provider}`,
            label: provider,
            type: isSelected ? ("selectedOption" as const) : ("hrdOption" as const),
            stepIndex,
            metadata: isSelected ? { selectedOption: provider } : undefined,
            children: isSelected && vtpNodes && vtpNodes.length > 0 ? vtpNodes : undefined,
        };
    });

    return {
        id: `hrd-${seq}`,
        label: "HomeRealmDiscovery",
        type: "hrd",
        stepIndex,
        flowNode: hrdNode,
        metadata: {
            isHrdSelection: true,
            selectableOptions: data.selectableOptions,
            selectedOption: data.selectedOption,
            isInteractive: true,
        },
        children: children.length > 0 ? children : undefined,
    };
}

// ============================================================================
// Step node builder
// ============================================================================

/**
 * Builds a tree node for a single step from its FlowNode.
 *
 * The FlowNode tree already encodes the correct hierarchy:
 * - TP children have nested VTP and CT children
 * - DC children have nested TP children with CT children
 * - HRD child carries selectable options
 * - Orphan CTs are direct children of the step
 *
 * Visual parity is maintained by nesting DC TreeNodes under the
 * SelfAsserted TP when one exists.
 */
export function buildStepNode(stepNode: FlowNode): TreeNode {
    const data = stepNode.data as StepFlowData;
    const seq = stepNode.context.sequenceNumber;
    const stepIndex = data.stepIndex;

    const { tp, ct, hrd, dc } = categorizeStepChildren(stepNode);

    // Build DC TreeNodes
    const dcNodes = dc.map((d) => buildDcTreeNode(d, seq, stepIndex));

    // Find SelfAsserted TP
    const selfAssertedTpNode = tp.find(
        (t) =>
            t.data.type === FlowNodeType.TechnicalProfile &&
            t.data.providerType === "SelfAssertedAttributeProvider",
    );

    const isHrdStep = hrd !== null;

    // ── Build TP TreeNodes ───────────────────────────────────────────
    const tpNodes: TreeNode[] = [];
    let vtpNodes: TreeNode[] = [];

    for (const tpChild of tp) {
        const tpData = tpChild.data as TechnicalProfileFlowData;

        // In HRD steps, the selected option TP is suppressed at step level.
        // Its validation TP children are extracted for HRD nesting.
        if (
            isHrdStep &&
            hrd!.data.type === FlowNodeType.HomeRealmDiscovery &&
            tpData.technicalProfileId === hrd!.data.selectedOption
        ) {
            vtpNodes = tpChild.children
                .filter((c) => c.type === FlowNodeType.TechnicalProfile)
                .map((c) => buildTpTreeNode(c, seq, stepIndex));
            continue;
        }

        tpNodes.push(buildTpTreeNode(tpChild, seq, stepIndex));
    }

    // ── Assemble children array ──────────────────────────────────────
    const children: TreeNode[] = [];

    // HRD node first (with VTPs under selected option)
    if (hrd) {
        children.push(buildHrdTreeNode(hrd, seq, stepIndex, vtpNodes));
    }

    if (selfAssertedTpNode && !isHrdStep) {
        // Nest DCs under SelfAsserted TP for visual parity
        const saData = selfAssertedTpNode.data as TechnicalProfileFlowData;
        const saTreeNode = tpNodes.find((t) => t.label === saData.technicalProfileId);
        if (saTreeNode) {
            saTreeNode.children = [...(saTreeNode.children || []), ...dcNodes];
        }
        children.push(...tpNodes);
    } else {
        children.push(...tpNodes);
        if (dcNodes.length > 0) children.push(...dcNodes);
    }

    // Orphan CTs at step level
    for (const ctChild of ct) {
        const ctData = ctChild.data as ClaimsTransformationFlowData;
        children.push({
            id: `ct-${seq}-${ctData.transformationId}`,
            label: ctData.transformationId,
            type: "transformation",
            stepIndex,
            flowNode: ctChild,
        });
    }

    // ── Primary label ────────────────────────────────────────────────
    const tpNames = stepNode.children
        .filter((c) => c.type === FlowNodeType.TechnicalProfile)
        .map((c) => (c.data as TechnicalProfileFlowData).technicalProfileId);
    const primaryLabel = tpNames[0] || data.uiSettings?.pageType || data.actionHandler || "Unknown";

    return {
        id: `step-${seq}`,
        label: `Step ${data.stepOrder} — ${primaryLabel}`,
        type: "step",
        stepIndex,
        flowNode: stepNode,
        metadata: {
            result: data.result,
            isInteractive: stepNode.children.some(
                (c) => c.type === FlowNodeType.HomeRealmDiscovery || c.type === FlowNodeType.DisplayControl,
            ),
            isHrdStep,
            isFinalStep: data.actionHandler === "SendClaims",
            duration: data.duration,
            tpCount: tpNames.length,
            ctCount: stepNode.children.filter(
                (c) => c.type === FlowNodeType.ClaimsTransformation,
            ).length + stepNode.children
                .filter((c) => c.type === FlowNodeType.TechnicalProfile)
                .reduce((sum, tp) => sum + tp.children.filter(
                    (gc) => gc.type === FlowNodeType.ClaimsTransformation,
                ).length, 0),
            selectableOptions: data.selectableOptions,
            selectedOption: data.selectedOption,
        },
        children: children.length > 0 ? children : undefined,
    };
}
