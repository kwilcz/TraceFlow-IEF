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
import { generateTraceStateFromLogs, enrichUserFlow } from "@/features/log-analyzer/services/trace-bootstrap-service";
import { analyzeAllFlows, type FlowAnalysisCache } from "@/features/log-analyzer/services/background-flow-enrichment-service";

let pendingComputeId: symbol | null = null;
/** Module-level trace cache — stores full parse results per flow for instant switching. */
let traceCache = new Map<string, FlowAnalysisCache>();
/** AbortController for background analysis — cancelled on new fetchLogs/reset. */
let backgroundAbort: AbortController | null = null;

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
                reset: () => {
                    backgroundAbort?.abort();
                    backgroundAbort = null;
                    traceCache.clear();
                    pendingComputeId = null;
                    set({ ...initialState });
                },
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
                        // Cancel any previous background analysis
                        backgroundAbort?.abort();
                        traceCache.clear();

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

                        // Inline trace for selected flow (immediate UX)
                        let currentFlows = userFlows;
                        if (selectedFlow && processed.length > 0) {
                            try {
                                const flowLogs = getLogsForFlow(processed, selectedFlow.id, userFlows);
                                const traceState = generateTraceStateFromLogs(flowLogs);
                                const enrichedFlow = enrichUserFlow(selectedFlow, traceState);
                                currentFlows = userFlows.map(f => f.id === enrichedFlow.id ? enrichedFlow : f);
                                set({ ...traceState, selectedFlow: enrichedFlow, userFlows: currentFlows });

                                // Cache the selected flow's result
                                traceCache.set(selectedFlow.id, { traceState, enrichedFlow });
                            } catch (traceError) {
                                const message = traceError instanceof Error ? traceError.message : "Trace generation failed";
                                set({ traceErrors: [message] });
                            }
                        }

                        // Start background analysis for ALL flows (fire-and-forget)
                        backgroundAbort = new AbortController();
                        analyzeAllFlows(
                            processed,
                            userFlows,
                            traceCache,
                            (flowId, result) => {
                                // Progressive update: replace the enriched flow in the store
                                const state = get();
                                const updatedFlows = state.userFlows.map(f =>
                                    f.id === flowId ? result.enrichedFlow : f,
                                );
                                // Also update selectedFlow if it matches
                                const updatedSelected = state.selectedFlow?.id === flowId
                                    ? result.enrichedFlow
                                    : state.selectedFlow;
                                set({ userFlows: updatedFlows, selectedFlow: updatedSelected });
                            },
                            backgroundAbort.signal,
                        );
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
                    backgroundAbort?.abort();
                    backgroundAbort = null;
                    traceCache.clear();
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

                    // Check cache first — instant switch if available
                    const cached = traceCache.get(flow.id);
                    if (cached) {
                        pendingComputeId = null; // cancel any pending deferred compute
                        const flowLogs = getLogsForFlow(logs, flow.id, userFlows);
                        set({
                            ...cached.traceState,
                            selectedFlow: cached.enrichedFlow,
                            selectedLog: flowLogs[0] ?? null,
                            traceLoading: false,
                        });
                        return;
                    }

                    // Cache miss — fall back to deferred computation
                    const flowLogs = getLogsForFlow(logs, flow.id, userFlows);

                    pendingComputeId = Symbol();
                    const computeId = pendingComputeId;

                    // Phase 1 — instant: visual state + loading flag
                    set({
                        selectedFlow: flow,
                        selectedLog: flowLogs[0] ?? null,
                        traceLoading: true,
                    });

                    // Phase 2 — deferred: heavy trace computation
                    setTimeout(() => {
                        if (pendingComputeId !== computeId) return;
                        try {
                            const traceState = generateTraceStateFromLogs(flowLogs);
                            const enrichedFlow = enrichUserFlow(flow, traceState);
                            const { userFlows: currentFlows } = get();
                            const enrichedFlows = currentFlows.map(f => f.id === enrichedFlow.id ? enrichedFlow : f);

                            // Cache for future instant switching
                            traceCache.set(flow.id, { traceState, enrichedFlow });

                            set({ ...traceState, traceLoading: false, selectedFlow: enrichedFlow, userFlows: enrichedFlows });
                        } catch (error) {
                            const message = error instanceof Error ? error.message : "Trace computation failed";
                            set({
                                traceSteps: [],
                                executionMap: {},
                                activeStepIndex: null,
                                isTraceModeActive: false,
                                mainJourneyId: "",
                                correlationId: "",
                                finalStatebag: {},
                                finalClaims: {},
                                traceErrors: [message],
                                traceLoading: false,
                                sessions: [],
                            });
                        }
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
