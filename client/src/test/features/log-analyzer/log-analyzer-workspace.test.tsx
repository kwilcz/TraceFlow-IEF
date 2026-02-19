import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
    },
}));

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

describe("LogAnalyzerWorkspace flow panel", () => {
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

    it("defaults to expanded mode", () => {
        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        expect(screen.getByTestId("selected-flow-summary")).toBeInTheDocument();
        expect(screen.getByTestId("available-flows-table")).toBeInTheDocument();
    });

    it("auto-collapses on first flow selection", () => {
        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        fireEvent.click(screen.getByRole("button", { name: "flow-2" }));

        const summaryAfterSelect = within(screen.getByTestId("selected-flow-summary"));
        expect(summaryAfterSelect.getByText("corr-2")).toBeInTheDocument();
        expect(screen.getByTestId("available-flows-panel")).toHaveAttribute("data-state", "collapsed");
    });

    it("disables future auto-collapse after manual re-expand", () => {
        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        fireEvent.click(screen.getByRole("button", { name: "flow-2" }));
        fireEvent.click(screen.getByRole("button", { name: "Expand available flows" }));
        fireEvent.click(screen.getByRole("button", { name: "flow-1" }));

        const summaryAfterReselect = within(screen.getByTestId("selected-flow-summary"));
        expect(summaryAfterReselect.getByText("corr-1")).toBeInTheDocument();
        expect(screen.getByTestId("available-flows-table")).toBeInTheDocument();
    });

    it("renders summary in both modes and list only when expanded", () => {
        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        expect(screen.getByTestId("selected-flow-summary")).toBeInTheDocument();
        expect(screen.getByTestId("available-flows-table")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Collapse available flows" }));

        expect(screen.getByTestId("selected-flow-summary")).toBeInTheDocument();
        expect(screen.getByTestId("available-flows-panel")).toHaveAttribute("data-state", "collapsed");
    });

    it("shows loading state when telemetry is in-flight", () => {
        useLogStore.setState({ isLoading: true });

        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        expect(screen.getByTestId("available-flows-loading")).toBeInTheDocument();
    });

    it("shows no logs state when no telemetry has been loaded", () => {
        useLogStore.setState({ logs: [], userFlows: [], selectedFlow: null, isLoading: false });

        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        expect(screen.getByTestId("available-flows-no-logs")).toBeInTheDocument();
    });
});

/* ------------------------------------------------------------------ */
/*  FlowSelectionSummary details                                       */
/* ------------------------------------------------------------------ */

describe("FlowSelectionSummary details", () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        resetStore();
    });

    it("shows email, stripped policy, and correlationId for selected flow", () => {
        const flow = makeFlow("flow-s1", "abc-123", {
            userEmail: "test@example.com",
            policyId: "B2C_1A_SignUpSignIn",
        });

        useLogStore.setState({
            userFlows: [flow],
            selectedFlow: flow,
            logs: [
                {
                    id: "log-s1",
                    timestamp: new Date("2026-01-01T00:00:00.000Z"),
                    policyId: "B2C_1A_SignUpSignIn",
                    correlationId: "abc-123",
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

        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        const summary = within(screen.getByTestId("selected-flow-summary"));
        expect(summary.getByText("test@example.com")).toBeInTheDocument();
        expect(summary.getByText("SignUpSignIn")).toBeInTheDocument();
        expect(summary.getByText("abc-123")).toBeInTheDocument();
    });

    it("shows policy and correlationId even when email is missing", () => {
        const flow = makeFlow("flow-s2", "def-456", {
            userEmail: undefined,
            policyId: "B2C_1A_LoginOnly",
        });

        useLogStore.setState({
            userFlows: [flow],
            selectedFlow: flow,
            logs: [
                {
                    id: "log-s2",
                    timestamp: new Date("2026-01-01T00:00:00.000Z"),
                    policyId: "B2C_1A_LoginOnly",
                    correlationId: "def-456",
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

        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        const summary = within(screen.getByTestId("selected-flow-summary"));
        expect(summary.getByText("LoginOnly")).toBeInTheDocument();
        expect(summary.getByText("def-456")).toBeInTheDocument();
    });

    it("shows no flow selected when no flow is active", () => {
        const flow = makeFlow("flow-s3", "ghi-789");

        useLogStore.setState({
            userFlows: [flow],
            selectedFlow: null,
            logs: [
                {
                    id: "log-s3",
                    timestamp: new Date("2026-01-01T00:00:00.000Z"),
                    policyId: "B2C_1A_TEST",
                    correlationId: "ghi-789",
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

        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        expect(screen.getByText("No flow selected")).toBeInTheDocument();
    });
});

/* ------------------------------------------------------------------ */
/*  Flow grouping                                                      */
/* ------------------------------------------------------------------ */

describe("Flow grouping", () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        resetStore();
    });

    it("renders group headers per policy", () => {
        const flowA = makeFlow("flow-g1", "corr-g1", { policyId: "B2C_1A_SignUp" });
        const flowB = makeFlow("flow-g2", "corr-g2", { policyId: "B2C_1A_SignIn" });

        useLogStore.setState({
            userFlows: [flowA, flowB],
            selectedFlow: flowA,
            logs: [
                {
                    id: "log-g1",
                    timestamp: new Date("2026-01-01T00:00:00.000Z"),
                    policyId: "B2C_1A_SignUp",
                    correlationId: "corr-g1",
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

        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        expect(screen.getByTestId("group-row-B2C_1A_SignUp")).toBeInTheDocument();
        expect(screen.getByTestId("group-row-B2C_1A_SignIn")).toBeInTheDocument();
    });

    it("strips B2C_1A_ prefix in group header", () => {
        const flow = makeFlow("flow-g3", "corr-g3", { policyId: "B2C_1A_MyPolicy" });

        useLogStore.setState({
            userFlows: [flow],
            selectedFlow: flow,
            logs: [
                {
                    id: "log-g3",
                    timestamp: new Date("2026-01-01T00:00:00.000Z"),
                    policyId: "B2C_1A_MyPolicy",
                    correlationId: "corr-g3",
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

        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        const groupRow = screen.getByTestId("group-row-B2C_1A_MyPolicy");
        expect(groupRow).toHaveTextContent("MyPolicy");
    });

    it("shows flow count badge in group header", () => {
        const flows = [
            makeFlow("flow-g4", "corr-g4", { policyId: "B2C_1A_Same" }),
            makeFlow("flow-g5", "corr-g5", { policyId: "B2C_1A_Same" }),
            makeFlow("flow-g6", "corr-g6", { policyId: "B2C_1A_Same" }),
        ];

        useLogStore.setState({
            userFlows: flows,
            selectedFlow: flows[0],
            logs: [
                {
                    id: "log-g4",
                    timestamp: new Date("2026-01-01T00:00:00.000Z"),
                    policyId: "B2C_1A_Same",
                    correlationId: "corr-g4",
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

        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        expect(screen.getByText("3 flows")).toBeInTheDocument();
    });

    it("shows singular 'flow' for single-flow group", () => {
        const flow = makeFlow("flow-g7", "corr-g7", { policyId: "B2C_1A_Solo" });

        useLogStore.setState({
            userFlows: [flow],
            selectedFlow: flow,
            logs: [
                {
                    id: "log-g7",
                    timestamp: new Date("2026-01-01T00:00:00.000Z"),
                    policyId: "B2C_1A_Solo",
                    correlationId: "corr-g7",
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

        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        expect(screen.getByText("1 flow")).toBeInTheDocument();
    });

    it("collapses group children when group header is clicked", () => {
        const flow1 = makeFlow("flow-g5", "corr-g5", { policyId: "B2C_1A_Collapse" });
        const flow2 = makeFlow("flow-g6", "corr-g6", { policyId: "B2C_1A_Collapse" });

        useLogStore.setState({
            userFlows: [flow1, flow2],
            selectedFlow: flow1,
            logs: [
                {
                    id: "log-g5",
                    timestamp: new Date("2026-01-01T00:00:00.000Z"),
                    policyId: "B2C_1A_Collapse",
                    correlationId: "corr-g5",
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

        render(<LogAnalyzerWorkspace onOpenSettings={vi.fn()} />);

        // Before collapse — leaf row is in DOM
        expect(screen.getByRole("button", { name: "flow-g5" })).toBeInTheDocument();

        fireEvent.click(screen.getByTestId("group-row-B2C_1A_Collapse"));

        // After collapse — leaf row is unmounted from DOM
        expect(screen.queryByRole("button", { name: "flow-g5" })).not.toBeInTheDocument();

        // Re-expand — leaf row is back in DOM
        fireEvent.click(screen.getByTestId("group-row-B2C_1A_Collapse"));
        expect(screen.getByRole("button", { name: "flow-g5" })).toBeInTheDocument();
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
        expect(screen.getByTestId("available-flows-table")).toBeInTheDocument();
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

        expect(screen.getByTestId("available-flows-no-flows")).toBeInTheDocument();
    });
});
