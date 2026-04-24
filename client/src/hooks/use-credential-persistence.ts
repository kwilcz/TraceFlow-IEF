import { useState } from "react";
import {
    ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY,
    LOCAL_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY,
    SESSION_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY,
} from "@/constants/log-analyzer.constants";
import type {
    LogCredentialAuthType,
    LogCredentialEnvironment,
    LogCredentials,
    StoredLogCredentialEnvironments,
} from "@/types/logs";

const APP_INSIGHTS_AUTH_TYPE: LogCredentialAuthType = "app-insights";
const DEFAULT_ENVIRONMENT_ID = "default";
const DEFAULT_ENVIRONMENT_NAME = "Default";
const NO_ACTIVE_ENVIRONMENT_SENTINEL = "";

type StorageScope = "local" | "session";

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const parseCredentialFields = (value: unknown): LogCredentials | null => {
    if (!isRecord(value)) return null;
    if (typeof value.applicationId !== "string" || typeof value.apiKey !== "string") {
        return null;
    }

    return {
        applicationId: value.applicationId,
        apiKey: value.apiKey,
    };
};

const parseStoredEnvironment = (value: unknown, persist: boolean): LogCredentialEnvironment | null => {
    if (!isRecord(value)) return null;

    const credentials = parseCredentialFields(value);
    if (!credentials) return null;

    if (
        typeof value.id !== "string" ||
        typeof value.name !== "string" ||
        value.authType !== APP_INSIGHTS_AUTH_TYPE
    ) {
        return null;
    }

    return {
        id: value.id,
        name: value.name,
        authType: APP_INSIGHTS_AUTH_TYPE,
        applicationId: credentials.applicationId,
        apiKey: credentials.apiKey,
        // The storage bucket determines persistence; ignore any serialized flag.
        persist,
    };
};

const toLegacyEnvironment = (credentials: LogCredentials, persist: boolean): LogCredentialEnvironment => ({
    id: DEFAULT_ENVIRONMENT_ID,
    name: DEFAULT_ENVIRONMENT_NAME,
    authType: APP_INSIGHTS_AUTH_TYPE,
    applicationId: credentials.applicationId,
    apiKey: credentials.apiKey,
    persist,
});

const parseStoredEnvironments = (raw: string | null, persist: boolean): LogCredentialEnvironment[] => {
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
            return parsed
                .map((environment) => parseStoredEnvironment(environment, persist))
                .filter((environment): environment is LogCredentialEnvironment => environment !== null);
        }

        const legacyCredentials = parseCredentialFields(parsed);
        return legacyCredentials ? [toLegacyEnvironment(legacyCredentials, persist)] : [];
    } catch {
        return [];
    }
};

const writeStoredEnvironments = (
    environments: LogCredentialEnvironment[],
    scope: StorageScope,
): void => {
    const storage = scope === "local" ? window.localStorage : window.sessionStorage;
    const key =
        scope === "local"
            ? LOCAL_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY
            : SESSION_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY;

    if (environments.length === 0) {
        storage.removeItem(key);
        return;
    }

    storage.setItem(key, JSON.stringify(environments));
};

const loadCredentialEnvironmentsFromStorage = (): StoredLogCredentialEnvironments => {
    if (typeof window === "undefined") {
        return { activeEnvironmentId: null, environments: [] };
    }

    const localEnvironments = parseStoredEnvironments(
        window.localStorage.getItem(LOCAL_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY),
        true,
    );
    const sessionEnvironments = parseStoredEnvironments(
        window.sessionStorage.getItem(SESSION_CREDENTIAL_ENVIRONMENTS_STORAGE_KEY),
        false,
    );
    const environments = [...localEnvironments, ...sessionEnvironments];

    const storedActiveEnvironmentId = window.sessionStorage.getItem(
        ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY,
    );
    const activeEnvironmentId =
        storedActiveEnvironmentId === NO_ACTIVE_ENVIRONMENT_SENTINEL
            ? null
            : environments.some((environment) => environment.id === storedActiveEnvironmentId)
                ? storedActiveEnvironmentId
                : storedActiveEnvironmentId === null
                    ? (environments[0]?.id ?? null)
                    : null;

    return {
        activeEnvironmentId,
        environments,
    };
};

const getActiveEnvironment = (
    stored: StoredLogCredentialEnvironments,
): LogCredentialEnvironment | null =>
    stored.environments.find((environment) => environment.id === stored.activeEnvironmentId) ?? null;

const hasPersistedActiveEnvironment = (): boolean =>
    getActiveEnvironment(loadCredentialEnvironmentsFromStorage())?.persist ?? false;

export const persistActiveCredentialEnvironmentId = (
    activeEnvironmentId: string | null,
): void => {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.removeItem(ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY);

    if (activeEnvironmentId) {
        window.sessionStorage.setItem(
            ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY,
            activeEnvironmentId,
        );
        return;
    }

    window.sessionStorage.setItem(
        ACTIVE_CREDENTIAL_ENVIRONMENT_ID_STORAGE_KEY,
        NO_ACTIVE_ENVIRONMENT_SENTINEL,
    );
};

