import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
    ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY,
    LOCAL_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY,
    SESSION_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY,
} from "@/constants/log-analyzer.constants";
import { useCredentialPersistence } from "@/hooks/use-credential-persistence";
import type { LogCredentialEnvironment } from "@/types/logs";

const createEnvironment = (overrides: Partial<LogCredentialEnvironment> = {}): LogCredentialEnvironment => ({
    id: "env-default",
    name: "Default",
    authType: "app-insights",
    applicationId: "app-id",
    apiKey: "api-key",
    persist: false,
    ...overrides,
});

describe("useCredentialPersistence", () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
    });

    it("loads local and session environments together and restores the active environment id", () => {
        const localEnvironment = createEnvironment({
            id: "local-env",
            name: "Local Environment",
            applicationId: "local-app",
            apiKey: "local-key",
            persist: true,
        });
        const sessionEnvironment = createEnvironment({
            id: "session-env",
            name: "Session Environment",
            applicationId: "session-app",
            apiKey: "session-key",
        });

        window.localStorage.setItem(
            LOCAL_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY,
            JSON.stringify([localEnvironment]),
        );
        window.sessionStorage.setItem(
            SESSION_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY,
            JSON.stringify([sessionEnvironment]),
        );
        window.localStorage.setItem(
            ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY,
            sessionEnvironment.id,
        );

        const { result } = renderHook(() => useCredentialPersistence());

        expect(result.current.loadCredentialEnvironments()).toEqual({
            activeEnvironmentId: sessionEnvironment.id,
            environments: [localEnvironment, sessionEnvironment],
        });
        expect(result.current.loadCredentials()).toEqual({
            applicationId: "session-app",
            apiKey: "session-key",
        });
    });

    it("moves an environment between session and local storage when persistence changes", () => {
        const sessionEnvironment = createEnvironment({
            id: "env-1",
            name: "Environment 1",
        });

        const { result } = renderHook(() => useCredentialPersistence());

        act(() => {
            result.current.saveCredentialEnvironment(sessionEnvironment);
        });

        expect(JSON.parse(window.sessionStorage.getItem(SESSION_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY) ?? "[]")).toEqual([
            sessionEnvironment,
        ]);
        expect(window.localStorage.getItem(LOCAL_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY)).toBeNull();
        expect(window.localStorage.getItem(ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY)).toBe(
            sessionEnvironment.id,
        );

        act(() => {
            result.current.togglePersistence(true);
        });

        expect(JSON.parse(window.localStorage.getItem(LOCAL_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY) ?? "[]")).toEqual([
            { ...sessionEnvironment, persist: true },
        ]);
        expect(window.sessionStorage.getItem(SESSION_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY)).toBeNull();
        expect(window.localStorage.getItem(ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY)).toBe(
            sessionEnvironment.id,
        );

        act(() => {
            result.current.togglePersistence(false);
        });

        expect(JSON.parse(window.sessionStorage.getItem(SESSION_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY) ?? "[]")).toEqual([
            sessionEnvironment,
        ]);
        expect(window.localStorage.getItem(LOCAL_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY)).toBeNull();
        expect(window.localStorage.getItem(ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY)).toBe(
            sessionEnvironment.id,
        );
    });
});
