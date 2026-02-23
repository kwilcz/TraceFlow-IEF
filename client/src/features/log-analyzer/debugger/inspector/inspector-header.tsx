import { Badge } from "@/components/ui/badge";
import { getStatebagLabel, STATUS_CHIP_KEYS } from "@/lib/statebag-labels";
import type { StepResult } from "@/types/trace";
import type React from "react";
import { DurationBadge, StepStatusBadge } from "../shared";

// ============================================================================
// Inspector Header
// ============================================================================

interface InspectorHeaderProps {
    /** Type icon (e.g. from TreeNodeIcon). */
    icon: React.ReactNode;
    /** Node display name (e.g. "Step 3 — AAD-UserRead..."). */
    name: string;
    /** Step result — drives the status badge colour. */
    result?: StepResult;
    /** Duration in milliseconds. */
    duration?: number;
    /** Full statebag snapshot for the selected step. */
    statebag: Record<string, string>;
}

/**
 * Sticky header bar + status chip row for the inspector panel.
 *
 * The top bar sticks on scroll and shows the node identity + result.
 * Below it, a row of `Badge` chips surfaces the most important statebag
 * values at a glance (see `STATUS_CHIP_KEYS`).
 */
export function InspectorHeader({ icon, name, result, duration, statebag }: InspectorHeaderProps) {
    return (
        <div>
            {/* ── Sticky identity bar (36 px) ────────────────────────── */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between gap-2 px-3 h-9">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 w-4 h-4">{icon}</span>
                    <span className="font-mono text-sm truncate" title={name}>
                        {name}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {result && <StepStatusBadge result={result} />}
                    <DurationBadge durationMs={duration} />
                </div>
            </div>

            {/* ── Status chips row ───────────────────────────────────── */}
            <StatusChips statebag={statebag} />
        </div>
    );
}

// ============================================================================
// Status Chips (internal)
// ============================================================================

/**
 * Renders a wrapped row of `Badge` chips for the high-signal statebag keys.
 *
 * Rules:
 * - Only keys present in `statebag` are shown.
 * - `REAUTH` is hidden when the value is falsy (`""`, `"false"`).
 * - `CI` (User Identity OID) is truncated to the first 8 characters.
 */
function StatusChips({ statebag }: { statebag: Record<string, string> }) {
    const chips = STATUS_CHIP_KEYS.filter((key) => {
        const value = statebag[key];
        if (value === undefined) return false;
        // REAUTH: only show when truthy
        if (key === "REAUTH" && (!value || value === "false")) return false;
        return true;
    });

    if (chips.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1.5 py-1.5 px-3">
            {chips.map((key) => {
                const raw = statebag[key];
                const display = key === "CI" && raw.length > 8 ? `${raw.slice(0, 8)}…` : raw;

                return (
                    <Badge key={key} variant="outline" className="text-xs font-mono">
                        {getStatebagLabel(key)}: {display}
                    </Badge>
                );
            })}
        </div>
    );
}
