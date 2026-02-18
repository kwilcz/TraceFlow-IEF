import type { UserFlow } from "@/types/trace";
import { Button } from "@/components/ui/button";
import { CaretUp, CaretDown, CaretUpIcon, CaretDownIcon } from "@phosphor-icons/react";
import { FlowStatusCell } from "./flow-status-cell";
import { createDateFormatter } from "@/lib/formatters/date-formatters";
import { formatPolicyName } from "./flow-selection-utils";

const dateFormatter = createDateFormatter();

interface FlowSelectionSummaryProps {
    selectedFlow: UserFlow | null;
    expanded: boolean;
    onToggle: () => void;
}

function ToggleButton({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
    return (
        <Button
            variant="ghost"
            size="xs"
            onClick={onToggle}
            aria-label={expanded ? "Collapse available flows" : "Expand available flows"}
            className="relative"
        >
            {expanded ? (
                <>
                <CaretUpIcon weight="bold" className="size-3.5" />
                Collapse
                </>
            ) : (
                <>
                <CaretDownIcon weight="bold" className="size-3.5" />
                Expand
                </>
            )}
        </Button>
    );
}

export function FlowSelectionSummary({ selectedFlow, expanded, onToggle }: FlowSelectionSummaryProps) {
    if (!selectedFlow) {
        return (
            <div data-testid="selected-flow-summary" className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-muted-foreground">No flow selected</span>
                <ToggleButton expanded={expanded} onToggle={onToggle} />
            </div>
        );
    }

    const timeRange = `${dateFormatter.format(selectedFlow.startTime)} — ${dateFormatter.format(selectedFlow.endTime)}`;

    return (
        <div data-testid="selected-flow-summary" className="px-3 py-2">
            <span className="sr-only">Selected flow: {selectedFlow.id}</span>

            {/* Top row */}
            <div className="flex items-center gap-4 text-xs">
                {selectedFlow.userEmail && (
                    <span className="max-w-50 truncate font-medium text-foreground" title={selectedFlow.userEmail}>
                        {selectedFlow.userEmail}
                    </span>
                )}

                <span className="text-muted-foreground">{formatPolicyName(selectedFlow.policyId)}</span>

                <span className="tabular-nums text-muted-foreground">{timeRange}</span>

                <FlowStatusCell flow={selectedFlow} />

                <span className="ml-auto">
                    <ToggleButton expanded={expanded} onToggle={onToggle} />
                </span>
            </div>

            {/* Bottom row — correlation ID */}
            <div className="text-center text-[11px] text-muted-foreground/70 font-mono pt-0.5">
                {selectedFlow.correlationId}
            </div>
        </div>
    );
}
