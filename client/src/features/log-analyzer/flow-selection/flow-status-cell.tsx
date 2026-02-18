import {
    WarningCircle,
    XCircle,
    CheckCircle,
    Clock,
} from "@phosphor-icons/react";

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
export function FlowStatusCell({ flow }: { flow: UserFlow }) {
    if (flow.hasErrors) {
        return (
            <div className="flex items-center gap-1.5">
                <WarningCircle weight="fill" className="size-4 text-destructive" />
                <span className="text-xs text-destructive">Error</span>
            </div>
        );
    }

    if (flow.cancelled) {
        return (
            <div className="flex items-center gap-1.5">
                <XCircle weight="fill" className="size-4 text-orange-500" />
                <span className="text-xs text-orange-500">Cancelled</span>
            </div>
        );
    }

    if (flow.completed) {
        return (
            <div className="flex items-center gap-1.5">
                <CheckCircle weight="fill" className="size-4 text-green-500" />
                <span className="text-xs text-green-500">Completed</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5">
            <Clock weight="fill" className="size-4 text-yellow-500" />
            <span className="text-xs text-yellow-500">In Progress</span>
        </div>
    );
}
