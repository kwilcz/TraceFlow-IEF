import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LogAnalyzerLanding } from "@/features/log-analyzer/log-analyzer-landing";

const storeState = {
    logs: [],
};

vi.mock("@/stores/log-store.ts", () => ({
    useLogStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

vi.mock("@/features/log-analyzer/log-analyzer-dialog.tsx", () => ({
    LogAnalyzerDialog: ({ open }: { open: boolean }) => (open ? <div>connection-dialog-open</div> : null),
}));

vi.mock("@/features/log-analyzer/log-analyzer-workspace.tsx", () => ({
    LogAnalyzerWorkspace: () => <div>workspace</div>,
}));

describe("LogAnalyzerLanding", () => {
    it("shows capability showcase cards and coming-soon manual upload", () => {
        render(<LogAnalyzerLanding />);

        expect(screen.getByText("Flow-Centric Results")).toBeInTheDocument();
        expect(screen.getByText("Timeline Replay")).toBeInTheDocument();
        expect(screen.getByText("Claims & Statebag Diff")).toBeInTheDocument();
        expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    });

    it("opens connection dialog when API configure is clicked", () => {
        render(<LogAnalyzerLanding />);

        const configureButtons = screen.getAllByRole("button", { name: "Configure" });
        fireEvent.click(configureButtons[0]);

        expect(screen.getByText("connection-dialog-open")).toBeInTheDocument();
    });
});
