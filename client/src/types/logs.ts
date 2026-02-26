import type { Clip, ClipsArray, ParsedJourney } from "./journey-recorder";

/**
 * Application Insights API credentials.
 */
export interface LogCredentials {
    /** Application Insights Application ID (GUID) */
    applicationId: string;
    /** API Key for authentication */
    apiKey: string;
}

/**
 * User preferences for log queries.
 */
export interface LogPreferences {
    /** Maximum number of rows to fetch */
    maxRows: number;
    /** ISO 8601 duration for query timespan */
    timespan: string;
}

/**
 * Custom dimensions from Application Insights logs.
 */
export interface CustomDimensions {
    /** Correlation ID as GUID */
    correlationId: string;
    /** Event name */
    eventName: string;
    /** Tenant identifier */
    tenant: string;
    /** Policy identifier (policyId) */
    userJourney: string;
    /** Version information */
    version: string;
}

/**
 * Raw log row as received from Application Insights API.
 * Represents a single trace entry before aggregation.
 */
export interface RawLogRow {
    id: string;
    timestamp: string;
    message: string;
    traceMessage: string;
    cloudRoleInstance: string;
    customDimensions: CustomDimensions;
    operationId: string;
    operationName: string;
}

/**
 * Aggregated log row combining multiple continuation entries.
 * Used during processing to merge multi-part messages.
 */
export interface AggregatedLogRow {
    /** Combined ID from all parts */
    compositeId: string;
    /** Array of original IDs that were merged */
    idParts: string[];
    timestamp: string;
    cloudRoleInstance: string;
    /** Concatenated message from all parts */
    concatenatedMessage: string;
    customDimensions: CustomDimensions;
}

/**
 * Final processed log record ready for display.
 * Includes parsed JSON payload and extracted metadata.
 */
export interface LogRecord {
    /** Unique identifier (composite if aggregated) */
    id: string;
    /** Parsed timestamp as Date object */
    timestamp: Date;
    /** Azure AD B2C Policy ID */
    policyId: string;
    /** Correlation ID for tracking user journey */
    correlationId: string;
    /** Cloud role instance identifier */
    cloudRoleInstance: string;
    /** Original IDs before aggregation */
    rawIds: string[];
    /** Raw message text */
    payloadText: string;
    /** Parsed JSON payload (or original if parsing failed) */
    parsedPayload: unknown;
    /** Parsed clips array from the trace message */
    clips: ClipsArray;
    /** Custom dimensions from Application Insights */
    customDimensions: CustomDimensions;
}

/**
 * Re-export journey recorder types for convenience.
 */
export type { Clip, ClipsArray, ParsedJourney } from "./journey-recorder";
export type {
    Statebag,
    StatebagEntry,
    ParsedStatebag,
    OrchestrationStep,
    JourneyState,
    HandlerExecution,
    StateMachine,
} from "./journey-recorder";

/**
 * Re-export trace types for convenience.
 */
export type {
    StepResult,
    TraceExecutionMap,
    TraceLogInput,
    TraceParseResult,
    ClaimsDiff,
} from "./trace";

/**
 * Arguments for fetching logs from Application Insights.
 */
export interface FetchLogsArgs {
    applicationId: string;
    apiKey: string;
    maxRows: number;
    timespan: string;
    /** Optional policy IDs to filter results */
    policyIds?: string[];
}

/**
 * State portion of the log store.
 */
export interface LogStoreState {
    credentials: LogCredentials;
    preferences: LogPreferences;
    logs: LogRecord[];
    selectedLog: LogRecord | null;
    isLoading: boolean;
    error: string | null;
    lastUpdated: Date | null;
}

/**
 * Actions available on the log store.
 */
export interface LogStoreActions {
    setCredentials: (credentials: Partial<LogCredentials>) => void;
    setPreferences: (preferences: Partial<LogPreferences>) => void;
    setSelectedLog: (log: LogRecord | null) => void;
    fetchLogs: (args: FetchLogsArgs) => Promise<void>;
    reset: () => void;
}

/**
 * Complete log store type combining state and actions.
 */
export type LogStore = LogStoreState & LogStoreActions;
