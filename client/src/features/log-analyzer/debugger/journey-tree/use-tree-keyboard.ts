import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { TreeNode } from "../types";

// ============================================================================
// Helpers
// ============================================================================

/** Flatten tree into visible nodes (only nodes whose ancestors are all expanded). */
function flattenVisible(nodes: TreeNode[], expandedIds: Set<string>): TreeNode[] {
    const result: TreeNode[] = [];
    function walk(list: TreeNode[]) {
        for (const node of list) {
            result.push(node);
            if (node.children?.length && expandedIds.has(node.id)) {
                walk(node.children);
            }
        }
    }
    walk(nodes);
    return result;
}

/** Build a map from node ID → parent node ID. */
function buildParentMap(nodes: TreeNode[]): Map<string, string> {
    const map = new Map<string, string>();
    function walk(list: TreeNode[], parentId: string | null) {
        for (const node of list) {
            if (parentId !== null) map.set(node.id, parentId);
            if (node.children) walk(node.children, node.id);
        }
    }
    walk(nodes, null);
    return map;
}

/** Build a map from node ID → sibling list (the array the node lives in). */
function buildSiblingsMap(nodes: TreeNode[]): Map<string, TreeNode[]> {
    const map = new Map<string, TreeNode[]>();
    function walk(list: TreeNode[]) {
        for (const node of list) {
            map.set(node.id, list);
            if (node.children) walk(node.children);
        }
    }
    walk(nodes);
    return map;
}

/** Collect all node IDs in the tree (regardless of expansion state). */
function collectAllNodeIds(nodes: TreeNode[]): Set<string> {
    const ids = new Set<string>();
    function walk(list: TreeNode[]) {
        for (const node of list) {
            ids.add(node.id);
            if (node.children) walk(node.children);
        }
    }
    walk(nodes);
    return ids;
}

// ============================================================================
// Hook
// ============================================================================

interface UseTreeKeyboardOptions {
    /** Root-level tree nodes. */
    tree: TreeNode[];
    /** Currently expanded node IDs. */
    expandedIds: Set<string>;
    /** Toggle a single node's expanded state. */
    onToggleExpand: (nodeId: string) => void;
    /** Select (activate) a node. */
    onSelect: (node: TreeNode) => void;
    /** Expand multiple nodes at once (for `*` key). */
    onExpandMultiple: (nodeIds: string[]) => void;
}

interface UseTreeKeyboardReturn {
    /** The actively keyboard-focused node (null before first interaction). */
    focusedNodeId: string | null;
    /** The node that should receive `tabindex="0"` (defaults to first visible). */
    tabbableNodeId: string | null;
    /** Update focused node imperatively (e.g. after click). */
    setFocusedNodeId: (id: string | null) => void;
    /** Attach to tree container `onKeyDown`. */
    handleKeyDown: (e: React.KeyboardEvent) => void;
    /** Attach to tree container `onFocus` to capture Tab entry. */
    handleFocus: (e: React.FocusEvent) => void;
}

