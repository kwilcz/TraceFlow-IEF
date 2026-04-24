import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { useLogStore } from "../../../stores/log-store";
import { AppInsightsCredentialValidationError } from "../../../features/log-analyzer/services/credential-validation-service";

type StoredEnvironments = {
    activeEnvironmentId: string | null;
    environments: Array<{
        id: string;
        name: string;
        authType: "app-insights";
        applicationId: string;
        apiKey: string;
        persist: boolean;
    }>;
};

let storedEnvironments: StoredEnvironments;
const loadCredentialEnvironmentsMock = vi.fn(() => storedEnvironments);
const saveCredentialEnvironmentMock = vi.fn(
    (environment: StoredEnvironments["environments"][number]) => {
        const existingIndex = storedEnvironments.environments.findIndex(
            (existingEnvironment) => existingEnvironment.id === environment.id,
        );
        const environments =
            existingIndex === -1
                ? [...storedEnvironments.environments, environment]
                : storedEnvironments.environments.map((existingEnvironment, index) =>
                    index === existingIndex ? environment : existingEnvironment,
                );

        storedEnvironments = {
            activeEnvironmentId: storedEnvironments.activeEnvironmentId ?? environment.id,
            environments,
        };
    },
);
const deleteCredentialEnvironmentMock = vi.fn((environmentId: string) => {
    storedEnvironments = {
        activeEnvironmentId:
            storedEnvironments.activeEnvironmentId === environmentId
                ? null
                : storedEnvironments.activeEnvironmentId,
        environments: storedEnvironments.environments.filter(
            (environment) => environment.id !== environmentId,
        ),
    };
});

const { validateAppInsightsCredentialsMock } = vi.hoisted(() => ({
    validateAppInsightsCredentialsMock: vi.fn(),
}));

vi.mock("@/features/log-analyzer/services/credential-validation-service", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/features/log-analyzer/services/credential-validation-service")>();

    return {
        ...actual,
        validateAppInsightsCredentials: validateAppInsightsCredentialsMock,
    };
});

vi.mock("@/hooks/use-credential-persistence", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/hooks/use-credential-persistence")>();

    return {
        ...actual,
        useCredentialPersistence: () => ({
            loadCredentialEnvironments: loadCredentialEnvironmentsMock,
            saveCredentialEnvironment: saveCredentialEnvironmentMock,
            deleteCredentialEnvironment: deleteCredentialEnvironmentMock,
        }),
    };
});

let LogAnalyzerDialog: typeof import("../../../features/log-analyzer/log-analyzer-dialog.tsx").LogAnalyzerDialog;