const saveCredentialEnvironmentsToStorage = (
    environments: LogCredentialEnvironment[],
    activeEnvironmentId: string | null,
): void => {
    const localEnvironments = environments
        .filter((environment) => environment.persist)
        .map((environment) => ({ ...environment, persist: true }));
    const sessionEnvironments = environments
        .filter((environment) => !environment.persist)
        .map((environment) => ({ ...environment, persist: false }));

    writeStoredEnvironments(localEnvironments, "local");
    writeStoredEnvironments(sessionEnvironments, "session");
    persistActiveCredentialEnvironmentId(activeEnvironmentId);
};

const upsertEnvironment = (
    environments: LogCredentialEnvironment[],
    environment: LogCredentialEnvironment,
): LogCredentialEnvironment[] => {
    const existingIndex = environments.findIndex(
        (existingEnvironment) => existingEnvironment.id === environment.id,
    );

    if (existingIndex === -1) {
        return [...environments, environment];
    }

    return environments.map((existingEnvironment, index) =>
        index === existingIndex ? environment : existingEnvironment,
    );
};

export const useCredentialPersistence = () => {
    const [shouldSave, setShouldSave] = useState(hasPersistedActiveEnvironment);

    const saveCredentialEnvironment = (environment: LogCredentialEnvironment): void => {
        if (typeof window === "undefined") return;

        const normalizedEnvironment: LogCredentialEnvironment = {
            ...environment,
            authType: APP_INSIGHTS_AUTH_TYPE,
        };
        const stored = loadCredentialEnvironmentsFromStorage();
        const environments = upsertEnvironment(stored.environments, normalizedEnvironment);
        const nextActiveEnvironmentId = stored.activeEnvironmentId ?? normalizedEnvironment.id;

        saveCredentialEnvironmentsToStorage(environments, nextActiveEnvironmentId);
        setShouldSave(
            getActiveEnvironment({
                activeEnvironmentId: nextActiveEnvironmentId,
                environments,
            })?.persist ?? false,
        );
    };

    const deleteCredentialEnvironment = (environmentId: string): void => {
        if (typeof window === "undefined") return;

        const stored = loadCredentialEnvironmentsFromStorage();
        const environments = stored.environments.filter(
            (environment) => environment.id !== environmentId,
        );
        const activeEnvironmentId =
            stored.activeEnvironmentId === environmentId ? null : stored.activeEnvironmentId;

        saveCredentialEnvironmentsToStorage(environments, activeEnvironmentId);
        setShouldSave(
            getActiveEnvironment({
                activeEnvironmentId,
                environments,
            })?.persist ?? false,
        );
    };

    const saveCredentials = (credentials: LogCredentials, persistOverride?: boolean): void => {
        if (typeof window === "undefined") return;

        if (!credentials.applicationId || !credentials.apiKey) {
            return;
        }

        const stored = loadCredentialEnvironmentsFromStorage();
        const activeEnvironment = getActiveEnvironment(stored);
        const persist = persistOverride ?? shouldSave;

        saveCredentialEnvironment({
            id: activeEnvironment?.id ?? DEFAULT_ENVIRONMENT_ID,
            name: activeEnvironment?.name ?? DEFAULT_ENVIRONMENT_NAME,
            authType: APP_INSIGHTS_AUTH_TYPE,
            applicationId: credentials.applicationId,
            apiKey: credentials.apiKey,
            persist,
        });
    };

    const clearCredentials = (): void => {
        if (typeof window === "undefined") return;

        saveCredentialEnvironmentsToStorage([], null);
        setShouldSave(false);
    };

    const togglePersistence = (persist: boolean): void => {
        setShouldSave(persist);
        if (typeof window === "undefined") return;

        const stored = loadCredentialEnvironmentsFromStorage();
        const activeEnvironment = getActiveEnvironment(stored);

        if (!activeEnvironment) return;

        const environments = upsertEnvironment(stored.environments, {
            ...activeEnvironment,
            persist,
        });

        saveCredentialEnvironmentsToStorage(environments, activeEnvironment.id);
    };

    const loadCredentials = (): LogCredentials | null => {
        const activeEnvironment = getActiveEnvironment(loadCredentialEnvironmentsFromStorage());

        if (!activeEnvironment) {
            return null;
        }

        return {
            applicationId: activeEnvironment.applicationId,
            apiKey: activeEnvironment.apiKey,
        };
    };

    return {
        shouldSave,
        setShouldSave,
        loadCredentialEnvironments: loadCredentialEnvironmentsFromStorage,
        loadCredentials,
        saveCredentialEnvironment,
        deleteCredentialEnvironment,
        saveCredentials,
        clearCredentials,
        togglePersistence,
    };
};
