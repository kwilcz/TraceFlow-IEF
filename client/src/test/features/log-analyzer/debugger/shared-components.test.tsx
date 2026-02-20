import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

// ── Mocks ──────────────────────────────────────────────────────────────────

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
}));

vi.mock("sonner", () => ({
    toast: { success: toastSuccessMock, error: toastErrorMock },
}));

const writeTextMock = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
    value: { writeText: writeTextMock },
    writable: true,
    configurable: true,
});

// ── Imports (after mocks) ──────────────────────────────────────────────────

import {
    StepStatusIcon,
    StepStatusBadge,
} from "@/features/log-analyzer/debugger/shared/step-status";
import { DurationBadge } from "@/features/log-analyzer/debugger/shared/duration-badge";
import { CopyButton } from "@/features/log-analyzer/debugger/shared/copy-button";
import { ClaimRow } from "@/features/log-analyzer/debugger/shared/claim-row";
import { ErrorDetails, ErrorMessage } from "@/features/log-analyzer/debugger/shared/error-display";

// ============================================================================
// Helpers
// ============================================================================

/** Wraps children with TooltipProvider for components that need it. */
function WithTooltip({ children }: { children: React.ReactNode }) {
    return <TooltipProvider>{children}</TooltipProvider>;
}

// ============================================================================
// StepStatusIcon
// ============================================================================

describe("StepStatusIcon", () => {
    beforeEach(() => cleanup());

    it.each(["Success", "Error", "Skipped", "PendingInput"] as const)(
        "renders an SVG for result=%s",
        (result) => {
            const { container } = render(<StepStatusIcon result={result} />);
            expect(container.querySelector("svg")).toBeTruthy();
        },
    );

    it("applies size class sm", () => {
        const { container } = render(<StepStatusIcon result="Success" size="sm" />);
        const svg = container.querySelector("svg");
        expect(svg?.className.baseVal || svg?.getAttribute("class")).toContain("w-3.5");
    });

    it("applies size class lg", () => {
        const { container } = render(<StepStatusIcon result="Success" size="lg" />);
        const svg = container.querySelector("svg");
        expect(svg?.className.baseVal || svg?.getAttribute("class")).toContain("w-5");
    });
});

// ============================================================================
// StepStatusBadge
// ============================================================================

describe("StepStatusBadge", () => {
    beforeEach(() => cleanup());

    it.each(["Success", "Error", "Skipped", "PendingInput"] as const)(
        "renders badge text for result=%s",
        (result) => {
            render(<StepStatusBadge result={result} />);
            expect(screen.getByText(result)).toBeTruthy();
        },
    );

    it("embeds an icon inside the badge", () => {
        const { container } = render(<StepStatusBadge result="Error" />);
        expect(container.querySelector("svg")).toBeTruthy();
    });
});

// ============================================================================
// DurationBadge
// ============================================================================

describe("DurationBadge", () => {
    beforeEach(() => cleanup());

    it("returns null when duration is undefined", () => {
        const { container } = render(<DurationBadge />);
        expect(container.innerHTML).toBe("");
    });

    it("formats milliseconds < 1s", () => {
        render(<DurationBadge durationMs={42} />);
        expect(screen.getByText("42ms")).toBeTruthy();
    });

    it("formats seconds", () => {
        render(<DurationBadge durationMs={3100} />);
        expect(screen.getByText("3.1s")).toBeTruthy();
    });

    it("formats minutes", () => {
        render(<DurationBadge durationMs={90000} />);
        expect(screen.getByText("1.5m")).toBeTruthy();
    });

    it("applies warning class for > 5s", () => {
        const { container } = render(<DurationBadge durationMs={6000} />);
        expect(container.innerHTML).toContain("amber");
    });

    it("applies error class for > 15s", () => {
        const { container } = render(<DurationBadge durationMs={16000} />);
        expect(container.innerHTML).toContain("red");
    });

    it("does not apply warning/error class for normal duration", () => {
        const { container } = render(<DurationBadge durationMs={500} />);
        expect(container.innerHTML).not.toContain("amber");
        expect(container.innerHTML).not.toContain("red");
    });
});

// ============================================================================
// CopyButton
// ============================================================================

