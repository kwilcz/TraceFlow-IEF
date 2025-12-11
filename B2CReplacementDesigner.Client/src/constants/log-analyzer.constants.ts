/**
 * Regular expression to validate GUID/UUID format.
 * Matches RFC 4122 compliant UUIDs (versions 1-5).
 */
export const GUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

/**
 * Regular expression to validate ISO 8601 duration format.
 * Examples: PT1H (1 hour), P1D (1 day), P7D (7 days), PT2H30M (2 hours 30 minutes).
 */
export const ISO_DURATION_REGEX = /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?$/i;

/**
 * LocalStorage key for persisting Application Insights credentials.
 */
export const CREDENTIALS_STORAGE_KEY = "designer:analyzeLogsCredentials";

/**
 * Predefined timespan options for Application Insights queries.
 * Each option represents a lookback period in ISO 8601 duration format.
 */
export const TIMESPAN_OPTIONS = [
    { label: "Last 60 Minutes", value: "PT1H" },
    { label: "Last 6 Hours", value: "PT6H" },
    { label: "Last 24 Hours", value: "P1D" },
    { label: "Last 7 Days", value: "P7D" },
    { label: "Custom (ISO 8601)", value: "custom" },
] as const;

/**
 * Constraints for log query result set sizes.
 */
export const LOG_LIMITS = {
    /** Minimum number of rows that can be requested */
    MIN_ROWS: 1,
    /** Maximum number of rows that can be requested */
    MAX_ROWS: 500,
    /** Default number of rows when not specified */
    DEFAULT_ROWS: 50,
} as const;

/**
 * Application Insights API configuration.
 */
export const APP_INSIGHTS_CONFIG = {
    /** Base URL for Application Insights REST API */
    BASE_URL: "https://api.applicationinsights.io/v1",
    /** Default timespan for queries (24 hours) */
    DEFAULT_TIMESPAN: "P1D",
    /** Event name prefix to filter Journey Recorder traces */
    EVENT_NAME_PREFIX: "Journey Recorder",
} as const;
