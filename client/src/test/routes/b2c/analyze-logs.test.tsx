import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { useLogStore } from "@/stores/log-store";

const loadCredentialEnvironmentsMock = vi.fn();

vi.mock("@/features/log-analyzer/log-analyzer-landing.tsx", () => ({
    LogAnalyzerLanding: () => <div>landing-view</div>,
}));

vi.mock("@/features/log-analyzer/log-analyzer-workspace.tsx", () => ({
    LogAnalyzerWorkspace: () => <div>workspace-view</div>,
}));

vi.mock("@/features/log-analyzer/log-analyzer-dialog.tsx", () => ({
    LogAnalyzerDialog: (props: {
        onConnect: (credentials: { applicationId: string; apiKey: string }) => void;
    }) => (
        <div>
            dialog-view
            <button
                onClick={() =>
                    props.onConnect({
                        applicationId: "11111111-1111-1111-8111-111111111111",
                        apiKey: "prod-api-key",
                    })
                }
            >
                trigger-connect
            </button>
        </div>
    ),
}));

vi.mock("@/hooks/use-credential-persistence", () => ({
    useCredentialPersistence: () => ({
        loadCredentialEnvironments: loadCredentialEnvironmentsMock,
    }),
}));

describe("AnalyzeLogsPage route hydration", () => {
    beforeEach(() => {
        cleanup();
        useLogStore.setState(useLogStore.getInitialState());
        loadCredentialEnvironmentsMock.mockReset();
    });

    it("hydrates stored environments into the store and shows the workspace for the active environment", async () => {
        loadCredentialEnvironmentsMock.mockReturnValue({
            activeEnvironmentId: "env-prod",
            environments: [
                {
                    id: "env-prod",
                    name: "Production",
                    authType: "app-insights",
                    applicationId: "11111111-1111-1111-8111-111111111111",
                    apiKey: "prod-api-key",
                    persist: true,
                },
            ],
        });
        const routeModule = await import("@/routes/b2c/analyze-logs.tsx");
        const AnalyzeLogsPage = routeModule.Route.options.component as React.ComponentType;

        render(<AnalyzeLogsPage />);

        await waitFor(() => {
            expect(screen.getByText("workspace-view")).toBeInTheDocument();
        });

        expect(useLogStore.getState().activeEnvironmentId).toBe("env-prod");
        expect(useLogStore.getState().credentialEnvironments).toEqual([
            expect.objectContaining({
                id: "env-prod",
                applicationId: "11111111-1111-1111-8111-111111111111",
                apiKey: "prod-api-key",
            }),
        ]);
        expect(useLogStore.getState().credentials).toEqual({
            applicationId: "11111111-1111-1111-8111-111111111111",
            apiKey: "prod-api-key",
        });
    });

    it("rehydrates from stored environments after a successful connect", async () => {
        loadCredentialEnvironmentsMock
            .mockReturnValueOnce({
                activeEnvironmentId: null,
                environments: [],
            })
            .mockReturnValueOnce({
                activeEnvironmentId: "env-prod",
                environments: [
                    {
                        id: "env-prod",
                        name: "Production",
                        authType: "app-insights",
                        applicationId: "11111111-1111-1111-8111-111111111111",
                        apiKey: "prod-api-key",
                        persist: true,
                    },
                ],
            });
        const routeModule = await import("@/routes/b2c/analyze-logs.tsx");
        const AnalyzeLogsPage = routeModule.Route.options.component as React.ComponentType;

        render(<AnalyzeLogsPage />);

        expect(screen.getByText("landing-view")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "trigger-connect" }));

        await waitFor(() => {
            expect(screen.getByText("workspace-view")).toBeInTheDocument();
        });

        expect(useLogStore.getState().activeEnvironmentId).toBe("env-prod");
    });

    it("creates an active environment for a successful connect when storage is still empty", async () => {
        loadCredentialEnvironmentsMock.mockReturnValue({
            activeEnvironmentId: null,
            environments: [],
        });
        const routeModule = await import("@/routes/b2c/analyze-logs.tsx");
        const AnalyzeLogsPage = routeModule.Route.options.component as React.ComponentType;

        render(<AnalyzeLogsPage />);

        expect(screen.getByText("landing-view")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "trigger-connect" }));

        await waitFor(() => {
            expect(screen.getByText("workspace-view")).toBeInTheDocument();
        });

        expect(useLogStore.getState().activeEnvironmentId).toBeTruthy();
        expect(useLogStore.getState().credentials).toEqual({
            applicationId: "11111111-1111-1111-8111-111111111111",
            apiKey: "prod-api-key",
        });
    });

    it("returns to the landing view when the active environment is deleted", async () => {
        loadCredentialEnvironmentsMock.mockReturnValue({
            activeEnvironmentId: "env-prod",
            environments: [
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
        });
        const routeModule = await import("@/routes/b2c/analyze-logs.tsx");
        const AnalyzeLogsPage = routeModule.Route.options.component as React.ComponentType;

        render(<AnalyzeLogsPage />);

        await waitFor(() => {
            expect(screen.getByText("workspace-view")).toBeInTheDocument();
        });

        act(() => {
            useLogStore.getState().setCredentialEnvironments({
                activeEnvironmentId: null,
                environments: [
                    {
                        id: "env-stage",
                        name: "Staging",
                        authType: "app-insights",
                        applicationId: "22222222-2222-4222-8222-222222222222",
                        apiKey: "stage-api-key",
                        persist: false,
                    },
                ],
            });
        });

        await waitFor(() => {
            expect(screen.getByText("landing-view")).toBeInTheDocument();
        });

        expect(useLogStore.getState().activeEnvironmentId).toBeNull();
        expect(useLogStore.getState().credentials).toEqual({
            applicationId: "",
            apiKey: "",
        });
        expect(useLogStore.getState().credentialEnvironments).toEqual([
            expect.objectContaining({
                id: "env-stage",
                applicationId: "22222222-2222-4222-8222-222222222222",
                apiKey: "stage-api-key",
            }),
        ]);
    });
});