describe("LogAnalyzerDialog", () => {
    beforeAll(async () => {
        ({ LogAnalyzerDialog } = await import("../../../features/log-analyzer/log-analyzer-dialog.tsx"));
    });

    beforeEach(() => {
        cleanup();
        useLogStore.setState(useLogStore.getInitialState());

        storedEnvironments = {
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
        };

        loadCredentialEnvironmentsMock.mockClear();
        saveCredentialEnvironmentMock.mockClear();
        deleteCredentialEnvironmentMock.mockClear();
        validateAppInsightsCredentialsMock.mockReset();
        validateAppInsightsCredentialsMock.mockResolvedValue(undefined);

        useLogStore.setState({
            credentialEnvironments: storedEnvironments.environments,
            activeEnvironmentId: storedEnvironments.activeEnvironmentId,
            credentials: {
                applicationId: storedEnvironments.environments[0].applicationId,
                apiKey: storedEnvironments.environments[0].apiKey,
            },
        });
    });

    it("renders the environment manager surface with the approved concise copy", () => {
        render(
            <LogAnalyzerDialog
                open
                onOpenChange={vi.fn()}
                onConnect={vi.fn()}
            />,
        );

        expect(screen.getByRole("heading", { name: "Manage Environments" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Production/ })).toBeInTheDocument();
        expect(
            screen.queryByText("Manage named Application Insights credential environments for the log analyzer."),
        ).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();

        const authTypeField = screen.getByLabelText("Authorization Type");
        expect(authTypeField).toHaveTextContent("Application Insights API Key");
        expect(authTypeField).toBeDisabled();
    });

    it("hides the left rail and shows concise empty-state copy when there are no saved environments", () => {
        useLogStore.setState(useLogStore.getInitialState());
        storedEnvironments = {
            activeEnvironmentId: null,
            environments: [],
        };

        render(
            <LogAnalyzerDialog
                open
                onOpenChange={vi.fn()}
                onConnect={vi.fn()}
            />,
        );

        expect(screen.getByRole("heading", { name: "Manage Environments" })).toBeInTheDocument();
        expect(screen.getByText("Create your first environment.")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Production" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "+ Add New" })).not.toBeInTheDocument();
    });

    it("validates credentials before save and reflects the verifying state", async () => {
        let resolveValidation: (() => void) | null = null;
        validateAppInsightsCredentialsMock.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolveValidation = resolve;
                }),
        );

        render(
            <LogAnalyzerDialog
                open
                onOpenChange={vi.fn()}
                onConnect={vi.fn()}
            />,
        );

        fireEvent.change(screen.getByLabelText("Display Name"), {
            target: { value: "Production EU" },
        });
        fireEvent.change(screen.getByLabelText("Application ID"), {
            target: { value: "22222222-2222-4222-8222-222222222222" },
        });
        fireEvent.change(screen.getByLabelText("API Key"), {
            target: { value: "updated-api-key" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        expect(validateAppInsightsCredentialsMock).toHaveBeenCalledWith({
            applicationId: "22222222-2222-4222-8222-222222222222",
            apiKey: "updated-api-key",
        });
        expect(saveCredentialEnvironmentMock).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Verifying..." })).toBeDisabled();

        resolveValidation?.();

        await waitFor(() => {
            expect(saveCredentialEnvironmentMock).toHaveBeenCalledTimes(1);
        });
    });

    it("blocks relevant dialog interactions while verification is pending", async () => {
        let resolveValidation: (() => void) | null = null;
        validateAppInsightsCredentialsMock.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolveValidation = resolve;
                }),
        );
        const onOpenChange = vi.fn();

        render(
            <LogAnalyzerDialog
                open
                onOpenChange={onOpenChange}
                onConnect={vi.fn()}
            />,
        );

        fireEvent.change(screen.getByLabelText("Display Name"), {
            target: { value: "Production EU" },
        });
        fireEvent.change(screen.getByLabelText("Application ID"), {
            target: { value: "22222222-2222-4222-8222-222222222222" },
        });
        fireEvent.change(screen.getByLabelText("API Key"), {
            target: { value: "updated-api-key" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        const displayNameInput = screen.getByLabelText("Display Name");
        expect(screen.getByRole("button", { name: "Verifying..." })).toBeDisabled();
        expect(screen.getByRole("button", { name: /Production/ })).toBeDisabled();
        expect(screen.getByRole("button", { name: "+ Add New" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
        expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();

        fireEvent.change(displayNameInput, {
            target: { value: "Mutated while saving" },
        });
        fireEvent.click(screen.getByRole("button", { name: "+ Add New" }));
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(displayNameInput).toHaveValue("Production EU");
        expect(onOpenChange).not.toHaveBeenCalled();

        resolveValidation?.();

        await waitFor(() => {
            expect(saveCredentialEnvironmentMock).toHaveBeenCalledTimes(1);
        });
    });

    it("blocks save and shows an inline error when credential verification fails", async () => {
        validateAppInsightsCredentialsMock.mockRejectedValue(
            new AppInsightsCredentialValidationError("That Application ID or API Key was rejected.", new Error("401")),
        );
        const onConnect = vi.fn();
        const onOpenChange = vi.fn();

        render(
            <LogAnalyzerDialog
                open
                onOpenChange={onOpenChange}
                onConnect={onConnect}
            />,
        );

        fireEvent.change(screen.getByLabelText("Display Name"), {
            target: { value: "Production EU" },
        });
        fireEvent.change(screen.getByLabelText("Application ID"), {
            target: { value: "22222222-2222-4222-8222-222222222222" },
        });
        fireEvent.change(screen.getByLabelText("API Key"), {
            target: { value: "invalid-api-key" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(screen.getByText("Unable to verify credentials")).toBeInTheDocument();
        });

        expect(screen.getByText("That Application ID or API Key was rejected.")).toBeInTheDocument();
        expect(screen.getByLabelText("Display Name")).toHaveValue("Production EU");
        expect(saveCredentialEnvironmentMock).not.toHaveBeenCalled();
        expect(onConnect).not.toHaveBeenCalled();
        expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });

    it("shows a save-specific error when persistence fails after verification succeeds", async () => {
        saveCredentialEnvironmentMock.mockImplementationOnce(() => {
            throw new Error("Storage unavailable");
        });
        const onConnect = vi.fn();
        const onOpenChange = vi.fn();

        render(
            <LogAnalyzerDialog
                open
                onOpenChange={onOpenChange}
                onConnect={onConnect}
            />,
        );

        fireEvent.change(screen.getByLabelText("Display Name"), {
            target: { value: "Production EU" },
        });
        fireEvent.change(screen.getByLabelText("Application ID"), {
            target: { value: "22222222-2222-4222-8222-222222222222" },
        });
        fireEvent.change(screen.getByLabelText("API Key"), {
            target: { value: "updated-api-key" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(screen.getByText("Unable to save")).toBeInTheDocument();
        });

        expect(screen.queryByText("Unable to verify credentials")).not.toBeInTheDocument();
        expect(screen.getByText("Storage unavailable")).toBeInTheDocument();
        expect(onConnect).not.toHaveBeenCalled();
        expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });

    it("saves edited environment data through the current persistence/store flow", async () => {
        const onConnect = vi.fn();
        const onOpenChange = vi.fn();

        render(
            <LogAnalyzerDialog
                open
                onOpenChange={onOpenChange}
                onConnect={onConnect}
            />,
        );

        fireEvent.change(screen.getByLabelText("Display Name"), {
            target: { value: "Production EU" },
        });
        fireEvent.change(screen.getByLabelText("Application ID"), {
            target: { value: "22222222-2222-4222-8222-222222222222" },
        });
        fireEvent.change(screen.getByLabelText("API Key"), {
            target: { value: "updated-api-key" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(validateAppInsightsCredentialsMock).toHaveBeenCalledWith({
                applicationId: "22222222-2222-4222-8222-222222222222",
                apiKey: "updated-api-key",
            });
            expect(saveCredentialEnvironmentMock).toHaveBeenCalledWith({
                id: "env-prod",
                name: "Production EU",
                authType: "app-insights",
                applicationId: "22222222-2222-4222-8222-222222222222",
                apiKey: "updated-api-key",
                persist: true,
            });
        });

        expect(loadCredentialEnvironmentsMock).toHaveBeenCalled();
        expect(useLogStore.getState().activeEnvironmentId).toBe("env-prod");
        expect(useLogStore.getState().credentials).toEqual({
            applicationId: "22222222-2222-4222-8222-222222222222",
            apiKey: "updated-api-key",
        });
        expect(onConnect).toHaveBeenCalledWith({
            applicationId: "22222222-2222-4222-8222-222222222222",
            apiKey: "updated-api-key",
        });
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("selects a persisted environment from the fallback list when the store is empty", async () => {
        useLogStore.setState(useLogStore.getInitialState());
        storedEnvironments = {
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
        };

        render(
            <LogAnalyzerDialog
                open
                onOpenChange={vi.fn()}
                onConnect={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Staging" }));

        await waitFor(() => {
            expect(screen.getByLabelText("Display Name")).toHaveValue("Staging");
        });

        expect(screen.getByLabelText("Application ID")).toHaveValue(
            "22222222-2222-4222-8222-222222222222",
        );
        expect(screen.getByLabelText("API Key")).toHaveValue("stage-api-key");
    });

    it("keeps the active environment and list order when saving a different environment", async () => {
        const onConnect = vi.fn();
        const onOpenChange = vi.fn();

        storedEnvironments = {
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
        };

        useLogStore.setState({
            credentialEnvironments: storedEnvironments.environments,
            activeEnvironmentId: storedEnvironments.activeEnvironmentId,
            credentials: {
                applicationId: "11111111-1111-1111-8111-111111111111",
                apiKey: "prod-api-key",
            },
        });

        render(
            <LogAnalyzerDialog
                open
                onOpenChange={onOpenChange}
                onConnect={onConnect}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Staging" }));
        fireEvent.change(screen.getByLabelText("Display Name"), {
            target: { value: "Staging EU" },
        });
        fireEvent.change(screen.getByLabelText("Application ID"), {
            target: { value: "33333333-3333-4333-8333-333333333333" },
        });
        fireEvent.change(screen.getByLabelText("API Key"), {
            target: { value: "stage-eu-api-key" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(validateAppInsightsCredentialsMock).toHaveBeenCalledWith({
                applicationId: "33333333-3333-4333-8333-333333333333",
                apiKey: "stage-eu-api-key",
            });
            expect(saveCredentialEnvironmentMock).toHaveBeenCalledWith({
                id: "env-stage",
                name: "Staging EU",
                authType: "app-insights",
                applicationId: "33333333-3333-4333-8333-333333333333",
                apiKey: "stage-eu-api-key",
                persist: false,
            });
        });

        expect(useLogStore.getState().activeEnvironmentId).toBe("env-prod");
        expect(useLogStore.getState().credentials).toEqual({
            applicationId: "11111111-1111-1111-8111-111111111111",
            apiKey: "prod-api-key",
        });
        expect(useLogStore.getState().credentialEnvironments).toEqual([
            storedEnvironments.environments[0],
            {
                id: "env-stage",
                name: "Staging EU",
                authType: "app-insights",
                applicationId: "33333333-3333-4333-8333-333333333333",
                apiKey: "stage-eu-api-key",
                persist: false,
            },
        ]);
        expect(onConnect).toHaveBeenCalledWith({
            applicationId: "33333333-3333-4333-8333-333333333333",
            apiKey: "stage-eu-api-key",
        });
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("deletes the selected environment through the persistence/store flow", async () => {
        const onConnect = vi.fn();
        const onOpenChange = vi.fn();

        render(
            <LogAnalyzerDialog
                open
                onOpenChange={onOpenChange}
                onConnect={onConnect}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Delete" }));

        await waitFor(() => {
            expect(deleteCredentialEnvironmentMock).toHaveBeenCalledWith("env-prod");
        });

        expect(useLogStore.getState().activeEnvironmentId).toBeNull();
        expect(useLogStore.getState().credentialEnvironments).toEqual([]);
        expect(useLogStore.getState().credentials).toEqual({
            applicationId: "",
            apiKey: "",
        });
        expect(onConnect).not.toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
