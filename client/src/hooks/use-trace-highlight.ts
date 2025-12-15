import { useMemo } from "react";
import { useLogStore } from "@/stores/log-store";
import { StepResult, NodeExecutionStatus } from "@/types/trace";

/**
 * Hook to get trace mode highlighting information for a node.
 */
export interface TraceHighlightInfo {
    /** Whether trace mode is currently active */
    isTraceModeActive: boolean;
    /** The execution status of this node, if any */
    executionStatus: NodeExecutionStatus | null;
    /** Whether this node is the currently active step */
    isActiveStep: boolean;
    /** Whether this node has been visited in the trace */
    isVisited: boolean;
    /** The last result for this node */
    lastResult: StepResult | null;
    /** Number of times this node was visited */
    visitCount: number;
}

/**
 * Hook to get trace highlighting information for a node.
 */
export function useTraceHighlight(nodeId: string): TraceHighlightInfo {
    const isTraceModeActive = useLogStore((state) => state.isTraceModeActive);
    const executionMap = useLogStore((state) => state.executionMap);
    const activeStepIndex = useLogStore((state) => state.activeStepIndex);
    const traceSteps = useLogStore((state) => state.traceSteps);

    return useMemo(() => {
        const executionStatus = executionMap[nodeId] ?? null;
        const isVisited = executionStatus !== null;

        // Check if this node is the active step
        const activeStep = activeStepIndex !== null ? traceSteps[activeStepIndex] : null;
        const isActiveStep = activeStep?.graphNodeId === nodeId;

        return {
            isTraceModeActive,
            executionStatus,
            isActiveStep,
            isVisited,
            lastResult: executionStatus?.status ?? null,
            visitCount: executionStatus?.visitCount ?? 0,
        };
    }, [isTraceModeActive, executionMap, activeStepIndex, traceSteps, nodeId]);
}

/**
 * Get CSS classes for trace mode highlighting.
 */
export function getTraceHighlightClasses(highlight: TraceHighlightInfo): string {
    if (!highlight.isTraceModeActive) {
        return "";
    }

    const classes: string[] = [];

    if (highlight.isActiveStep) {
        // Active step - strong highlight
        classes.push("ring-4 ring-blue-500 shadow-xl shadow-blue-500/30 scale-105 z-50");
    } else if (!highlight.isVisited) {
        // Unvisited nodes - gray out
        classes.push("opacity-30 grayscale");
    } else {
        // Visited nodes - status-based styling
        switch (highlight.lastResult) {
            case "Success":
                classes.push("ring-2 ring-green-500/70 shadow-green-500/20");
                break;
            case "Skipped":
                classes.push("opacity-60 border-dashed border-yellow-500/70");
                break;
            case "Error":
                classes.push("ring-2 ring-red-500 bg-red-500/10 shadow-red-500/20");
                break;
            case "PendingInput":
                classes.push("ring-2 ring-blue-400/70 shadow-blue-400/20");
                break;
            default:
                break;
        }
    }

    return classes.join(" ");
}

/**
 * Get a status indicator element for the trace mode.
 */
export function getTraceStatusIndicator(highlight: TraceHighlightInfo): {
    icon: "success" | "error" | "skipped" | "pending" | null;
    color: string;
    label: string;
} | null {
    if (!highlight.isTraceModeActive || !highlight.isVisited) {
        return null;
    }

    switch (highlight.lastResult) {
        case "Success":
            return { icon: "success", color: "green", label: "Success" };
        case "Error":
            return { icon: "error", color: "red", label: "Error" };
        case "Skipped":
            return { icon: "skipped", color: "yellow", label: "Skipped" };
        case "PendingInput":
            return { icon: "pending", color: "blue", label: "Pending Input" };
        default:
            return null;
    }
}
