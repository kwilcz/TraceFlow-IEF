import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { AppInsightsProcessor } from "@/lib/app-insights-processor";
import { applicationInsightsClient } from "@/lib/api/application-insights-client";
import { FetchLogsArgs, LogRecord, LogStore, LogStoreActions, LogStoreState } from "@/types/logs";
import { LOG_LIMITS, APP_INSIGHTS_CONFIG } from "@/constants/log-analyzer.constants";
import { clampRowCount } from "@/lib/validators/log-validators";
import { parseTrace, logsToTraceInput, groupLogsIntoFlows, getLogsForFlow } from "@/lib/trace";
import { TraceStep, TraceExecutionMap, UserFlow } from "@/types/trace";

/**
 * Extended state for trace mode functionality.
 */
interface TraceState {
    /** Linear array of trace steps parsed from logs */
    traceSteps: TraceStep[];
    /** Map of node IDs to their execution status */
    executionMap: TraceExecutionMap;
    /** The currently highlighted step index */
    activeStepIndex: number | null;
    /** Whether trace mode visualization is active */
    isTraceModeActive: boolean;
    /** The main journey ID from the trace */
    mainJourneyId: string;
    /** The correlation ID being traced */
    correlationId: string;
    /** Final statebag state from the trace */
    finalStatebag: Record<string, string>;
    /** Final claims state from the trace */
    finalClaims: Record<string, string>;
    /** Any errors from trace parsing */
    traceErrors: string[];
    /** User flows grouped from logs */
    userFlows: UserFlow[];
    /** Currently selected flow */
    selectedFlow: UserFlow | null;
    /** Search text used for querying logs */
    searchText: string;
}

/**
 * Actions for trace mode functionality.
 */
interface TraceActions {
    /** Generate trace from current logs */
    generateTrace: () => void;
    /** Set the active (highlighted) step */
    setActiveStep: (index: number | null) => void;
    /** Toggle trace mode on/off */
    toggleTraceMode: (active: boolean) => void;
    /** Navigate to previous step */
    previousStep: () => void;
    /** Navigate to next step */
    nextStep: () => void;
    /** Clear trace data */
    clearTrace: () => void;
    /** Select a flow and generate its trace */
    selectFlow: (flow: UserFlow | null) => void;
    /** Set search text for querying */
    setSearchText: (text: string) => void;
    /** Set selected log without regenerating trace (for tree sync) */
    setSelectedLogOnly: (log: LogRecord | null) => void;
}

const initialTraceState: TraceState = {
    traceSteps: [],
    executionMap: {},
    activeStepIndex: null,
    isTraceModeActive: false,
    mainJourneyId: "",
    correlationId: "",
    finalStatebag: {},
    finalClaims: {},
    traceErrors: [],
    userFlows: [],
    selectedFlow: null,
    searchText: "",
};

const initialState: Omit<LogStore, keyof LogStoreActions> & TraceState = {
    credentials: {
        applicationId: "",
        apiKey: "",
    },
    preferences: {
        maxRows: LOG_LIMITS.DEFAULT_ROWS,
        timespan: APP_INSIGHTS_CONFIG.DEFAULT_TIMESPAN,
    },
    logs: [],
    selectedLog: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
    ...initialTraceState,
};

export type ExtendedLogStore = LogStore & TraceState & TraceActions;

/**
 * Helper function to generate trace from logs.
 */
function generateTraceFromLogs(logs: LogRecord[]): Partial<TraceState> {
    if (logs.length === 0) {
        return {
            ...initialTraceState,
            traceErrors: ["No logs available to generate trace"],
        };
    }

    const traceInput = logsToTraceInput(logs);
    const result = parseTrace(traceInput);
    const correlationId = logs[0]?.correlationId ?? "";

    return {
        traceSteps: result.traceSteps,
        executionMap: result.executionMap,
        mainJourneyId: result.mainJourneyId,
        correlationId,
        finalStatebag: result.finalStatebag,
        finalClaims: result.finalClaims,
        traceErrors: result.errors,
        activeStepIndex: result.traceSteps.length > 0 ? 0 : null,
        isTraceModeActive: result.traceSteps.length > 0,
    };
}

