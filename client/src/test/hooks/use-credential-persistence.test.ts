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
        window.sessionStorage.setItem(
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
        expect(window.sessionStorage.getItem(ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY)).toBe(
            sessionEnvironment.id,
        );
        expect(window.localStorage.getItem(ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY)).toBeNull();

        act(() => {
            result.current.togglePersistence(true);
        });

        expect(JSON.parse(window.localStorage.getItem(LOCAL_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY) ?? "[]")).toEqual([
            { ...sessionEnvironment, persist: true },
        ]);
        expect(window.sessionStorage.getItem(SESSION_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY)).toBeNull();
        expect(window.sessionStorage.getItem(ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY)).toBe(
            sessionEnvironment.id,
        );
        expect(window.localStorage.getItem(ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY)).toBeNull();

        act(() => {
            result.current.togglePersistence(false);
        });

        expect(JSON.parse(window.sessionStorage.getItem(SESSION_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY) ?? "[]")).toEqual([
            sessionEnvironment,
        ]);
        expect(window.localStorage.getItem(LOCAL_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY)).toBeNull();
        expect(window.sessionStorage.getItem(ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY)).toBe(
            sessionEnvironment.id,
        );
        expect(window.localStorage.getItem(ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY)).toBeNull();
    });

    it("does not clear saved environments when saveCredentials receives empty values", () => {
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
        window.sessionStorage.setItem(
            ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY,
            sessionEnvironment.id,
        );

        const { result } = renderHook(() => useCredentialPersistence());

        act(() => {
            result.current.saveCredentials({
                applicationId: "",
                apiKey: "",
            });
        });

        expect(result.current.loadCredentialEnvironments()).toEqual({
            activeEnvironmentId: sessionEnvironment.id,
            environments: [localEnvironment, sessionEnvironment],
        });
        expect(window.localStorage.getItem(LOCAL_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY)).toBe(
            JSON.stringify([localEnvironment]),
        );
        expect(window.sessionStorage.getItem(SESSION_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY)).toBe(
            JSON.stringify([sessionEnvironment]),
        );
        expect(window.sessionStorage.getItem(ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY)).toBe(
            sessionEnvironment.id,
        );
    });

    it("keeps the existing active environment when saving a different environment", () => {
        const activeEnvironment = createEnvironment({
            id: "env-prod",
            name: "Production",
            applicationId: "prod-app",
            apiKey: "prod-key",
            persist: true,
        });
        const editedEnvironment = createEnvironment({
            id: "env-stage",
            name: "Staging",
            applicationId: "stage-app",
            apiKey: "stage-key",
        });

        window.localStorage.setItem(
            LOCAL_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY,
            JSON.stringify([activeEnvironment]),
        );
        window.sessionStorage.setItem(
            SESSION_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY,
            JSON.stringify([editedEnvironment]),
        );
        window.sessionStorage.setItem(
            ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY,
            activeEnvironment.id,
        );

        const { result } = renderHook(() => useCredentialPersistence());

        act(() => {
            result.current.saveCredentialEnvironment({
                ...editedEnvironment,
                applicationId: "updated-stage-app",
                apiKey: "updated-stage-key",
            });
        });

        expect(result.current.loadCredentialEnvironments()).toEqual({
            activeEnvironmentId: activeEnvironment.id,
            environments: [
                activeEnvironment,
                {
                    ...editedEnvironment,
                    applicationId: "updated-stage-app",
                    apiKey: "updated-stage-key",
                },
            ],
        });
        expect(result.current.loadCredentials()).toEqual({
            applicationId: activeEnvironment.applicationId,
            apiKey: activeEnvironment.apiKey,
        });
    });

    it("preserves environment order when editing an existing environment", () => {
        const firstEnvironment = createEnvironment({
            id: "env-dev",
            name: "Development",
            applicationId: "dev-app",
            apiKey: "dev-key",
        });
        const editedEnvironment = createEnvironment({
            id: "env-stage",
            name: "Staging",
            applicationId: "stage-app",
            apiKey: "stage-key",
        });
        const thirdEnvironment = createEnvironment({
            id: "env-prod",
            name: "Production",
            applicationId: "prod-app",
            apiKey: "prod-key",
        });

        window.sessionStorage.setItem(
            SESSION_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY,
            JSON.stringify([firstEnvironment, editedEnvironment, thirdEnvironment]),
        );
        window.sessionStorage.setItem(
            ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY,
            firstEnvironment.id,
        );

        const { result } = renderHook(() => useCredentialPersistence());

        act(() => {
            result.current.saveCredentialEnvironment({
                ...editedEnvironment,
                name: "Staging EU",
                applicationId: "stage-eu-app",
                apiKey: "stage-eu-key",
            });
        });

        expect(result.current.loadCredentialEnvironments()).toEqual({
            activeEnvironmentId: firstEnvironment.id,
            environments: [
                firstEnvironment,
                {
                    ...editedEnvironment,
                    name: "Staging EU",
                    applicationId: "stage-eu-app",
                    apiKey: "stage-eu-key",
                },
                thirdEnvironment,
            ],
        });
    });

    it("clears the active selection when deleting the active environment", () => {
        const activeEnvironment = createEnvironment({
            id: "env-prod",
            name: "Production",
            applicationId: "prod-app",
            apiKey: "prod-key",
            persist: true,
        });
        const remainingEnvironment = createEnvironment({
            id: "env-stage",
            name: "Staging",
            applicationId: "stage-app",
            apiKey: "stage-key",
        });

        window.localStorage.setItem(
            LOCAL_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY,
            JSON.stringify([activeEnvironment]),
        );
        window.sessionStorage.setItem(
            SESSION_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY,
            JSON.stringify([remainingEnvironment]),
        );
        window.sessionStorage.setItem(
            ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY,
            activeEnvironment.id,
        );

        const { result } = renderHook(() => useCredentialPersistence());

        act(() => {
            result.current.deleteCredentialEnvironment(activeEnvironment.id);
        });

        expect(result.current.loadCredentialEnvironments()).toEqual({
            activeEnvironmentId: null,
            environments: [remainingEnvironment],
        });
        expect(result.current.loadCredentials()).toBeNull();
        expect(window.sessionStorage.getItem(ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY)).toBe("");
    });
});
