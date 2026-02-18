import { useState } from "react";
import { CREDENTIALS_STORAGE_KEY, SESSION_CREDENTIALS_STORAGE_KEY } from "@/constants/log-analyzer.constants";
import type { LogCredentials } from "@/types/logs";

/**
 * Structure for credentials stored in browser storage.
 */
interface StoredCredentials {
    applicationId: string;
    apiKey: string;
}

/**
 * Parse a raw JSON string into StoredCredentials, returning null on failure.
 */
const parseStoredCredentials = (raw: string | null): StoredCredentials | null => {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.applicationId === "string" && typeof parsed.apiKey === "string") {
            return parsed;
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Loads credentials from storage (localStorage first, then sessionStorage).
 * Module-level function — safe to call outside React render.
 */
const loadCredentialsFromStorage = (): StoredCredentials | null => {
    if (typeof window === "undefined") return null;

    const local = parseStoredCredentials(window.localStorage.getItem(CREDENTIALS_STORAGE_KEY));
    if (local) return local;

    const session = parseStoredCredentials(window.sessionStorage.getItem(SESSION_CREDENTIALS_STORAGE_KEY));
    if (session) return session;

    return null;
};

/**
 * Checks whether valid credentials exist in localStorage (used for lazy state init).
 */
const hasLocalStorageCredentials = (): boolean => {
    if (typeof window === "undefined") return false;
    return parseStoredCredentials(window.localStorage.getItem(CREDENTIALS_STORAGE_KEY)) !== null;
};

/**
 * Hook for managing Application Insights credential persistence.
 *
 * Storage policy:
 * - Default: credentials stored in **sessionStorage** (tab-scoped).
 * - Opt-in: "Remember credentials" → **localStorage** (device-scoped).
 * - Toggle is authoritative: disabling clears localStorage immediately.
 * - On load: localStorage credentials preferred, then sessionStorage.
 */
export const useCredentialPersistence = () => {
    // Lazy initialiser — reads localStorage synchronously once, no useEffect needed.
    const [shouldSave, setShouldSave] = useState(hasLocalStorageCredentials);

    /**
     * Persists credentials according to the current persistence mode.
     * - persist=true  → localStorage (clears sessionStorage)
     * - persist=false → sessionStorage (clears localStorage)
     * - empty creds   → clears both
     */
    const saveCredentials = (credentials: LogCredentials, persistOverride?: boolean): void => {
        if (typeof window === "undefined") return;

        const persist = persistOverride ?? shouldSave;

        if (persist && credentials.applicationId && credentials.apiKey) {
            window.localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
            window.sessionStorage.removeItem(SESSION_CREDENTIALS_STORAGE_KEY);
        } else if (credentials.applicationId && credentials.apiKey) {
            window.sessionStorage.setItem(SESSION_CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
            window.localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
        } else {
            window.localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
            window.sessionStorage.removeItem(SESSION_CREDENTIALS_STORAGE_KEY);
        }
    };

    /**
     * Removes stored credentials from both localStorage and sessionStorage.
     */
    const clearCredentials = (): void => {
        if (typeof window === "undefined") return;
        window.localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
        window.sessionStorage.removeItem(SESSION_CREDENTIALS_STORAGE_KEY);
    };

    /**
     * Toggle is authoritative.
     * - Disabling clears localStorage immediately and migrates existing
     *   credentials to sessionStorage so they remain available for the tab.
     * - Enabling only flips the flag; actual save to localStorage happens on
     *   next form submission.
     */
    const togglePersistence = (persist: boolean): void => {
        setShouldSave(persist);
        if (typeof window === "undefined") return;

        if (!persist) {
            const existing = parseStoredCredentials(window.localStorage.getItem(CREDENTIALS_STORAGE_KEY));
            window.localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
            // Migrate to session so credentials aren't lost for the current tab
            if (existing?.applicationId && existing?.apiKey) {
                window.sessionStorage.setItem(SESSION_CREDENTIALS_STORAGE_KEY, JSON.stringify(existing));
            }
        }
    };

    return {
        shouldSave,
        setShouldSave,
        loadCredentials: loadCredentialsFromStorage,
        saveCredentials,
        clearCredentials,
        togglePersistence,
    };
};
