import { CheckCircleIcon, ClockIcon, WarningCircleIcon, XCircleIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import type { UserFlow } from "@/types/trace";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

type FlowStatusInfo = {
    label: string;
    colorClass: string;
    bgClass: string;
};

function resolveFlowStatus(flow: UserFlow): FlowStatusInfo {
    if (flow.hasErrors) return { label: "Error", colorClass: "text-destructive", bgClass: "bg-destructive" };
    if (flow.cancelled) return { label: "Cancelled", colorClass: "text-warning", bgClass: "bg-warning" };
    if (flow.completed) return { label: "Completed", colorClass: "text-success", bgClass: "bg-success" };
    return { label: "Abandoned", colorClass: "text-warning", bgClass: "bg-warning" };
}

/* ------------------------------------------------------------------ */
/*  FlowStatusDot — compact dot for the flow picker table             */
/* ------------------------------------------------------------------ */

/**
 * Renders a small colored dot representing the flow status.
 * Used in the compact flow picker table (no text label).
 */
export function FlowStatusDot({
    flow,
    className,
    ...props
}: { flow: UserFlow } & React.HTMLAttributes<HTMLSpanElement>) {
    const { label, bgClass } = resolveFlowStatus(flow);

    return (
        <span
            className={cn("inline-block size-2.5 rounded-full", bgClass, className)}
            title={label}
            role="img"
            aria-label={label}
            {...props}
        />
    );
}

/* ------------------------------------------------------------------ */
/*  FlowStatusCell — icon + label for detail views                    */
/* ------------------------------------------------------------------ */

/**
 * Renders the status of a `UserFlow` as an icon + label pair.
 *
 * Priority cascade:
 * 1. `hasErrors`  → Error (destructive)
 * 2. `cancelled`  → Cancelled (warning)
 * 3. `completed`  → Completed (success)
 * 4. default      → Abandoned (warning)
 */
export function FlowStatusCell({
    flow,
    className,
    ...props
}: { flow: UserFlow } & React.HTMLAttributes<HTMLDivElement>) {
    if (flow.hasErrors) {
        return (
            <div className={cn("flex items-center gap-1.5 whitespace-nowrap", className)} {...props}>
                <WarningCircleIcon weight="fill" className="size-4 text-destructive" />
                <span className="text-xs text-destructive">Error</span>
            </div>
        );
    }

    if (flow.cancelled) {
        return (
            <div className={cn("flex items-center gap-1.5 whitespace-nowrap", className)} {...props}>
                <XCircleIcon weight="fill" className="size-4 text-warning" />
                <span className="text-xs text-warning">Cancelled</span>
            </div>
        );
    }

    if (flow.completed) {
        return (
            <div className={cn("flex items-center gap-1.5 whitespace-nowrap", className)} {...props}>
                <CheckCircleIcon weight="fill" className="size-4 text-success" />
                <span className="text-xs text-success">Completed</span>
            </div>
        );
    }

    return (
        <div className={cn("flex items-center gap-1.5 whitespace-nowrap", className)} {...props}>
            <ClockIcon weight="fill" className="size-4 text-warning" />
            <span className="text-xs text-warning">Abandoned</span>
        </div>
    );
}
