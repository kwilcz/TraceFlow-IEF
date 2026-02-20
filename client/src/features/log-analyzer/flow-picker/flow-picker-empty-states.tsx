import { SpinnerGap } from "@phosphor-icons/react";

/** Spinner shown while telemetry data is being fetched. */
export function FlowPickerLoading() {
    return (
        <div
            data-testid="flow-picker-loading"
            className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
        >
            <SpinnerGap className="size-4 animate-spin" />
            <span>Loading telemetry</span>
        </div>
    );
}

/** Placeholder shown when no log data has been loaded yet. */
export function FlowPickerNoLogs() {
    return (
        <div
            data-testid="flow-picker-no-logs"
            className="py-8 text-center text-sm text-muted-foreground"
        >
            No logs loaded yet. Run a query to see results.
        </div>
    );
}

/** Placeholder shown when logs exist but contain no recognizable user flows. */
export function FlowPickerNoFlows() {
    return (
        <div
            data-testid="flow-picker-no-flows"
            className="py-8 text-center text-sm text-muted-foreground"
        >
            No user flows found in the loaded logs.
        </div>
    );
}