export function useTreeKeyboard({
    tree,
    expandedIds,
    onToggleExpand,
    onSelect,
    onExpandMultiple,
}: UseTreeKeyboardOptions): UseTreeKeyboardReturn {
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

    // -- Derived lookup structures ------------------------------------------

    const visibleNodes = useMemo(() => flattenVisible(tree, expandedIds), [tree, expandedIds]);
    const visibleIdSet = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
    const visibleIndexMap = useMemo(
        () => new Map(visibleNodes.map((n, i) => [n.id, i])),
        [visibleNodes],
    );
    const allNodeIds = useMemo(() => collectAllNodeIds(tree), [tree]);
    const parentMap = useMemo(() => buildParentMap(tree), [tree]);
    const siblingsMap = useMemo(() => buildSiblingsMap(tree), [tree]);

    /** The node that should carry `tabindex="0"`. Falls back to first visible. */
    const tabbableNodeId = focusedNodeId ?? visibleNodes[0]?.id ?? null;

    // -- Focus recovery: node hidden after collapse -------------------------

    useEffect(() => {
        if (!focusedNodeId) return;
        if (visibleIdSet.has(focusedNodeId)) return;

        // Walk up the parent chain to the closest visible ancestor
        let current: string | undefined = focusedNodeId;
        while (current) {
            const pid = parentMap.get(current);
            if (pid && visibleIdSet.has(pid)) {
                setFocusedNodeId(pid);
                return;
            }
            current = pid;
        }
        // No visible ancestor — fall back to first visible node
        setFocusedNodeId(visibleNodes[0]?.id ?? null);
    }, [focusedNodeId, visibleIdSet, parentMap, visibleNodes]);

    // -- Focus recovery: node deleted after tree rebuild --------------------

    useEffect(() => {
        if (!focusedNodeId) return;
        if (allNodeIds.has(focusedNodeId)) return;
        setFocusedNodeId(tree[0]?.id ?? null);
    }, [focusedNodeId, allNodeIds, tree]);

    // -- DOM focus management -----------------------------------------------

    useEffect(() => {
        if (focusedNodeId) {
            const el = document.getElementById(focusedNodeId);
            if (el) {
                el.focus({ preventScroll: true });
                el.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        }
    }, [focusedNodeId]);

    // -- Keyboard handler ---------------------------------------------------

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (visibleNodes.length === 0) return;

            const currentIndex = focusedNodeId
                ? (visibleIndexMap.get(focusedNodeId) ?? -1)
                : -1;
            const currentNode = currentIndex >= 0 ? visibleNodes[currentIndex] : null;

            let handled = true;

            switch (e.key) {
                // ---- Linear navigation ----
                case "ArrowDown": {
                    if (currentIndex < 0) {
                        setFocusedNodeId(visibleNodes[0].id);
                    } else if (currentIndex < visibleNodes.length - 1) {
                        setFocusedNodeId(visibleNodes[currentIndex + 1].id);
                    }
                    break;
                }
                case "ArrowUp": {
                    if (currentIndex < 0) {
                        setFocusedNodeId(visibleNodes[visibleNodes.length - 1].id);
                    } else if (currentIndex > 0) {
                        setFocusedNodeId(visibleNodes[currentIndex - 1].id);
                    }
                    break;
                }

                // ---- Hierarchical navigation ----
                case "ArrowRight": {
                    if (!currentNode) break;
                    const hasKids = (currentNode.children?.length ?? 0) > 0;
                    if (hasKids && !expandedIds.has(currentNode.id)) {
                        // Collapsed → expand
                        onToggleExpand(currentNode.id);
                    } else if (hasKids && expandedIds.has(currentNode.id)) {
                        // Expanded → move to first child
                        setFocusedNodeId(currentNode.children![0].id);
                    }
                    // Leaf → no-op
                    break;
                }
                case "ArrowLeft": {
                    if (!currentNode) break;
                    const hasKids = (currentNode.children?.length ?? 0) > 0;
                    if (hasKids && expandedIds.has(currentNode.id)) {
                        // Expanded → collapse
                        onToggleExpand(currentNode.id);
                    } else {
                        // Collapsed or leaf → move to parent
                        const pid = parentMap.get(currentNode.id);
                        if (pid) setFocusedNodeId(pid);
                    }
                    break;
                }

                // ---- Activation ----
                case "Enter": {
                    if (currentNode) onSelect(currentNode);
                    break;
                }
                case " ": {
                    // NOTE: Space toggles expand/collapse — extension beyond WAI-ARIA single-select spec.
                    // WAI-ARIA only defines Space for multi-select trees. We add it here for UX
                    // consistency with desktop tree controls (VS Code, Windows Explorer).
                    if (currentNode) {
                        const hasKids = (currentNode.children?.length ?? 0) > 0;
                        if (hasKids) onToggleExpand(currentNode.id);
                    }
                    break;
                }

                // ---- Jump navigation ----
                case "Home": {
                    setFocusedNodeId(visibleNodes[0].id);
                    break;
                }
                case "End": {
                    setFocusedNodeId(visibleNodes[visibleNodes.length - 1].id);
                    break;
                }

                // ---- Expand siblings ----
                case "*": {
                    if (currentNode) {
                        const siblings = siblingsMap.get(currentNode.id);
                        if (siblings) {
                            const toExpand = siblings
                                .filter((s) => (s.children?.length ?? 0) > 0 && !expandedIds.has(s.id))
                                .map((s) => s.id);
                            if (toExpand.length > 0) onExpandMultiple(toExpand);
                        }
                    }
                    break;
                }

                default:
                    handled = false;
            }

            if (handled) {
                e.preventDefault();
                e.stopPropagation();
            }
        },
        [visibleNodes, visibleIndexMap, focusedNodeId, expandedIds, onToggleExpand, onSelect, parentMap, siblingsMap, onExpandMultiple],
    );

    // -- Focus event (Tab entry) --------------------------------------------

    // Use a ref so handleFocus doesn't re-create on every focus change
    const focusedNodeIdRef = useRef(focusedNodeId);
    focusedNodeIdRef.current = focusedNodeId;

    const handleFocus = useCallback((e: React.FocusEvent) => {
        const target = e.target as HTMLElement;
        if (target.getAttribute("role") === "treeitem" && target.id) {
            if (target.id !== focusedNodeIdRef.current) {
                setFocusedNodeId(target.id);
            }
        }
    }, []);

    return {
        focusedNodeId,
        tabbableNodeId,
        setFocusedNodeId,
        handleKeyDown,
        handleFocus,
    };
}
