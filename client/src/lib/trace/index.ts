/**
 * Trace Module Index
 *
 * Main entry point for the trace parsing system.
 * Re-exports all public APIs for clean imports.
 */

import type { LogRecord } from "@/types/logs";
import type { TraceLogInput } from "@/types/trace";

// Constants
export * from "./constants";

// Domain objects
export * from "./domain";

// Interpreters
export * from "./interpreters";

// Services
export * from "./services";

// Parser
export { TraceParser, parseTrace } from "./trace-parser";

/**
 * Converts LogRecord array to TraceLogInput array.
 * This bridges the log store format with the trace parser format.
 */
export function logsToTraceInput(logs: LogRecord[]): TraceLogInput[] {
    return logs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        policyId: log.policyId,
        correlationId: log.correlationId,
        clips: log.clips,
    }));
}
