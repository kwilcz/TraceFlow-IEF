import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogAnalyzerLanding } from "@/features/log-analyzer/log-analyzer-landing";

describe("LogAnalyzerLanding", () => {
    beforeEach(() => {
        cleanup();
    });

    it("shows landing cards", () => {
        render(<LogAnalyzerLanding onConnectClick={vi.fn()} />);

        expect(screen.getByText("Start Debugging")).toBeInTheDocument();
        expect(screen.getByText("Connect to API")).toBeInTheDocument();
        expect(screen.getByText("Upload logs manually")).toBeInTheDocument();
        expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    });

    it("calls onConnectClick when API configure is clicked", () => {
        const onConnectClick = vi.fn();
        render(<LogAnalyzerLanding onConnectClick={onConnectClick} />);

        const configureButtons = screen.getAllByRole("button", { name: "Configure" });
        configureButtons[0].click();

        expect(onConnectClick).toHaveBeenCalledOnce();
    });
});
