import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserFlow } from "@/types/trace";
import { useLogStore } from "../../../stores/log-store";
import { LogAnalyzerWorkspace } from "@/features/log-analyzer/log-analyzer-workspace";

vi.mock("@/components/ui/scroll-area", () => {
    const Passthrough = ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
        <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
    );
    return {
        Root: Passthrough,
        Viewport: Passthrough,
        Content: Passthrough,
        ScrollBar: Passthrough,
        ScrollAreaCorner: () => null,
        ScrollArea: Passthrough,
        ScrollAreaRoot: Passthrough,
        ScrollAreaViewport: Passthrough,
        ScrollAreaContent: Passthrough,
        ScrollAreaScrollbar: Passthrough,
        ScrollAreaThumb: () => null,
        Scrollbar: Passthrough,
        Thumb: () => null,
        Corner: () => null,
    };
});

vi.mock("@/features/log-analyzer/query-controls.tsx", () => ({
    QueryControls: ({ children }: { children?: React.ReactNode }) => (
        <div data-testid="query-controls">{children}</div>
    ),
}));

vi.mock("motion/react", () => ({
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
        tbody: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
            const { initial, animate, exit, transition, ...htmlProps } = props;
            return <tbody {...(htmlProps as React.HTMLAttributes<HTMLTableSectionElement>)}>{children}</tbody>;
        },
        create: (Component: React.ComponentType<Record<string, unknown>>) => {
            return React.forwardRef(function MotionMock(props: Record<string, unknown>, ref: React.Ref<unknown>) {
                const { initial, animate, exit, transition, ...rest } = props;
                return React.createElement(Component, { ...rest, ref } as Record<string, unknown>);
            });
        },
    },
}));

vi.mock("@/features/log-analyzer/flow-picker/flow-picker.css", () => ({}));

const makeFlow = (id: string, correlationId: string, overrides?: Partial<UserFlow>): UserFlow => ({
    id,
    correlationId,
    policyId: "B2C_1A_TEST",
    startTime: new Date("2026-01-01T00:00:00.000Z"),
    endTime: new Date("2026-01-01T00:10:00.000Z"),
    stepCount: 2,
    completed: false,
    hasErrors: false,
    cancelled: false,
    subJourneys: [],
    logIds: [id],
    userEmail: "user@test.com",
    userObjectId: "obj-123",
    ...overrides,
});

const resetStore = () => {
    useLogStore.setState(useLogStore.getInitialState());
};

/* ------------------------------------------------------------------ */
/*  FlowPicker integration                                             */
/* ------------------------------------------------------------------ */

describe("LogAnalyzerWorkspace flow picker", () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        resetStore();

        const firstFlow = makeFlow("flow-1", "corr-1");
        const secondFlow = makeFlow("flow-2", "corr-2", { completed: true, stepCount: 5 });

        useLogStore.setState({
            userFlows: [firstFlow, secondFlow],
            selectedFlow: firstFlow,
            logs: [
                {
                    id: "log-1",
                    timestamp: new Date("2026-01-01T00:00:00.000Z"),
                    policyId: "B2C_1A_TEST",
                    correlationId: "corr-1",
                    level: "INFO",
                    message: "first",
                    operationName: "operation",
                    customDimensions: {},
                    clips: [],
                    eventType: "AUTH",
                    orchestrationStep: 0,
                },
            ],
        });
    });

    it("renders FlowPicker when flows are loaded", () => {
        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        expect(screen.getByTestId("flow-picker")).toBeInTheDocument();
    });

    it("shows loading state when telemetry is in-flight", () => {
        useLogStore.setState({ isLoading: true });

        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        expect(screen.getByTestId("flow-picker-loading")).toBeInTheDocument();
        expect(screen.queryByTestId("flow-picker")).not.toBeInTheDocument();
    });

    it("shows no logs state when no telemetry has been loaded", () => {
        useLogStore.setState({ logs: [], userFlows: [], selectedFlow: null, isLoading: false });

        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        expect(screen.getByTestId("flow-picker-no-logs")).toBeInTheDocument();
        expect(screen.queryByTestId("flow-picker")).not.toBeInTheDocument();
    });

    it("does not render FlowPicker when loading", () => {
        useLogStore.setState({ isLoading: true });

        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        expect(screen.queryByTestId("flow-picker")).not.toBeInTheDocument();
    });

    it("does not pass children to QueryControls", () => {
        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        const queryControls = screen.getByTestId("query-controls");
        expect(queryControls).toBeEmptyDOMElement();
    });
});

/* ------------------------------------------------------------------ */
/*  Performance                                                        */
/* ------------------------------------------------------------------ */

describe("Performance", () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        resetStore();
    });

    it("renders 1000 flows within reasonable time", () => {
        const flows = Array.from({ length: 1000 }, (_, i) =>
            makeFlow(`flow-perf-${i}`, `corr-perf-${i}`, {
                policyId: `B2C_1A_Perf_${i % 50}`,
            }),
        );

        useLogStore.setState({
            userFlows: flows,
            selectedFlow: flows[0],
            logs: [
                {
                    id: "log-perf",
                    timestamp: new Date("2026-01-01T00:00:00.000Z"),
                    policyId: "B2C_1A_Perf_0",
                    correlationId: "corr-perf-0",
                    level: "INFO",
                    message: "test",
                    operationName: "operation",
                    customDimensions: {},
                    clips: [],
                    eventType: "AUTH",
                    orchestrationStep: 0,
                },
            ],
        });

        const start = performance.now();
        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);
        const elapsed = performance.now() - start;

        expect(elapsed).toBeLessThan(2000);
        expect(screen.getByTestId("flow-picker")).toBeInTheDocument();
    });
});

/* ------------------------------------------------------------------ */
/*  Empty states                                                       */
/* ------------------------------------------------------------------ */

describe("Empty states", () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        resetStore();
    });

    it("shows no-flows state when logs exist but no flows found", () => {
        useLogStore.setState({
            logs: [
                {
                    id: "log-nf",
                    timestamp: new Date("2026-01-01T00:00:00.000Z"),
                    policyId: "B2C_1A_TEST",
                    correlationId: "corr-nf",
                    level: "INFO",
                    message: "test",
                    operationName: "operation",
                    customDimensions: {},
                    clips: [],
                    eventType: "AUTH",
                    orchestrationStep: 0,
                },
            ],
            userFlows: [],
            selectedFlow: null,
            isLoading: false,
        });

        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        expect(screen.getByTestId("flow-picker-no-flows")).toBeInTheDocument();
    });
});
