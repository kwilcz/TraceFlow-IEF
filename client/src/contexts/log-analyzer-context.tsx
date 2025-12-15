"use client";

import React, { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLogStore, type ExtendedLogStore } from "@/stores/log-store";
import type { LogRecord } from "@/types/logs";
import type { UserFlow } from "@/types/trace";
import { getLogsForFlow } from "@/lib/trace";

/**
 * Context value shape for LogAnalyzer compound component.
 * Provides access to logs, flows, selection state, and loading/error states.
 */
interface LogAnalyzerContextValue {
    logs: LogRecord[];
    selectedLog: LogRecord | null;
    setSelectedLog: (log: LogRecord | null) => void;
    isLoading: boolean;
    error: string | null;
    lastUpdated: Date | null;
    /** User flows grouped from logs */
    userFlows: UserFlow[];
    /** Currently selected flow */
    selectedFlow: UserFlow | null;
    /** Select a flow and generate its trace */
    selectFlow: (flow: UserFlow | null) => void;
    /** Search text for querying */
    searchText: string;
    /** Set search text */
    setSearchText: (text: string) => void;
    /** Logs belonging to the currently selected flow */
    flowLogs: LogRecord[];
}

const LogAnalyzerContext = createContext<LogAnalyzerContextValue | null>(null);

/**
 * Hook to access LogAnalyzer context.
 * Must be used within LogAnalyzerProvider.
 * @returns LogAnalyzer context value
 * @throws Error if used outside of LogAnalyzerProvider
 */
export const useLogAnalyzerContext = (): LogAnalyzerContextValue => {
    const context = useContext(LogAnalyzerContext);
    if (!context) {
        throw new Error("LogAnalyzer compound components must be used within <LogAnalyzer>");
    }
    return context;
};

/**
 * Props for LogAnalyzerProvider component.
 */
interface LogAnalyzerProviderProps {
    children: ReactNode;
}

/**
 * Provider component that supplies log state to all LogAnalyzer child components.
 * Wraps children in a context provider and memoizes the context value.
 */
export const LogAnalyzerProvider = ({ children }: LogAnalyzerProviderProps) => {
    const logs = useLogStore((state: ExtendedLogStore) => state.logs);
    const selectedLog = useLogStore((state: ExtendedLogStore) => state.selectedLog);
    const setSelectedLog = useLogStore((state: ExtendedLogStore) => state.setSelectedLog);
    const isLoading = useLogStore((state: ExtendedLogStore) => state.isLoading);
    const error = useLogStore((state: ExtendedLogStore) => state.error);
    const lastUpdated = useLogStore((state: ExtendedLogStore) => state.lastUpdated);
    const userFlows = useLogStore((state: ExtendedLogStore) => state.userFlows);
    const selectedFlow = useLogStore((state: ExtendedLogStore) => state.selectedFlow);
    const selectFlow = useLogStore((state: ExtendedLogStore) => state.selectFlow);
    const searchText = useLogStore((state: ExtendedLogStore) => state.searchText);
    const setSearchText = useLogStore((state: ExtendedLogStore) => state.setSearchText);

    // Compute logs for the selected flow, sorted from oldest to newest
    const flowLogs = useMemo(() => {
        if (!selectedFlow || logs.length === 0) return [];
        const unsorted = getLogsForFlow(logs, selectedFlow.id);
        return unsorted.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }, [logs, selectedFlow]);

    const value = useMemo<LogAnalyzerContextValue>(
        () => ({ 
            logs, 
            selectedLog, 
            setSelectedLog, 
            isLoading, 
            error, 
            lastUpdated,
            userFlows,
            selectedFlow,
            selectFlow,
            searchText,
            setSearchText,
            flowLogs,
        }),
        [logs, selectedLog, setSelectedLog, isLoading, error, lastUpdated, userFlows, selectedFlow, selectFlow, searchText, setSearchText, flowLogs]
    );

    return <LogAnalyzerContext.Provider value={value}>{children}</LogAnalyzerContext.Provider>;
};
