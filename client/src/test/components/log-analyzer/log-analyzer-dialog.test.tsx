import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { LogAnalyzerDialog } from "../../../features/log-analyzer/log-analyzer-dialog.tsx";
import {
    APP_INSIGHTS_AUTH_ERROR_MESSAGES,
    DEFAULT_AUTH_ERROR_MESSAGE,
} from "../../../lib/api/app-insights-auth-error.ts";

const credentialsFormMock = vi.fn();
const mockFetchLogs = vi.fn();
let mockStoreError: string | null = null;

vi.mock("@/features/log-analyzer/credentials-form.tsx", () => ({
    CredentialsForm: (props: {
        onSubmit: (payload: { applicationId: string; apiKey: string; persistCredentials: boolean }) => void;
        onPersistenceToggle?: (persist: boolean) => void;
        initialApplicationId?: string;
        initialApiKey?: string;
        initialPersistCredentials?: boolean;
        isSubmitting?: boolean;
        error?: string | null;
    }) => {
        credentialsFormMock(props);
        return (
            <div>
                <button
                    onClick={() =>
                        props.onSubmit({
                            applicationId: "11111111-1111-1111-8111-111111111111",
                            apiKey: "test-api-key",
                            persistCredentials: false,
                        })
                    }
                >
                    trigger-submit
                </button>
                {props.error && <span data-testid="form-error">{props.error}</span>}
                {props.isSubmitting && <span data-testid="form-submitting">submitting</span>}
            </div>
        );
    },
}));

vi.mock("@/hooks/use-credential-persistence", () => ({
    useCredentialPersistence: () => ({
        shouldSave: false,
        setShouldSave: vi.fn(),
        loadCredentials: () => null,
        saveCredentials: vi.fn(),
        clearCredentials: vi.fn(),
        togglePersistence: vi.fn(),
    }),
}));

vi.mock("@/stores/log-store.ts", () => ({
    useLogStore: Object.assign(
        (selector: (state: Record<string, unknown>) => unknown) =>
            selector({
                fetchLogs: mockFetchLogs,
            }),
        {
            getState: () => ({ error: mockStoreError }),
        },
    ),
}));

describe("LogAnalyzerDialog", () => {
    beforeEach(() => {
        credentialsFormMock.mockClear();
        mockFetchLogs.mockReset();
        mockStoreError = null;
    });

    it("renders connection settings dialog", () => {
        render(
            <LogAnalyzerDialog
                open
                onOpenChange={vi.fn()}
                onConnect={vi.fn()}
            />,
        );

        expect(screen.getByText("Connection Settings")).toBeInTheDocument();
    });

    it("calls fetchLogs on submit and closes on success", async () => {
        const onConnect = vi.fn();
        const onOpenChange = vi.fn();
        mockFetchLogs.mockResolvedValueOnce(undefined);
        mockStoreError = null;

        render(
            <LogAnalyzerDialog
                open
                onOpenChange={onOpenChange}
                onConnect={onConnect}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "trigger-submit" }));

        await waitFor(() => {
            expect(onConnect).toHaveBeenCalledWith({
                applicationId: "11111111-1111-1111-8111-111111111111",
                apiKey: "test-api-key",
            });
        });

        expect(mockFetchLogs).toHaveBeenCalledWith({
            applicationId: "11111111-1111-1111-8111-111111111111",
            apiKey: "test-api-key",
            maxRows: 50,
            timespan: "PT30M",
        });

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("stays open and shows mapped error when store contains known AppInsights auth payload", async () => {
        const onConnect = vi.fn();
        const onOpenChange = vi.fn();
        mockStoreError = JSON.stringify({
            error: {
                message: "The application could not be found",
                code: "ApplicationNotFoundError",
            },
        });
        mockFetchLogs.mockResolvedValueOnce(undefined);

        render(
            <LogAnalyzerDialog
                open
                onOpenChange={onOpenChange}
                onConnect={onConnect}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "trigger-submit" }));

        await waitFor(() => {
            expect(screen.getByTestId("form-error")).toHaveTextContent(
                APP_INSIGHTS_AUTH_ERROR_MESSAGES.ApplicationNotFoundError,
            );
        });

        expect(onConnect).not.toHaveBeenCalled();
        expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });

    it("stays open and shows generic fallback when thrown error payload is unknown", async () => {
        const onConnect = vi.fn();
        const onOpenChange = vi.fn();
        mockStoreError = null;
        mockFetchLogs.mockRejectedValueOnce(new Error("raw backend stacktrace / json"));

        render(
            <LogAnalyzerDialog
                open
                onOpenChange={onOpenChange}
                onConnect={onConnect}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "trigger-submit" }));

        await waitFor(() => {
            expect(screen.getByTestId("form-error")).toHaveTextContent(
                DEFAULT_AUTH_ERROR_MESSAGE,
            );
        });

        expect(screen.getByTestId("form-error")).not.toHaveTextContent("raw backend stacktrace / json");
        expect(onConnect).not.toHaveBeenCalled();
        expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
});
