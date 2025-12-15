"use client";

import React, { type ReactNode } from "react";
import { LogAnalyzerProvider } from "@/contexts/log-analyzer-context";
import { LogCredentialsForm } from "./credentials-form";
import { LogTableResults } from "./results-table";
import { LogDetailViewer } from "./detail-viewer";
import { TraceTimeline } from "./trace-timeline";
import { StatebagInspector } from "./statebag-inspector";

/**
 * Props for the LogAnalyzer root component.
 */
interface LogAnalyzerProps {
    children: ReactNode;
}

/**
 * Composition interface for LogAnalyzer compound component.
 * Provides dot notation access to child components.
 */
interface LogAnalyzerComposition {
    /** Context provider for state sharing */
    Provider: typeof LogAnalyzerProvider;
    /** Credentials form for Application Insights authentication */
    Settings: typeof LogCredentialsForm;
    /** Table displaying log results with filtering */
    Table: typeof LogTableResults;
    /** Detail viewer for JSON payload inspection */
    Viewer: typeof LogDetailViewer;
    /** Trace timeline for visualizing user journey execution */
    TraceTimeline: typeof TraceTimeline;
    /** Statebag inspector for "Time Travel" debugging */
    StatebagInspector: typeof StatebagInspector;
}

/**
 * Root wrapper component that provides context to all children.
 */
const LogAnalyzerRoot = ({ children }: LogAnalyzerProps) => {
    return <LogAnalyzerProvider>{children}</LogAnalyzerProvider>;
};

/**
 * Compound component for analyzing Application Insights logs.
 * Provides a composable API with dot notation for accessing child components.
 * @example
 * <LogAnalyzer>
 *   <LogAnalyzer.Settings />
 *   <LogAnalyzer.TraceTimeline />
 *   <LogAnalyzer.StatebagInspector />
 *   <LogAnalyzer.Table />
 *   <LogAnalyzer.Viewer />
 * </LogAnalyzer>
 */
export const LogAnalyzer = LogAnalyzerRoot as typeof LogAnalyzerRoot & LogAnalyzerComposition;

LogAnalyzer.Provider = LogAnalyzerProvider;
LogAnalyzer.Settings = LogCredentialsForm;
LogAnalyzer.Table = LogTableResults;
LogAnalyzer.Viewer = LogDetailViewer;
LogAnalyzer.TraceTimeline = TraceTimeline;
LogAnalyzer.StatebagInspector = StatebagInspector;
