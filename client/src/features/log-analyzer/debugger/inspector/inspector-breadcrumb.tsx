import { cn } from "@/lib/utils";
import type React from "react";

// ============================================================================
// Inspector Breadcrumb
// ============================================================================

interface BreadcrumbSegment {
    label: string;
    /** When undefined the segment is non-clickable (current / final). */
    onClick?: () => void;
}

interface InspectorBreadcrumbProps {
    segments: BreadcrumbSegment[];
}

/**
 * Clickable breadcrumb trail rendered above the inspector content.
 *
 * Segments are joined by ` → ` separators. Clickable segments show an
 * underline on hover; the final segment is rendered in `font-medium`.
 */
export function InspectorBreadcrumb({ segments }: InspectorBreadcrumbProps) {
    if (segments.length === 0) return null;

    return (
        <nav className="text-xs text-muted-foreground flex items-center flex-wrap gap-x-1">
            {segments.map((segment, idx) => {
                const isLast = idx === segments.length - 1;

                return (
                    <span key={idx} className="flex items-center gap-x-1">
                        {idx > 0 && <span aria-hidden>→</span>}

                        {segment.onClick && !isLast ? (
                            <button
                                type="button"
                                onClick={segment.onClick}
                                className={cn(
                                    "cursor-pointer hover:text-foreground hover:underline",
                                    "transition-colors",
                                )}
                            >
                                {segment.label}
                            </button>
                        ) : (
                            <span className={cn(isLast && "text-foreground font-medium")}>
                                {segment.label}
                            </span>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}

export type { BreadcrumbSegment, InspectorBreadcrumbProps };
