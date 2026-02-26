import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("motion/react", () => ({
    motion: {
        div: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
            const { initial, animate, exit, transition, ...htmlProps } = props;
            return React.createElement("div", htmlProps as React.HTMLAttributes<HTMLDivElement>, props.children);
        },
        create: (Component: React.ComponentType<Record<string, unknown>>) => {
            return React.forwardRef(function MotionMock(props: Record<string, unknown>, ref: React.Ref<unknown>) {
                const { initial, animate, exit, transition, ...rest } = props;
                return React.createElement(Component, { ...rest, ref } as Record<string, unknown>);
            });
        },
    },
    animate: () => ({ stop: () => {} }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => false,
}));

vi.mock("@/features/log-analyzer/flow-picker/flow-picker.css", () => ({}));

vi.mock("@/components/ui/scroll-area", () => ({
    ScrollAreaRoot: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
        <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
    ),
    ScrollAreaViewport: React.forwardRef(({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }, ref: React.Ref<HTMLDivElement>) => (
        <div ref={ref} {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
    )),
    ScrollAreaContent: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
        <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
    ),
    ScrollBar: () => null,
    ScrollAreaCorner: () => null,
}));

import { FlowPicker } from "@/features/log-analyzer/flow-picker";
import type { UserFlow } from "@/types/trace";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function createMockFlow(overrides?: Partial<UserFlow>): UserFlow {
    return {
        id: crypto.randomUUID(),
        correlationId: "corr-" + Math.random().toString(36).slice(2, 10),
        policyId: "B2C_1A_SignUpOrSignIn",
        startTime: new Date("2025-06-15T10:30:00Z"),
        endTime: new Date("2025-06-15T10:31:00Z"),
        stepCount: 5,
        completed: true,
        hasErrors: false,
        cancelled: false,
        subJourneys: [],
        logIds: ["log-1"],
        userEmail: "user@example.com",
        ...overrides,
    };
}

