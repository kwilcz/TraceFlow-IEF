import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ArrowsInIcon, ArrowsOutIcon } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLogStore } from "@/stores/log-store";
import { useDebuggerContext } from "../debugger-context";
import type { TreeNode, Selection } from "../types";
import { buildTreeStructure } from "./tree-builder";
import { TreeNodeRow } from "./tree-node";
import { useTreeKeyboard } from "./use-tree-keyboard";

// ============================================================================
// Helpers
// ============================================================================

/** Collect all node IDs in the tree. */
function collectAllIds(nodes: TreeNode[]): string[] {
    const ids: string[] = [];
    const stack = [...nodes];
    while (stack.length > 0) {
        const n = stack.pop()!;
        ids.push(n.id);
        if (n.children) stack.push(...n.children);
    }
    return ids;
}

/** Collect default expanded node IDs (userjourney roots + all step nodes). */
function collectStepIds(nodes: TreeNode[]): Set<string> {
    const ids = new Set<string>();
    const stack = [...nodes];
    while (stack.length > 0) {
        const node = stack.pop()!;
        // Auto-expand userjourney root and step nodes
        if (node.type === "userjourney" || node.type === "step") {
            ids.add(node.id);
        }
        if (node.children) {
            stack.push(...node.children);
        }
    }
    return ids;
}

/** Determines whether a tree node matches the current selection. */
function isNodeSelected(node: TreeNode, selection: Selection | null): boolean {
    if (!selection) return false;

    switch (node.type) {
        case "step":
            return selection.type === "step" && selection.stepIndex === node.stepIndex;
        case "technicalProfile":
        case "dcTechnicalProfile":
        case "selectedOption":
            return (
                selection.type === "technicalProfile" &&
                selection.stepIndex === node.stepIndex &&
                selection.itemId === node.label
            );
        case "transformation":
        case "dcTransformation":
            return (
                selection.type === "transformation" &&
                selection.stepIndex === node.stepIndex &&
                selection.itemId === node.label
            );
        case "hrd":
            return selection.type === "hrd" && selection.stepIndex === node.stepIndex;
        case "displayControl":
            return (
                selection.type === "displayControl" &&
                selection.stepIndex === node.stepIndex &&
                selection.itemId === node.metadata?.displayControlId
            );
        default:
            return false;
    }
}

// ============================================================================
// Journey Tree
// ============================================================================

export function JourneyTree() {
    const traceSteps = useLogStore(useShallow((s) => s.traceSteps));
    const tree = useMemo(() => buildTreeStructure(traceSteps), [traceSteps]);

    const { selection, dispatch } = useDebuggerContext();

    // Expand state — step nodes expanded by default
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => collectStepIds(tree));

    // ---- Expand / Collapse ----

    const toggleExpanded = (nodeId: string) => {
        setExpandedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    const expandAll = () => {
        setExpandedNodes(new Set(collectAllIds(tree)));
    };

    const collapseAll = () => {
        setExpandedNodes(new Set());
    };

    const expandMultiple = (nodeIds: string[]) => {
        setExpandedNodes((prev) => {
            const next = new Set(prev);
            for (const id of nodeIds) next.add(id);
            return next;
        });
    };

    // ---- Selection dispatch ----

    const handleNodeSelect = (node: TreeNode) => {
        switch (node.type) {
            case "step":
                dispatch({ type: "select-step", stepIndex: node.stepIndex! });
                break;
            case "technicalProfile":
            case "selectedOption":
            case "dcTechnicalProfile":
                dispatch({ type: "select-tp", stepIndex: node.stepIndex!, tpId: node.label });
                break;
            case "transformation":
            case "dcTransformation":
                dispatch({ type: "select-ct", stepIndex: node.stepIndex!, ctId: node.label });
                break;
            case "hrd":
                dispatch({ type: "select-hrd", stepIndex: node.stepIndex! });
                break;
            case "displayControl":
                dispatch({
                    type: "select-dc",
                    stepIndex: node.stepIndex!,
                    dcId: node.metadata?.displayControlId ?? node.label,
                    metadata: (node.metadata ?? {}) as Record<string, unknown>,
                });
                break;
            // subjourney, userjourney — no dispatch (toggle-only)
        }
    };

    // ---- Keyboard navigation ----

    const { tabbableNodeId, handleKeyDown, handleFocus } = useTreeKeyboard({
        tree,
        expandedIds: expandedNodes,
        onToggleExpand: toggleExpanded,
        onSelect: handleNodeSelect,
        onExpandMultiple: expandMultiple,
    });

    // ---- Recursive renderer (shared across all TreeNodeRow instances) ----

    const renderChildren = (children: TreeNode[], depth: number) =>
        children.map((child, index) => (
            <TreeNodeRow
                key={child.id}
                node={child}
                depth={depth}
                isSelected={isNodeSelected(child, selection)}
                isExpanded={expandedNodes.has(child.id)}
                onSelect={() => handleNodeSelect(child)}
                onToggleExpand={() => toggleExpanded(child.id)}
                renderChildren={renderChildren}
                siblingCount={children.length}
                positionInSet={index + 1}
                tabbableNodeId={tabbableNodeId}
            />
        ));

    // ---- Render ----

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Journey
                </h3>
                <div className="flex items-center gap-1">
                    <button type="button" title="Expand all" onClick={expandAll}>
                        <ArrowsOutIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button type="button" title="Collapse all" onClick={collapseAll}>
                        <ArrowsInIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                </div>
            </div>

            {/* Tree content */}
            <ScrollArea className="flex-1">
                <div
                    role="tree"
                    aria-label="Journey tree"
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    className="py-1"
                >
                    {tree.map((node, index) => (
                        <TreeNodeRow
                            key={node.id}
                            node={node}
                            depth={0}
                            isSelected={isNodeSelected(node, selection)}
                            isExpanded={expandedNodes.has(node.id)}
                            onSelect={() => handleNodeSelect(node)}
                            onToggleExpand={() => toggleExpanded(node.id)}
                            renderChildren={renderChildren}
                            siblingCount={tree.length}
                            positionInSet={index + 1}
                            tabbableNodeId={tabbableNodeId}
                        />
                    ))}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground shrink-0">
                <span>{traceSteps.length} steps</span>
            </div>
        </div>
    );
}
