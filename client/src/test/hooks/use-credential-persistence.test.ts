import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
    CREDENTIALS_STORAGE_KEY,
    SESSION_CREDENTIALS_STORAGE_KEY,
} from "@/constants/log-analyzer.constants";
import { useCredentialPersistence } from "@/hooks/use-credential-persistence";

describe("useCredentialPersistence", () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
    });

    it("stores credentials in sessionStorage by default", () => {
        const { result } = renderHook(() => useCredentialPersistence());

        act(() => {
            result.current.saveCredentials({
                applicationId: "app-id",
                apiKey: "api-key",
            });
        });

        expect(window.sessionStorage.getItem(SESSION_CREDENTIALS_STORAGE_KEY)).toBeTruthy();
        expect(window.localStorage.getItem(CREDENTIALS_STORAGE_KEY)).toBeNull();
    });

    it("stores credentials in localStorage when persist opt-in is enabled", () => {
        const { result } = renderHook(() => useCredentialPersistence());

        act(() => {
            result.current.setShouldSave(true);
            result.current.saveCredentials(
                {
                    applicationId: "app-id",
                    apiKey: "api-key",
                },
                true,
            );
        });

        expect(window.localStorage.getItem(CREDENTIALS_STORAGE_KEY)).toBeTruthy();
        expect(window.sessionStorage.getItem(SESSION_CREDENTIALS_STORAGE_KEY)).toBeNull();
    });

    it("loads local credentials before session credentials", () => {
        window.localStorage.setItem(
            CREDENTIALS_STORAGE_KEY,
            JSON.stringify({ applicationId: "local-app", apiKey: "local-key" }),
        );
        window.sessionStorage.setItem(
            SESSION_CREDENTIALS_STORAGE_KEY,
            JSON.stringify({ applicationId: "session-app", apiKey: "session-key" }),
        );

        const { result } = renderHook(() => useCredentialPersistence());

        expect(result.current.loadCredentials()).toEqual({
            applicationId: "local-app",
            apiKey: "local-key",
        });
    });
});