/** Creates N unique flows with distinct ids/correlationIds. */
function createMockFlows(count: number, overrides?: Partial<UserFlow>): UserFlow[] {
    return Array.from({ length: count }, (_, i) =>
        createMockFlow({
            id: `flow-${i}`,
            correlationId: `corr-${i}`,
            policyId: `B2C_1A_Policy_${String(i).padStart(2, "0")}`,
            startTime: new Date(Date.now() - i * 60_000),
            ...overrides,
        }),
    );
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("FlowPicker", () => {
    let onSelectFlow: ReturnType<typeof vi.fn>;

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    beforeEach(() => {
        onSelectFlow = vi.fn();
        vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
            cb(performance.now());
            return 0;
        });
    });

    /* 1 — Renders table rows for provided userFlows */
    it("renders table rows for provided userFlows", () => {
        const flows = createMockFlows(3);

        render(
            <FlowPicker
                userFlows={flows}
                selectedFlow={flows[0]}
                onSelectFlow={onSelectFlow}
            />,
        );

        const picker = screen.getByTestId("flow-picker");
        const rows = within(picker).getAllByRole("row");
        // 3 data rows (no header rows when collapsed)
        expect(rows.length).toBe(3);
    });

    /* 2 — Shows headers only in expanded mode */
    it("shows headers only in expanded mode", () => {
        const flows = createMockFlows(8);

        render(
            <FlowPicker
                userFlows={flows}
                selectedFlow={flows[0]}
                onSelectFlow={onSelectFlow}
            />,
        );

        // Collapsed: no header text visible
        expect(screen.queryByText("Policy")).not.toBeInTheDocument();

        // Expand
        const toggle = screen.getByTestId("flow-picker-toggle");
        fireEvent.click(toggle);

        // Expanded: headers visible
        expect(screen.getByText("Policy")).toBeInTheDocument();
        expect(screen.getByText("Email")).toBeInTheDocument();
        expect(screen.getByText("Date")).toBeInTheDocument();
        expect(screen.getByText("Correlation ID")).toBeInTheDocument();
    });

    /* 3 — Auto-selects first flow in collapsed mode when no selectedFlow */
    it("auto-selects first flow in collapsed mode when no selectedFlow", () => {
        const flows = createMockFlows(3);

        render(
            <FlowPicker
                userFlows={flows}
                selectedFlow={null}
                onSelectFlow={onSelectFlow}
            />,
        );

        expect(onSelectFlow).toHaveBeenCalledTimes(1);
        // Called with first row's original (sorted by policyId asc)
        expect(onSelectFlow).toHaveBeenCalledWith(
            expect.objectContaining({ id: expect.any(String) }),
        );
    });

    /* 4 — Does NOT auto-select when a flow is already selected */
    it("does not auto-select when a flow is already selected", () => {
        const flows = createMockFlows(3);

        render(
            <FlowPicker
                userFlows={flows}
                selectedFlow={flows[1]}
                onSelectFlow={onSelectFlow}
            />,
        );

        expect(onSelectFlow).not.toHaveBeenCalled();
    });

    /* 5 — Toggle button expands and collapses */
    it("toggle button expands and collapses", () => {
        const flows = createMockFlows(8);

        render(
            <FlowPicker
                userFlows={flows}
                selectedFlow={flows[0]}
                onSelectFlow={onSelectFlow}
            />,
        );

        const toggle = screen.getByTestId("flow-picker-toggle");

        // Click to expand
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-label", "Collapse flow list");

        // Click to collapse
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-label", "Expand flow list");
    });

    /* 6 — Escape key collapses when expanded */
    it("escape key collapses when expanded", () => {
        const flows = createMockFlows(8);

        render(
            <FlowPicker
                userFlows={flows}
                selectedFlow={flows[0]}
                onSelectFlow={onSelectFlow}
            />,
        );

        const toggle = screen.getByTestId("flow-picker-toggle");

        // Expand first
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-label", "Collapse flow list");

        // Press Escape on the picker container (Escape handler is on the wrapper div)
        fireEvent.keyDown(screen.getByTestId("flow-picker"), { key: "Escape" });
        expect(toggle).toHaveAttribute("aria-label", "Expand flow list");
    });

    /* 7 — Clicking a row calls onSelectFlow */
    it("clicking a row calls onSelectFlow", () => {
        const flows = createMockFlows(3);

        render(
            <FlowPicker
                userFlows={flows}
                selectedFlow={flows[0]}
                onSelectFlow={onSelectFlow}
            />,
        );

        const picker = screen.getByTestId("flow-picker");
        const rows = within(picker).getAllByRole("row");

        fireEvent.click(rows[1]);
        expect(onSelectFlow).toHaveBeenCalledWith(
            expect.objectContaining({ id: expect.any(String) }),
        );
    });

    /* 8 — Enter/Space on focused row calls onSelectFlow */
    it("enter key on focused row calls onSelectFlow", () => {
        const flows = createMockFlows(3);

        render(
            <FlowPicker
                userFlows={flows}
                selectedFlow={flows[0]}
                onSelectFlow={onSelectFlow}
            />,
        );

        const picker = screen.getByTestId("flow-picker");
        const rows = within(picker).getAllByRole("row");

        // Focus the second row and press Enter
        rows[1].focus();
        fireEvent.keyDown(rows[1], { key: "Enter" });
        expect(onSelectFlow).toHaveBeenCalled();
    });

    /* 9 — FlowStatusDot renders correct semantic classes */
    it("renders FlowStatusDot with correct title for each status", () => {
        const errorFlow = createMockFlow({ id: "err", hasErrors: true, completed: false });
        const cancelledFlow = createMockFlow({ id: "can", cancelled: true, completed: false, hasErrors: false });
        const completedFlow = createMockFlow({ id: "ok", completed: true, hasErrors: false, cancelled: false });
        const abandonedFlow = createMockFlow({ id: "abn", completed: false, hasErrors: false, cancelled: false });

        render(
            <FlowPicker
                userFlows={[errorFlow, cancelledFlow, completedFlow, abandonedFlow]}
                selectedFlow={errorFlow}
                onSelectFlow={onSelectFlow}
            />,
        );

        // Check dots by their title attributes
        expect(screen.getByTitle("Error")).toBeInTheDocument();
        expect(screen.getByTitle("Cancelled")).toBeInTheDocument();
        expect(screen.getByTitle("Completed")).toBeInTheDocument();
        expect(screen.getByTitle("Abandoned")).toBeInTheDocument();
    });

    /* 10 — Shows "—" for missing userEmail */
    it('shows "—" for missing userEmail', () => {
        const flow = createMockFlow({ userEmail: undefined });

        render(
            <FlowPicker
                userFlows={[flow]}
                selectedFlow={flow}
                onSelectFlow={onSelectFlow}
            />,
        );

        expect(screen.getByText("—")).toBeInTheDocument();
    });
});
