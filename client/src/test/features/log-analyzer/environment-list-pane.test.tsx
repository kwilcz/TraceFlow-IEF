import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnvironmentListPane } from "@/features/log-analyzer/environment-list-pane";
import type { LogCredentialEnvironment } from "@/types/logs";

const environments: LogCredentialEnvironment[] = [
    {
        id: "env-prod",
        name: "Production",
        authType: "app-insights",
        applicationId: "11111111-1111-1111-8111-111111111111",
        apiKey: "prod-api-key",
        persist: true,
    },
    {
        id: "env-stage",
        name: "Staging",
        authType: "app-insights",
        applicationId: "22222222-2222-4222-8222-222222222222",
        apiKey: "stage-api-key",
        persist: false,
    },
];

describe("EnvironmentListPane", () => {
    beforeEach(() => {
        cleanup();
    });

    it("renders the approved environments rail copy and markers", () => {
        render(
            <EnvironmentListPane
                environments={environments}
                selectedEnvironmentId="env-prod"
                activeEnvironmentId="env-prod"
                onSelectEnvironment={vi.fn()}
                onAddEnvironment={vi.fn()}
            />,
        );

        expect(screen.getByText("Environments")).toBeInTheDocument();
        expect(screen.queryByText("Saved environments")).not.toBeInTheDocument();
        expect(screen.getByText("Active")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Production\s+Active/i }),
        ).toBeInTheDocument();
        expect(screen.queryByText("Saved")).not.toBeInTheDocument();
        expect(screen.queryByText("Session")).not.toBeInTheDocument();
    });

    it("does not override the visible button name with a custom aria-label", () => {
        render(
            <EnvironmentListPane
                environments={environments}
                selectedEnvironmentId="env-prod"
                activeEnvironmentId="env-prod"
                onSelectEnvironment={vi.fn()}
                onAddEnvironment={vi.fn()}
            />,
        );

        expect(
            screen.getByRole("button", { name: /Production\s+Active/i }),
        ).not.toHaveAttribute("aria-label");
    });

    it("uses aria-pressed to expose the selected environment", () => {
        render(
            <EnvironmentListPane
                environments={environments}
                selectedEnvironmentId="env-prod"
                activeEnvironmentId="env-prod"
                onSelectEnvironment={vi.fn()}
                onAddEnvironment={vi.fn()}
            />,
        );

        expect(screen.getByRole("button", { name: /Production\s+Active/i })).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        expect(screen.getByRole("button", { name: "Staging" })).toHaveAttribute(
            "aria-pressed",
            "false",
        );
    });

    it("renders the active marker as inline phrasing content", () => {
        render(
            <EnvironmentListPane
                environments={environments}
                selectedEnvironmentId="env-prod"
                activeEnvironmentId="env-prod"
                onSelectEnvironment={vi.fn()}
                onAddEnvironment={vi.fn()}
            />,
        );

        const productionButton = screen.getByRole("button", { name: /Production\s+Active/i });
        const activeMarker = within(productionButton).getByText("Active");

        expect(activeMarker.tagName).toBe("SPAN");
    });

    it("renders the add action after the environment list", () => {
        render(
            <EnvironmentListPane
                environments={environments}
                selectedEnvironmentId="env-prod"
                activeEnvironmentId="env-prod"
                onSelectEnvironment={vi.fn()}
                onAddEnvironment={vi.fn()}
            />,
        );

        const buttons = screen.getAllByRole("button");
        expect(buttons.at(-1)).toHaveAccessibleName("+ Add New");
    });
});
