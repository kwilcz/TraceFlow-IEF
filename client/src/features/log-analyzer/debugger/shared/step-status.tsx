import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TraceStep } from "@/types/trace";
import {
    CheckCircleIcon,
    ClockIcon,
    SkipForwardCircleIcon,
    XCircleIcon,
} from "@phosphor-icons/react";
import type React from "react";

// ============================================================================
// StepStatusIcon
// ============================================================================

/** Icon sizes available for status indicators. */
type IconSize = "sm" | "md" | "lg";

const sizeClasses: Record<IconSize, string> = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
};

/**
 * Renders a colored status icon for the given step result.
 *
 * Merged from `trace-timeline.tsx` (primary) — the `step-panel.tsx` version
 * did not include an icon component, only a badge.
 */
export const StepStatusIcon: React.FC<{
    result: TraceStep["result"];
    size?: IconSize;
}> = ({ result, size = "md" }) => {
    const cls = sizeClasses[size];

    switch (result) {
        case "Success":
            return <CheckCircleIcon className={cn(cls, "text-emerald-600 dark:text-emerald-400")} />;
        case "Error":
            return <XCircleIcon className={cn(cls, "text-red-600 dark:text-red-400")} />;
        case "Skipped":
            return <SkipForwardCircleIcon className={cn(cls, "text-amber-600 dark:text-amber-400")} />;
        case "PendingInput":
            return <ClockIcon className={cn(cls, "text-blue-600 dark:text-blue-400")} />;
        default:
            return <ClockIcon className={cn(cls, "text-muted-foreground")} />;
    }
};

// ============================================================================
// StepStatusBadge
// ============================================================================

/**
 * Color mapping per result — covers all four `StepResult` variants.
 *
 * Merged from `trace-timeline.tsx` (primary, 4 variants with icon) and
 * `step-panel.tsx` (2 variants, text-only). The trace-timeline version is
 * chosen because it handles all result types and embeds `StepStatusIcon`.
 */
const badgeVariants: Record<TraceStep["result"], string> = {
    Success:
        "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
    Error: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
    Skipped:
        "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
    PendingInput:
        "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700",
};

/**
 * Pill-style badge showing a colored icon + label for a step result.
 */
export const StepStatusBadge: React.FC<{ result: TraceStep["result"] }> = ({ result }) => (
    <Badge variant="outline" className={cn("text-xs gap-1", badgeVariants[result])}>
        <StepStatusIcon result={result} size="sm" />
        {result}
    </Badge>
);
