import { CheckCircleIcon, ClockIcon, WarningCircleIcon, XCircleIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import type { UserFlow } from "@/types/trace";

/**
 * Renders the status of a `UserFlow` as an icon + label pair.
 *
 * Priority cascade:
 * 1. `hasErrors`  → Error (destructive)
 * 2. `cancelled`  → Cancelled (orange)
 * 3. `completed`  → Completed (green)
 * 4. default      → In Progress (yellow)
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
                <XCircleIcon weight="fill" className="size-4 text-orange-500" />
                <span className="text-xs text-orange-500">Cancelled</span>
            </div>
        );
    }

    if (flow.completed) {
        return (
            <div className={cn("flex items-center gap-1.5 whitespace-nowrap", className)} {...props}>
                <CheckCircleIcon weight="fill" className="size-4 text-green-500" />
                <span className="text-xs text-green-500">Completed</span>
            </div>
        );
    }

    return (
        <div className={cn("flex items-center gap-1.5 whitespace-nowrap", className)} {...props}>
            <ClockIcon weight="fill" className="size-4 text-yellow-500" />
            <span className="text-xs text-yellow-500">Abandoned</span>
        </div>
    );
}
