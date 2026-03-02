import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { Selection } from "@/features/log-analyzer/debugger/types";
import type { FlowNode, FlowNodeContext, StepFlowData } from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";

// ============================================================================
// Mocks — must be declared before any import that touches them
// ============================================================================

// Motion mock
vi.mock("motion/react", () => ({
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
        div: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { initial, animate, exit, transition, ...htmlProps } = props;
            return <div {...(htmlProps as React.HTMLAttributes<HTMLDivElement>)}>{props.children}</div>;
        },
        create: () => (props: Record<string, unknown> & { children?: React.ReactNode }) => <div {...props} />,
    },
    useReducedMotion: () => false,
}));

// ScrollArea mock
vi.mock("@/components/ui/scroll-area", () => ({
    ScrollArea: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
        <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
    ),
    ScrollAreaRoot: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
        <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
    ),
    ScrollAreaViewport: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
        <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
    ),
    ScrollAreaContent: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
        <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
    ),
    ScrollBar: () => null,
    ScrollAreaCorner: () => null,
}));

// Tooltip mock
vi.mock("@/components/ui/tooltip", () => ({
    Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Debugger context — use the REAL provider, dispatch selections via helper
// No mock needed — wrapping in <DebuggerProvider> in render

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { useLogStore } from "@/stores/log-store";
import { ClaimsDiffTable } from "@/features/log-analyzer/debugger/claims-diff-table";
import { DebuggerProvider, useDebuggerContext } from "@/features/log-analyzer/debugger/debugger-context";
import type { SelectionAction } from "@/features/log-analyzer/debugger/types";

// ============================================================================
// Helpers
// ============================================================================

afterEach(cleanup);

/**
 * Dispatches a selection action into the real DebuggerProvider.
 * Rendered as a sibling of ClaimsDiffTable inside the same provider.
 */
function SelectionSetter({ action }: { action: SelectionAction | null }) {
    const { dispatch } = useDebuggerContext();
    // Dispatch on mount or when action changes
    React.useEffect(() => {
        if (action) {
            dispatch(action);
        }
    }, [action, dispatch]);
    return null;
}

function renderWithProvider(selection: Selection | null) {
    const action: SelectionAction | null = selection
        ? { type: "select-step", nodeId: selection.nodeId }
        : null;

    return render(
        <DebuggerProvider>
            {action && <SelectionSetter action={action} />}
            <ClaimsDiffTable />
        </DebuggerProvider>,
    );
}

function makeFlowNodeContext(claimsSnapshot: Record<string, string> = {}): FlowNodeContext {
    return {
        timestamp: new Date(),
        sequenceNumber: 0,
        logId: "test-log",
        eventType: "AUTH",
        statebagSnapshot: {},
        claimsSnapshot,
    };
}

function makeStepNode(
    stepIndex: number,
    claimsSnapshot: Record<string, string>,
): FlowNode {
    return {
        id: `step-${stepIndex}`,
        name: `Step ${stepIndex}`,
        type: FlowNodeType.Step,
        triggeredAtStep: stepIndex,
        lastStep: stepIndex,
        children: [],
        data: {
            type: FlowNodeType.Step,
            stepOrder: stepIndex,
            currentJourneyName: "TestJourney",
            result: "Success",
            errors: [],
            selectableOptions: [],
        } as StepFlowData,
        context: makeFlowNodeContext(claimsSnapshot),
    };
}

function makeFlowTree(...steps: FlowNode[]): FlowNode {
    return {
        id: "root",
        name: "Root",
        type: FlowNodeType.Root,
        triggeredAtStep: 0,
        lastStep: 0,
        children: steps,
        data: { type: FlowNodeType.Root, policyId: "test-policy" },
        context: makeFlowNodeContext(),
    };
}

function resetStore() {
    useLogStore.setState(useLogStore.getInitialState());
}

function setFlowTree(tree: FlowNode) {
    useLogStore.setState({ flowTree: tree });
}

// ============================================================================
// Tests
// ============================================================================

describe("ClaimsDiffTable", () => {
    beforeEach(() => {
        resetStore();
    });

    // ── Test 1: No selection ──────────────────────────────────────────
    it("shows 'Select a step' message when no selection", () => {
        setFlowTree(makeFlowTree(makeStepNode(0, { a: "1" })));
        renderWithProvider(null);

        expect(screen.getByText("Select a step to view claims diff")).toBeTruthy();
    });

    // ── Test 2: Step with 0 claims ────────────────────────────────────
    it("shows 'No claims at this step' when step has empty snapshot", () => {
        setFlowTree(makeFlowTree(makeStepNode(0, {})));
        renderWithProvider({ type: "step", nodeId: "step-0" });

        expect(screen.getByText("No claims at this step")).toBeTruthy();
    });

    // ── Test 3: First step → all claims "Added" ──────────────────────
    it("marks all claims as ADDED on the first step", () => {
        setFlowTree(makeFlowTree(makeStepNode(0, { email: "user@test.com", name: "Joe" })));
        renderWithProvider({ type: "step", nodeId: "step-0" });

        const addedBadges = screen.getAllByText("ADDED");
        expect(addedBadges).toHaveLength(2);
    });

    // ── Test 4: Step N → correct diff types ──────────────────────────
    it("renders correct diff statuses for step N", () => {
        setFlowTree(makeFlowTree(
            makeStepNode(0, { keep: "v", changed: "old", gone: "bye" }),
            makeStepNode(1, { keep: "v", changed: "new", fresh: "hello" }),
        ));
        renderWithProvider({ type: "step", nodeId: "step-1" });

        expect(screen.getByText("ADDED")).toBeTruthy();
        expect(screen.getByText("MODIFIED")).toBeTruthy();
        expect(screen.getByText("REMOVED")).toBeTruthy();
        expect(screen.getByText("UNCHANGED")).toBeTruthy();
    });

    // ── Test 5: Status toggle click → filters rows ───────────────────
    it("filters rows when status toggle is clicked", () => {
        setFlowTree(makeFlowTree(
            makeStepNode(0, { a: "1" }),
            makeStepNode(1, { a: "1", b: "new" }),
        ));
        renderWithProvider({ type: "step", nodeId: "step-1" });

        // Initially both ADDED and UNCHANGED should be visible
        expect(screen.getByText("ADDED")).toBeTruthy();
        expect(screen.getByText("UNCHANGED")).toBeTruthy();

        // Click the "Added" toggle to deselect it
        const addedToggle = screen.getByTestId("toggle-added");
        fireEvent.click(addedToggle);

        // ADDED row should be filtered out
        expect(screen.queryByText("ADDED")).toBeNull();
        // UNCHANGED should still be visible
        expect(screen.getByText("UNCHANGED")).toBeTruthy();
    });

    // ── Test 6: Text filter → filters by key ─────────────────────────
    it("filters rows by text input matching claim key", () => {
        setFlowTree(makeFlowTree(makeStepNode(0, { email: "user@test.com", name: "Joe", phone: "123" })));
        renderWithProvider({ type: "step", nodeId: "step-0" });

        // All 3 claims visible initially
        expect(screen.getAllByText("ADDED")).toHaveLength(3);

        const filterInput = screen.getByTestId("claims-filter-input");
        fireEvent.change(filterInput, { target: { value: "email" } });

        // Filter applies immediately (no debounce)
        expect(screen.getAllByText("ADDED")).toHaveLength(1);
        expect(screen.getByText("email")).toBeTruthy();
    });

    // ── Test 7: Sort order (Added → Modified → Removed → Unchanged) ─
    it("sorts rows by status priority then alphabetically", () => {
        setFlowTree(makeFlowTree(
            makeStepNode(0, { beta: "old", zebra: "old", keep: "v" }),
            makeStepNode(1, { keep: "v", zebra: "new", alpha: "new" }),
        ));
        renderWithProvider({ type: "step", nodeId: "step-1" });

        // Get all key cells (font-mono text-xs)
        const table = screen.getByRole("table");
        const rows = within(table).getAllByRole("row");
        // Skip header row (index 0)
        const dataRows = rows.slice(1);

        // Expected order: alpha (added), zebra (modified), beta (removed), keep (unchanged)
        const keyTexts = dataRows.map((row) => {
            const cells = within(row).getAllByRole("cell");
            return cells[0].textContent;
        });

        expect(keyTexts).toEqual(["alpha", "zebra", "beta", "keep"]);
    });

    // ── Test 8: Modified row: old value line-through, new value displayed
    it("renders modified row with old value having line-through", () => {
        setFlowTree(makeFlowTree(
            makeStepNode(0, { claim: "old-val" }),
            makeStepNode(1, { claim: "new-val" }),
        ));
        renderWithProvider({ type: "step", nodeId: "step-1" });

        expect(screen.getByText("old-val")).toBeTruthy();
        expect(screen.getByText("new-val")).toBeTruthy();

        // Old value container should have line-through class
        const oldValEl = screen.getByText("old-val");
        expect(oldValEl.className).toContain("line-through");
    });

    // ── Test 9: Removed row: old value shown, new value "—" ──────────
    it("renders removed row with old value and em-dash placeholder", () => {
        setFlowTree(makeFlowTree(
            makeStepNode(0, { gone: "old-val" }),
            makeStepNode(1, {}),
        ));
        renderWithProvider({ type: "step", nodeId: "step-1" });

        expect(screen.getByText("old-val")).toBeTruthy();
        expect(screen.getByText("—")).toBeTruthy();
    });

    // ── Test 10: Change count badge shows correct count ──────────────
    it("shows change count badge with correct number", () => {
        setFlowTree(makeFlowTree(
            makeStepNode(0, { a: "1", b: "2" }),
            makeStepNode(1, { a: "changed", c: "new" }),
        ));
        renderWithProvider({ type: "step", nodeId: "step-1" });

        // Changes: a modified, b removed, c added = 3 changed
        expect(screen.getByText("3 changed")).toBeTruthy();
    });

    // ── Test 11: Row background tinting via data-attribute selectors ──
    it("applies data-status attributes for row tinting", () => {
        setFlowTree(makeFlowTree(
            makeStepNode(0, { keep: "v", changed: "old", gone: "bye" }),
            makeStepNode(1, { keep: "v", changed: "new", fresh: "hello" }),
        ));
        renderWithProvider({ type: "step", nodeId: "step-1" });

        const table = screen.getByRole("table");
        const rows = within(table).getAllByRole("row");
        const dataRows = rows.slice(1); // Skip header

        // Find row by data-status attribute
        const addedRow = dataRows.find((r) => r.getAttribute("data-status") === "added");
        const modifiedRow = dataRows.find((r) => r.getAttribute("data-status") === "modified");
        const removedRow = dataRows.find((r) => r.getAttribute("data-status") === "removed");
        const unchangedRow = dataRows.find((r) => r.getAttribute("data-status") === "unchanged");

        // Verify data-status attributes are set correctly
        expect(addedRow).toBeTruthy();
        expect(modifiedRow).toBeTruthy();
        expect(removedRow).toBeTruthy();
        expect(unchangedRow).toBeTruthy();
    });
});
