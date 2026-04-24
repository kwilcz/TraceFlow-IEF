import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    EnvironmentFormFields,
    type EnvironmentDraft,
} from "@/features/log-analyzer/environment-form-fields";

const createDraft = (overrides: Partial<EnvironmentDraft> = {}): EnvironmentDraft => ({
    id: "env-prod",
    name: "Production",
    authType: "app-insights",
    applicationId: "11111111-1111-1111-8111-111111111111",
    apiKey: "prod-api-key",
    persist: true,
    ...overrides,
});

describe("EnvironmentFormFields", () => {
    beforeEach(() => {
        cleanup();
    });

    it("renders the approved labels and helper copy for the environment form", () => {
        render(<EnvironmentFormFields draft={createDraft()} onChange={vi.fn()} />);

        expect(screen.getByLabelText("Display Name")).toHaveValue("Production");
        expect(screen.getByText("Shown in the environment picker.")).toBeInTheDocument();

        const authorizationType = screen.getByRole("combobox", {
            name: "Authorization Type",
        });
        expect(authorizationType).toHaveTextContent("Application Insights API Key");
        expect(authorizationType).toBeDisabled();

        expect(screen.queryByText("Read-only")).not.toBeInTheDocument();
        expect(screen.getByLabelText("Application ID")).toHaveValue(
            "11111111-1111-1111-8111-111111111111",
        );
        expect(screen.getByLabelText("API Key")).toHaveValue("prod-api-key");

        expect(
            screen.getByRole("switch", { name: "Do not persist credentials" }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "When selected, credentials are stored only while the browser window is open.",
            ),
        ).toBeInTheDocument();
    });

    it("uses non-label text semantics for the do not persist switch copy", () => {
        render(<EnvironmentFormFields draft={createDraft()} onChange={vi.fn()} />);

        const switchLabel = screen.getByText("Do not persist credentials");
        const toggle = screen.getByRole("switch", { name: "Do not persist credentials" });

        expect(switchLabel.tagName).not.toBe("LABEL");
        expect(toggle).toHaveAccessibleDescription(
            "When selected, credentials are stored only while the browser window is open.",
        );
    });

    it("maps the do not persist toggle to the persisted draft state", () => {
        const onChange = vi.fn();

        render(
            <EnvironmentFormFields
                draft={createDraft({ persist: true })}
                onChange={onChange}
            />,
        );

        fireEvent.click(screen.getByRole("switch", { name: "Do not persist credentials" }));

        expect(onChange).toHaveBeenCalledWith("persist", false);
    });

    it("uses instance-local ids for the do not persist switch copy", () => {
        render(
            <>
                <EnvironmentFormFields draft={createDraft({ id: "env-1" })} onChange={vi.fn()} />
                <EnvironmentFormFields draft={createDraft({ id: "env-2" })} onChange={vi.fn()} />
            </>,
        );

        const toggles = screen.getAllByRole("switch", { name: "Do not persist credentials" });
        const labelledBy = toggles.map((toggle) => toggle.getAttribute("aria-labelledby"));
        const describedBy = toggles.map((toggle) => toggle.getAttribute("aria-describedby"));

        expect(new Set(labelledBy).size).toBe(2);
        expect(new Set(describedBy).size).toBe(2);
    });
});
