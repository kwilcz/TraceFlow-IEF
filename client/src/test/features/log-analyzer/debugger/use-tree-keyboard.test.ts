import { renderHook, cleanup } from "@testing-library/react";
import { act } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useTreeKeyboard } from "@/features/log-analyzer/debugger/journey-tree/use-tree-keyboard";
import type { TreeNode } from "@/features/log-analyzer/debugger/types";

// ============================================================================
// Helpers
// ============================================================================

function node(id: string, children?: TreeNode[]): TreeNode {
    return { id, label: id, type: "step" as const, children };
}

function makeKeyEvent(key: string): React.KeyboardEvent {
    return {
        key,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
    } as unknown as React.KeyboardEvent;
}

function defaultCallbacks() {
    return {
        onToggleExpand: vi.fn(),
        onSelect: vi.fn(),
        onExpandMultiple: vi.fn(),
    };
}

// ============================================================================
// Tests
// ============================================================================

afterEach(cleanup);

describe("useTreeKeyboard", () => {
    // 1
    it("initial state: tabbableNodeId defaults to first visible node when focusedNodeId is null", () => {
        const tree = [node("A"), node("B"), node("C")];
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set<string>(),
                ...defaultCallbacks(),
            }),
        );

        expect(result.current.focusedNodeId).toBeNull();
        expect(result.current.tabbableNodeId).toBe("A");
    });

    // 2
    it("ArrowDown moves focus to next visible node", () => {
        const tree = [node("A", [node("B"), node("C")]), node("D")];
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set(["A"]),
                ...defaultCallbacks(),
            }),
        );

        act(() => result.current.setFocusedNodeId("A"));
        act(() => result.current.handleKeyDown(makeKeyEvent("ArrowDown")));

        expect(result.current.focusedNodeId).toBe("B");
    });

    // 3
    it("ArrowUp moves focus to previous visible node", () => {
        const tree = [node("A", [node("B"), node("C")]), node("D")];
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set(["A"]),
                ...defaultCallbacks(),
            }),
        );

        act(() => result.current.setFocusedNodeId("C"));
        act(() => result.current.handleKeyDown(makeKeyEvent("ArrowUp")));

        expect(result.current.focusedNodeId).toBe("B");
    });

    // 4
    it("ArrowDown at last node is a no-op", () => {
        const tree = [node("A", [node("B"), node("C")]), node("D")];
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set(["A"]),
                ...defaultCallbacks(),
            }),
        );

        act(() => result.current.setFocusedNodeId("D"));
        act(() => result.current.handleKeyDown(makeKeyEvent("ArrowDown")));

        expect(result.current.focusedNodeId).toBe("D");
    });

    // 5
    it("ArrowUp at first node is a no-op", () => {
        const tree = [node("A", [node("B"), node("C")]), node("D")];
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set(["A"]),
                ...defaultCallbacks(),
            }),
        );

        act(() => result.current.setFocusedNodeId("A"));
        act(() => result.current.handleKeyDown(makeKeyEvent("ArrowUp")));

        expect(result.current.focusedNodeId).toBe("A");
    });

    // 6
    it("ArrowRight on collapsed node calls onToggleExpand", () => {
        const tree = [node("A", [node("B"), node("C")])];
        const callbacks = defaultCallbacks();
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set<string>(),
                ...callbacks,
            }),
        );

        act(() => result.current.setFocusedNodeId("A"));
        act(() => result.current.handleKeyDown(makeKeyEvent("ArrowRight")));

        expect(callbacks.onToggleExpand).toHaveBeenCalledWith("A");
    });

    // 7
    it("ArrowRight on expanded node moves focus to first child", () => {
        const tree = [node("A", [node("B"), node("C")])];
        const callbacks = defaultCallbacks();
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set(["A"]),
                ...callbacks,
            }),
        );

        act(() => result.current.setFocusedNodeId("A"));
        act(() => result.current.handleKeyDown(makeKeyEvent("ArrowRight")));

        expect(result.current.focusedNodeId).toBe("B");
    });

    // 8
    it("ArrowRight on leaf is a no-op", () => {
        const tree = [node("A", [node("B"), node("C")])];
        const callbacks = defaultCallbacks();
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set(["A"]),
                ...callbacks,
            }),
        );

        act(() => result.current.setFocusedNodeId("B"));
        act(() => result.current.handleKeyDown(makeKeyEvent("ArrowRight")));

        expect(result.current.focusedNodeId).toBe("B");
        expect(callbacks.onToggleExpand).not.toHaveBeenCalled();
    });

    // 9
    it("ArrowLeft on expanded node calls onToggleExpand", () => {
        const tree = [node("A", [node("B"), node("C")])];
        const callbacks = defaultCallbacks();
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set(["A"]),
                ...callbacks,
            }),
        );

        act(() => result.current.setFocusedNodeId("A"));
        act(() => result.current.handleKeyDown(makeKeyEvent("ArrowLeft")));

        expect(callbacks.onToggleExpand).toHaveBeenCalledWith("A");
    });

    // 10
    it("ArrowLeft on child node moves focus to parent", () => {
        const tree = [node("A", [node("B")])];
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set(["A"]),
                ...defaultCallbacks(),
            }),
        );

        act(() => result.current.setFocusedNodeId("B"));
        act(() => result.current.handleKeyDown(makeKeyEvent("ArrowLeft")));

        expect(result.current.focusedNodeId).toBe("A");
    });

    // 11
    it("Enter calls onSelect with focused node", () => {
        const nodeB = node("B");
        const tree = [node("A", [nodeB, node("C")])];
        const callbacks = defaultCallbacks();
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set(["A"]),
                ...callbacks,
            }),
        );

        act(() => result.current.setFocusedNodeId("B"));
        act(() => result.current.handleKeyDown(makeKeyEvent("Enter")));

        expect(callbacks.onSelect).toHaveBeenCalledTimes(1);
        // The hook finds the node from visibleNodes, so compare by id
        expect(callbacks.onSelect.mock.calls[0][0].id).toBe("B");
    });

    // 12
    it("Space toggles expand on expandable node without selecting", () => {
        const tree = [node("A", [node("B"), node("C")])];
        const callbacks = defaultCallbacks();
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set<string>(),
                ...callbacks,
            }),
        );

        act(() => result.current.setFocusedNodeId("A"));
        act(() => result.current.handleKeyDown(makeKeyEvent(" ")));

        expect(callbacks.onToggleExpand).toHaveBeenCalledWith("A");
        expect(callbacks.onSelect).not.toHaveBeenCalled();
    });

    // 13
    it("Space on leaf is a no-op", () => {
        const tree = [node("A", [node("B")])];
        const callbacks = defaultCallbacks();
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set(["A"]),
                ...callbacks,
            }),
        );

        act(() => result.current.setFocusedNodeId("B"));
        act(() => result.current.handleKeyDown(makeKeyEvent(" ")));

        expect(callbacks.onToggleExpand).not.toHaveBeenCalled();
        expect(callbacks.onSelect).not.toHaveBeenCalled();
    });

    // 14
    it("Home moves focus to first visible node", () => {
        const tree = [node("A", [node("B"), node("C")]), node("D")];
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set(["A"]),
                ...defaultCallbacks(),
            }),
        );

        act(() => result.current.setFocusedNodeId("D"));
        act(() => result.current.handleKeyDown(makeKeyEvent("Home")));

        expect(result.current.focusedNodeId).toBe("A");
    });

    // 15
    it("End moves focus to last visible node", () => {
        const tree = [node("A", [node("B"), node("C")]), node("D")];
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set(["A"]),
                ...defaultCallbacks(),
            }),
        );

        act(() => result.current.setFocusedNodeId("A"));
        act(() => result.current.handleKeyDown(makeKeyEvent("End")));

        expect(result.current.focusedNodeId).toBe("D");
    });

    // 16
    it("* expands all siblings", () => {
        const tree = [
            node("A", [node("A1")]),
            node("B", [node("B1")]),
            node("C"),
        ];
        const callbacks = defaultCallbacks();
        const { result } = renderHook(() =>
            useTreeKeyboard({
                tree,
                expandedIds: new Set<string>(),
                ...callbacks,
            }),
        );

        act(() => result.current.setFocusedNodeId("A"));
        act(() => result.current.handleKeyDown(makeKeyEvent("*")));

        expect(callbacks.onExpandMultiple).toHaveBeenCalledTimes(1);
        const expandedIds = callbacks.onExpandMultiple.mock.calls[0][0] as string[];
        expect(expandedIds).toContain("A");
        expect(expandedIds).toContain("B");
        expect(expandedIds).not.toContain("C");
    });

    // 17
    it("focus recovery: moves to parent when focused node becomes invisible", () => {
        const tree = [node("A", [node("B")])];
        let expandedIds = new Set(["A"]);
        const callbacks = defaultCallbacks();

        const { result, rerender } = renderHook(
            ({ expanded }) =>
                useTreeKeyboard({
                    tree,
                    expandedIds: expanded,
                    ...callbacks,
                }),
            { initialProps: { expanded: expandedIds } },
        );

        act(() => result.current.setFocusedNodeId("B"));
        expect(result.current.focusedNodeId).toBe("B");

        // Collapse A — B becomes invisible
        expandedIds = new Set<string>();
        rerender({ expanded: expandedIds });

        expect(result.current.focusedNodeId).toBe("A");
    });

    // 18
    it("focus recovery: resets to first root when focused node is deleted", () => {
        let tree = [node("A"), node("B")];
        const callbacks = defaultCallbacks();

        const { result, rerender } = renderHook(
            ({ t }) =>
                useTreeKeyboard({
                    tree: t,
                    expandedIds: new Set<string>(),
                    ...callbacks,
                }),
            { initialProps: { t: tree } },
        );

        act(() => result.current.setFocusedNodeId("B"));
        expect(result.current.focusedNodeId).toBe("B");

        // Remove B from tree
        tree = [node("A")];
        rerender({ t: tree });

        expect(result.current.focusedNodeId).toBe("A");
    });
});
