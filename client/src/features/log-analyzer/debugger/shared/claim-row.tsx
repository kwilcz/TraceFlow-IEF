import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "@phosphor-icons/react";
import type React from "react";
import { CopyButton } from "./copy-button";

// ============================================================================
// Claim Row
// ============================================================================

/**
 * A single claim / statebag row with optional diff highlighting.
 *
 * Merged from two sources:
 * - `trace-timeline.tsx` (~line 1048) — left-border accent, uppercase diff
 *   badge, arrow icon for modified values, integrated `CopyButton`.
 * - `step-panel.tsx` — simpler layout with background colours and
 *   `DetailsPanel.CopyButton`.
 *
 * The trace-timeline version is chosen as the primary because it provides
 * richer visual feedback (border accent + badge + arrow transition).
 */
export const ClaimRow: React.FC<{
    name: string;
    value: string;
    diffType?: "added" | "modified" | "removed";
    oldValue?: string;
}> = ({ name, value, diffType, oldValue }) => (
    <div
        className={cn(
            "flex items-start justify-between gap-2 p-2.5 rounded-md text-sm border",
            "bg-surface",
            diffType === "added" && "border-l-2 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
            diffType === "modified" && "border-l-2 border-l-amber-500 bg-amber-50 dark:bg-amber-900/20",
            diffType === "removed" && "border-l-2 border-l-red-500 bg-red-50 dark:bg-red-900/20 opacity-60",
        )}
    >
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground">{name}</span>
                {diffType && (
                    <Badge
                        variant="outline"
                        className={cn(
                            "text-[10px]",
                            diffType === "added" && "text-emerald-700 border-emerald-500 dark:text-emerald-400",
                            diffType === "modified" && "text-amber-700 border-amber-500 dark:text-amber-400",
                            diffType === "removed" && "text-red-700 border-red-500 dark:text-red-400",
                        )}
                    >
                        {diffType.toUpperCase()}
                    </Badge>
                )}
            </div>
            {diffType === "modified" && oldValue && (
                <div className="flex items-center gap-1 mt-1 text-xs">
                    <span className="text-red-600 dark:text-red-400 line-through font-mono truncate">{oldValue}</span>
                    <ArrowRightIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                </div>
            )}
            <div
                className={cn(
                    "font-mono text-xs break-all mt-1",
                    diffType === "removed" ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
                )}
            >
                {value}
            </div>
        </div>
        <CopyButton value={value} label={name} />
    </div>
);
