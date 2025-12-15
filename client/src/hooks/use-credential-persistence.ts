import { useEffect, useState } from "react";
import { CREDENTIALS_STORAGE_KEY } from "@/constants/log-analyzer.constants";
import type { LogCredentials } from "@/types/logs";

/**
 * Structure for credentials stored in localStorage.
 */
interface StoredCredentials {
    applicationId: string;
    apiKey: string;
}

/**
 * Loads credentials from localStorage (outside component to avoid recreation).
 * @returns Stored credentials or null if not found/invalid
 */
const loadCredentialsFromStorage = (): StoredCredentials | null => {
    if (typeof window === "undefined") return null;

    const stored = window.localStorage.getItem(CREDENTIALS_STORAGE_KEY);
    if (!stored) return null;

    try {
        return JSON.parse(stored);
    } catch {
        window.localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
        return null;
    }
};

/**
 * Custom hook for managing Application Insights credential persistence in localStorage.
 * Provides methods to load, save, and clear credentials, along with a toggle for persistence preference.
 * @returns Object containing persistence state and management functions
 */
export const useCredentialPersistence = () => {
    const [shouldSave, setShouldSave] = useState(false);

    /**
     * Saves credentials to localStorage if shouldSave is true and credentials are valid.
     * Removes credentials from storage if shouldSave is false.
     * @param credentials - Credentials to persist
     */
    const saveCredentials = (credentials: LogCredentials): void => {
        if (typeof window === "undefined") return;

        if (shouldSave && credentials.applicationId && credentials.apiKey) {
            window.localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
        } else {
            window.localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
        }
    };

    /**
     * Removes stored credentials from localStorage.
     */
    const clearCredentials = (): void => {
        if (typeof window === "undefined") return;
        window.localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
    };

    useEffect(() => {
        const stored = loadCredentialsFromStorage();
        if (stored) {
            setShouldSave(true);
        }
    }, []);

    return {
        shouldSave,
        setShouldSave,
        loadCredentials: loadCredentialsFromStorage,
        saveCredentials,
        clearCredentials,
    };
};