export const useLogStore = create<ExtendedLogStore>()(
    devtools(
        subscribeWithSelector(
            (set, get): ExtendedLogStore => ({
                ...initialState,
                setCredentials: (credentials) =>
                    set((state) => ({
                        credentials: { ...state.credentials, ...credentials },
                    })),
                setPreferences: (preferences) =>
                    set((state) => ({
                        preferences: { ...state.preferences, ...preferences },
                    })),
                setSelectedLog: (log) => {
                    set({ selectedLog: log });
                    // Auto-generate trace when log is selected - find the flow it belongs to
                    const { logs, userFlows } = get();
                    if (log && logs.length > 0) {
                        // Find the flow this log belongs to
                        const matchingFlow = userFlows.find(f => f.logIds.includes(log.id));
                        if (matchingFlow) {
                            // Pass precomputed flows to avoid O(n²) re-analysis
                            const flowLogs = getLogsForFlow(logs, matchingFlow.id, userFlows);
                            const traceState = generateTraceFromLogs(flowLogs);
                            set({ selectedFlow: matchingFlow, ...traceState });
                        } else {
                            // Fallback: filter logs by correlationId
                            const relatedLogs = logs.filter(
                                (l) => l.correlationId === log.correlationId
                            );
                            const traceState = generateTraceFromLogs(relatedLogs);
                            set(traceState);
                        }
                    }
                },
                reset: () => set({ ...initialState }),
                fetchLogs: async ({ applicationId, apiKey, maxRows, timespan }: FetchLogsArgs) => {
                    const safeMaxRows = clampRowCount(maxRows, LOG_LIMITS.MIN_ROWS, LOG_LIMITS.MAX_ROWS);
                    const normalizedPolicies: string[] = [];
                    const { searchText } = get();

                    set({
                        isLoading: true,
                        error: null,
                        // Clear trace state when fetching new logs
                        ...initialTraceState,
                        searchText, // Preserve search text
                    });

                    try {
                        let processed: LogRecord[];
                        
                        // Two-phase query to ensure complete flows:
                        // Phase 1: Query to get initial logs and correlationIds
                        const initialResponse = await applicationInsightsClient.query({
                            applicationId,
                            apiKey,
                            maxRows: safeMaxRows,
                            timespan,
                            policyIds: normalizedPolicies,
                            searchText: searchText.trim() || undefined,
                        });
                        
                        const initialTable = applicationInsightsClient.extractPrimaryTable(initialResponse);
                        const initialResults = AppInsightsProcessor.process(initialTable);
                        
                        // Extract unique correlationIds from initial results
                        const correlationIds = Array.from(new Set(initialResults.map(l => l.correlationId)));
                        
                        if (correlationIds.length === 0) {
                            processed = [];
                        } else {
                            // Phase 2: Fetch complete flows for all correlationIds
                            // This ensures we have ALL log entries for each flow, not just partial data
                            const flowsResponse = await applicationInsightsClient.fetchCompleteFlows({
                                applicationId,
                                apiKey,
                                timespan,
                                correlationIds,
                            });
                            
                            const flowsTable = applicationInsightsClient.extractPrimaryTable(flowsResponse);
                            processed = AppInsightsProcessor.process(flowsTable);
                        }

                        // Group logs into flows
                        const userFlows = groupLogsIntoFlows(processed);
                        const selectedFlow = userFlows[0] ?? null;
                        const selectedLog = processed[0] ?? null;

                        set({
                            credentials: { applicationId, apiKey },
                            preferences: { maxRows: safeMaxRows, timespan },
                            logs: processed,
                            selectedLog,
                            lastUpdated: new Date(),
                            userFlows,
                            selectedFlow,
                        });

                        // Auto-generate trace for the first flow
                        if (selectedFlow && processed.length > 0) {
                            // Pass precomputed flows to avoid O(n²) re-analysis
                            const flowLogs = getLogsForFlow(processed, selectedFlow.id, userFlows);
                            const traceState = generateTraceFromLogs(flowLogs);
                            set(traceState);
                        }
                    } catch (error) {
                        const message = error instanceof Error ? error.message : "Unable to fetch logs";
                        set({ error: message });
                    } finally {
                        set({ isLoading: false });
                    }
                },

                // Trace mode actions
                generateTrace: () => {
                    const { logs, selectedLog } = get();
                    
                    if (logs.length === 0) {
                        set({ traceErrors: ["No logs available to generate trace"] });
                        return;
                    }

                    // Filter logs by selected log's correlationId if available
                    const targetLogs = selectedLog
                        ? logs.filter((l) => l.correlationId === selectedLog.correlationId)
                        : logs;

                    const traceState = generateTraceFromLogs(targetLogs);
                    set(traceState);
                },

                setActiveStep: (index) => {
                    const { traceSteps } = get();
                    
                    if (index === null) {
                        set({ activeStepIndex: null });
                        return;
                    }

                    // Clamp index to valid range
                    const validIndex = Math.max(0, Math.min(index, traceSteps.length - 1));
                    set({ activeStepIndex: validIndex });
                },

                toggleTraceMode: (active) => {
                    set({ isTraceModeActive: active });
                    
                    // If turning off trace mode, clear active step
                    if (!active) {
                        set({ activeStepIndex: null });
                    }
                },

                previousStep: () => {
                    const { activeStepIndex } = get();
                    
                    if (activeStepIndex === null || activeStepIndex <= 0) {
                        return;
                    }

                    set({ activeStepIndex: activeStepIndex - 1 });
                },

                nextStep: () => {
                    const { activeStepIndex, traceSteps } = get();
                    
                    if (activeStepIndex === null || activeStepIndex >= traceSteps.length - 1) {
                        return;
                    }

                    set({ activeStepIndex: activeStepIndex + 1 });
                },

                clearTrace: () => {
                    set({ ...initialTraceState });
                },

                selectFlow: (flow) => {
                    const { logs, userFlows, searchText } = get();
                    
                    if (!flow) {
                        set({ 
                            ...initialTraceState,
                            // Preserve these values
                            userFlows,
                            searchText,
                            selectedLog: null,
                        });
                        return;
                    }

                    // Pass precomputed flows to avoid O(n²) re-analysis
                    const flowLogs = getLogsForFlow(logs, flow.id, userFlows);
                    const selectedLog = flowLogs[0] ?? null;
                    const traceState = generateTraceFromLogs(flowLogs);

                    set({
                        ...traceState,
                        selectedFlow: flow,
                        selectedLog,
                    });
                },

                setSearchText: (text) => {
                    set({ searchText: text });
                },

                setSelectedLogOnly: (log) => {
                    // Just set the selected log without regenerating trace
                    // Used when syncing from tree selection to log viewer
                    set({ selectedLog: log });
                },
            })
        ),
        { name: "LogStore" }
    )
);