describe("CopyButton", () => {
    beforeEach(() => {
        cleanup();
        writeTextMock.mockClear();
        writeTextMock.mockResolvedValue(undefined);
    });

    it("renders copy icon initially", () => {
        const { container } = render(
            <WithTooltip>
                <CopyButton value="test-value" />
            </WithTooltip>,
        );
        expect(container.querySelector("svg")).toBeTruthy();
    });

    it("calls clipboard API on click", async () => {
        render(
            <WithTooltip>
                <CopyButton value="hello" label="greeting" />
            </WithTooltip>,
        );

        const button = screen.getByRole("button");
        await act(async () => {
            fireEvent.click(button);
        });

        expect(writeTextMock).toHaveBeenCalledWith("hello");
    });

    it("swaps to check icon after copy", async () => {
        const { container } = render(
            <WithTooltip>
                <CopyButton value="val" label="thing" />
            </WithTooltip>,
        );

        const button = screen.getByRole("button");
        // Before click — CopyIcon present
        const svgBefore = container.querySelector("svg");
        expect(svgBefore?.classList.contains("text-muted-foreground")).toBe(true);

        await act(async () => {
            fireEvent.click(button);
        });

        // After click — CheckIcon present (emerald color)
        const svgAfter = container.querySelector("svg");
        const classes = svgAfter?.getAttribute("class") ?? "";
        expect(classes).toContain("text-emerald");
    });
});

// ============================================================================
// ClaimRow
// ============================================================================

describe("ClaimRow", () => {
    beforeEach(() => cleanup());

    it("renders name and value", () => {
        render(
            <WithTooltip>
                <ClaimRow name="email" value="user@test.com" />
            </WithTooltip>,
        );
        expect(screen.getByText("email")).toBeTruthy();
        expect(screen.getByText("user@test.com")).toBeTruthy();
    });

    it("shows diff badge for added", () => {
        render(
            <WithTooltip>
                <ClaimRow name="newClaim" value="yes" diffType="added" />
            </WithTooltip>,
        );
        expect(screen.getByText("ADDED")).toBeTruthy();
    });

    it("shows diff badge for modified", () => {
        render(
            <WithTooltip>
                <ClaimRow name="claim" value="new" diffType="modified" oldValue="old" />
            </WithTooltip>,
        );
        expect(screen.getByText("MODIFIED")).toBeTruthy();
    });

    it("shows diff badge for removed", () => {
        render(
            <WithTooltip>
                <ClaimRow name="gone" value="" diffType="removed" />
            </WithTooltip>,
        );
        expect(screen.getByText("REMOVED")).toBeTruthy();
    });

    it("shows old value with strikethrough for modified", () => {
        const { container } = render(
            <WithTooltip>
                <ClaimRow name="claim" value="new" diffType="modified" oldValue="old" />
            </WithTooltip>,
        );

        const strikethrough = container.querySelector(".line-through");
        expect(strikethrough).toBeTruthy();
        expect(strikethrough!.textContent).toBe("old");
    });

    it("shows arrow icon for modified values", () => {
        const { container } = render(
            <WithTooltip>
                <ClaimRow name="claim" value="new" diffType="modified" oldValue="old" />
            </WithTooltip>,
        );
        // ArrowRightIcon is an SVG
        const svgs = container.querySelectorAll("svg");
        expect(svgs.length).toBeGreaterThanOrEqual(1);
    });
});

// ============================================================================
// ErrorDetails / ErrorMessage
// ============================================================================

describe("ErrorDetails", () => {
    beforeEach(() => cleanup());

    it("renders error message", () => {
        render(<ErrorDetails message="Something went wrong" />);
        expect(screen.getByText("Something went wrong")).toBeTruthy();
    });

    it("renders HResult when provided", () => {
        render(<ErrorDetails message="Failed" hResult="80070005" />);
        expect(screen.getByText("0x80070005")).toBeTruthy();
    });

    it("does not render HResult when not provided", () => {
        const { container } = render(<ErrorDetails message="No code" />);
        expect(container.textContent).not.toContain("HResult");
    });
});

describe("ErrorMessage", () => {
    beforeEach(() => cleanup());

    it("renders message text", () => {
        render(<ErrorMessage message="Parse error occurred" />);
        expect(screen.getByText("Parse error occurred")).toBeTruthy();
    });
});
