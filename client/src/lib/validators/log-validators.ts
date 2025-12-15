import { GUID_REGEX, ISO_DURATION_REGEX } from "@/constants/log-analyzer.constants";

/**
 * Validates that a string is a valid GUID/UUID.
 * @param value - The string to validate
 * @returns True if the value is a valid GUID, false otherwise
 */
export const validateGuid = (value: string): boolean => {
    return GUID_REGEX.test(value.trim());
};

/**
 * Validates that a string is a valid ISO 8601 duration.
 * @param value - The string to validate (case-insensitive)
 * @returns True if the value is a valid ISO 8601 duration, false otherwise
 * @example validateIsoDuration("PT1H") // true
 * @example validateIsoDuration("P7D") // true
 */
export const validateIsoDuration = (value: string): boolean => {
    const normalized = value.toUpperCase();
    return ISO_DURATION_REGEX.test(normalized) && normalized.length > 1;
};

/**
 * Clamps a number between a minimum and maximum value.
 * Returns min if the value is not finite.
 * @param value - The number to clamp
 * @param min - The minimum allowed value
 * @param max - The maximum allowed value
 * @returns The clamped value
 */
export const clampRowCount = (value: number, min: number, max: number): number => {
    if (!Number.isFinite(value)) {
        return min;
    }
    return Math.min(Math.max(value, min), max);
};

/**
 * Sanitizes a policy ID for safe use in KQL queries.
 * Escapes single quotes and converts to lowercase.
 * @param policyId - The policy ID to sanitize
 * @returns The sanitized policy ID
 */
export const sanitizePolicyId = (policyId: string): string => {
    return (policyId ?? "").replace(/'/g, "''").toLowerCase();
};

/**
 * Normalizes an array of policy IDs by sanitizing and deduplicating.
 * @param policyIds - Array of policy IDs to normalize
 * @returns Deduplicated array of sanitized policy IDs
 */
export const normalizePolicyIds = (policyIds: string[]): string[] => {
    if (!Array.isArray(policyIds)) {
        return [];
    }
    
    return Array.from(
        new Set(
            policyIds
                .map((id) => sanitizePolicyId(id))
                .filter(Boolean)
        )
    );
};
