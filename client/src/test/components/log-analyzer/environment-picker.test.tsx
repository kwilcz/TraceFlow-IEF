import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY } from "@/constants/log-analyzer.constants";
import { useLogStore } from "../../../stores/log-store";

let EnvironmentPicker: typeof import("../../../features/log-analyzer/environment-picker.tsx").EnvironmentPicker;

describe("EnvironmentPicker", () => {
    const fetchLogsMock = vi.fn();

    beforeAll(async () => {
        ({ EnvironmentPicker } = await import("../../../features/log-analyzer/environment-picker.tsx"));
    });

    beforeEach(() => {
        cleanup();
        fetchLogsMock.mockReset();
        useLogStore.setState(useLogStore.getInitialState());
        useLogStore.setState({
            fetchLogs: fetchLogsMock,
            credentialEnvironments: [
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
            ],
            activeEnvironmentId: "env-prod",
            credentials: {
                applicationId: "11111111-1111-1111-8111-111111111111",
                apiKey: "prod-api-key",
            },
        });
        window.sessionStorage.setItem(ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY, "env-prod");
    });

    it("switches the active environment without fetching logs", async () => {
        render(
            <EnvironmentPicker
                environments={useLogStore.getState().credentialEnvironments}
                activeEnvironmentId={useLogStore.getState().activeEnvironmentId}
                onSelectEnvironment={(environmentId) =>
                    useLogStore.getState().setActiveEnvironment(environmentId)
                }
                onManageEnvironments={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Production" }));
        fireEvent.click(await screen.findByRole("menuitemradio", { name: "Staging" }));

        await waitFor(() => {
            expect(useLogStore.getState().activeEnvironmentId).toBe("env-stage");
        });

        expect(useLogStore.getState().credentials).toEqual({
            applicationId: "22222222-2222-4222-8222-222222222222",
            apiKey: "stage-api-key",
        });
        expect(fetchLogsMock).not.toHaveBeenCalled();
        expect(window.sessionStorage.getItem(ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY)).toBe(
            "env-stage",
        );
    });

    it("exposes the environments management action", async () => {
        const onManageEnvironments = vi.fn();

        render(
            <EnvironmentPicker
                environments={useLogStore.getState().credentialEnvironments}
                activeEnvironmentId={useLogStore.getState().activeEnvironmentId}
                onSelectEnvironment={vi.fn()}
                onManageEnvironments={onManageEnvironments}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Production" }));
        fireEvent.click(await screen.findByRole("menuitem", { name: "⚙ Environments" }));

        expect(onManageEnvironments).toHaveBeenCalledTimes(1);
    });
});
