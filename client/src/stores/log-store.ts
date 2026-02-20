import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { FetchLogsArgs, LogRecord, LogStore, LogStoreActions, LogStoreState } from "@/types/logs";
import { LOG_LIMITS, APP_INSIGHTS_CONFIG } from "@/constants/log-analyzer.constants";
import { getLogsForFlow } from "@/lib/trace";
import { TraceActions, TraceState, initialTraceState } from "@/features/log-analyzer/model/trace-state";
import { runTwoPhaseLogFetchOrchestration } from "@/features/log-analyzer/services/log-fetch-orchestration-service";
import {
    resolveSelectionFromFlow,
    resolveSelectionFromLog,
} from "@/features/log-analyzer/services/log-selection-service";
import { generateTraceStateFromLogs } from "@/features/log-analyzer/services/trace-bootstrap-service";

let pendingComputeId: symbol | null = null;

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
                    const { logs, userFlows } = get();
                    const { selectedFlow, tracePatch } = resolveSelectionFromLog(log, logs, userFlows);

                    if (tracePatch) {
                        if (selectedFlow) {
                            set({ selectedFlow, ...tracePatch });
                        } else {
                            set(tracePatch);
                        }
                    }
                },
                reset: () => set({ ...initialState }),
                fetchLogs: async ({ applicationId, apiKey, maxRows, timespan }: FetchLogsArgs) => {
                    const { searchText } = get();

                    set({
                        isLoading: true,
                        error: null,
                        // Clear trace state when fetching new logs
                        ...initialTraceState,
                        searchText, // Preserve search text
                    });

                    try {
                        const { processed, selectedFlow, selectedLog, userFlows, effectiveMaxRows } = await runTwoPhaseLogFetchOrchestration({
                            args: {
                                applicationId,
                                apiKey,
                                maxRows,
                                timespan,
                            },
                            searchText,
                        });

                        set({
                            credentials: { applicationId, apiKey },
                            preferences: { maxRows: effectiveMaxRows, timespan },
                            logs: processed,
                            selectedLog,
                            lastUpdated: new Date(),
                            userFlows,
                            selectedFlow,
                        });

                        // Auto-generate trace for the first flow
                        if (selectedFlow && processed.length > 0) {
                            const flowLogs = getLogsForFlow(processed, selectedFlow.id, userFlows);
                            const traceState = generateTraceStateFromLogs(flowLogs);
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

                    const traceState = generateTraceStateFromLogs(targetLogs);
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
                        pendingComputeId = null;
                        set({
                            ...initialTraceState,
                            userFlows,
                            searchText,
                            selectedFlow: null,
                            selectedLog: null,
                            traceLoading: false,
                        });
                        return;
                    }

                    const flowLogs = getLogsForFlow(logs, flow.id, userFlows);

                    pendingComputeId = Symbol();
                    const computeId = pendingComputeId;

                    // Phase 1 — instant: visual state + loading flag (keep stale trace for smooth transition)
                    set({
                        selectedFlow: flow,
                        selectedLog: flowLogs[0] ?? null,
                        traceLoading: true,
                    });

                    // Phase 2 — deferred: heavy trace computation
                    setTimeout(() => {
                        if (pendingComputeId !== computeId) return; // stale — cancelled
                        const traceState = generateTraceStateFromLogs(flowLogs);
                        set({ ...traceState, traceLoading: false });
                    }, 0);
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
