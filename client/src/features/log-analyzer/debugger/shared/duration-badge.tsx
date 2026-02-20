import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ClockIcon } from "@phosphor-icons/react";
import type React from "react";

// ============================================================================
// Duration Badge
// ============================================================================

/**
 * Formats milliseconds into a human-readable duration string.
 *
 * - `< 1 000 ms` → e.g. `42ms`
 * - `< 60 000 ms` → e.g. `3.1s`
 * - `≥ 60 000 ms` → e.g. `1.5m`
 */
function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Duration badge with warning colours for slow steps.
 *
 * Merged from `trace-timeline.tsx` (primary, 3-tier: >15 s error, >5 s warning,
 * default muted) and `step-panel.tsx` (3-tier: >500 ms red, >100 ms amber,
 * <100 ms green). The trace-timeline version is kept because it targets the
 * journey-overview level where second-scale thresholds are appropriate.
 *
 * Thresholds:
 * - `> 15 000 ms` → red (error)
 * - `> 5 000 ms`  → amber (warning)
 * - default       → muted / neutral
 */
export const DurationBadge: React.FC<{ durationMs?: number }> = ({ durationMs }) => {
    if (durationMs === undefined) return null;

    const isWarning = durationMs > 5000;
    const isError = durationMs > 15000;

    return (
        <Badge
            variant="outline"
            className={cn(
                "text-xs font-mono gap-1",
                isError && "text-red-600 border-red-400 dark:text-red-400 dark:border-red-600",
                isWarning && !isError && "text-amber-600 border-amber-400 dark:text-amber-400 dark:border-amber-600",
                !isWarning && "text-muted-foreground border-border",
            )}
        >
            <ClockIcon className="w-3 h-3" />
            {formatDuration(durationMs)}
        </Badge>
    );
};
