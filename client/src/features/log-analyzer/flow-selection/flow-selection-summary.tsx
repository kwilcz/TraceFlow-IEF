import type { UserFlow } from "@/types/trace";
import { Button } from "@/components/ui/button";
import { CaretUpIcon, CaretDownIcon } from "@phosphor-icons/react";
import { FlowStatusCell } from "./flow-status-cell";
import { formatTechnicalDate } from "@/lib/formatters/date-formatters";
import { formatPolicyName } from "./flow-selection-utils";
import * as card from "@/components/ui/card";

interface FlowSelectionSummaryProps {
    selectedFlow: UserFlow | null;
    expanded: boolean;
    onToggle: () => void;
}

function ToggleButton({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
    return (
        <Button
            variant="tertiary"
            size="sm"
            onClick={onToggle}
            aria-label={expanded ? "Collapse available flows" : "Expand available flows"}
            className={"w-28"}
        >
            <div className="w-full flex flex-row justify-between items-center">
                <CaretDownIcon
                    weight="bold"
                    className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
                {expanded ? "Collapse" : "Expand"}
            </div>
        </Button>
    );
}

export function FlowSelectionSummary({ selectedFlow, expanded, onToggle }: FlowSelectionSummaryProps) {
    if (!selectedFlow) {
        return (
            <div data-testid="selected-flow-summary" className="flex items-center justify-between px-3 pt-3">
                <span className="text-xs text-muted-foreground">No flow selected</span>
                <ToggleButton expanded={expanded} onToggle={onToggle} />
            </div>
        );
    }

    const timeRange = `${formatTechnicalDate(selectedFlow.startTime)} — ${formatTechnicalDate(selectedFlow.endTime)}`;

    return (
        <div data-testid="selected-flow-summary" className="relative flex items-center justify-center">
            {/* Absolute-positioned toggle — doesn't affect content centering */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <ToggleButton expanded={expanded} onToggle={onToggle} />
            </div>

            {/* Centered content block — mr avoids overlap with toggle button */}
            <card.Card
                className="flex flex-col items-center gap-0.5 text-xs w-fit inset-shadow-sm mr-34"
                variant={"transparent"}
            >
                <card.CardContent>
                    {/* Row 1: Email + Status */}
                    <div className="flex items-center justify-between gap-3 w-full">
                        <span className="max-w-50 truncate font-medium text-foreground" title={selectedFlow.userEmail}>
                            {selectedFlow.userEmail || "—"}
                        </span>

                        <FlowStatusCell flow={selectedFlow} />
                    </div>

                    {/* Row 2: Policy · Correlation ID */}
                    <div className="text-muted">
                        <span>{formatPolicyName(selectedFlow.policyId)}</span>
                        <span className="mx-1.5">·</span>
                        <span className="font-mono">{selectedFlow.correlationId}</span>
                    </div>

                    {/* Row 3: Time range */}
                    <span className="text-muted font-mono text-xs self-center">{timeRange}</span>
                </card.CardContent>
            </card.Card>
        </div>
    );
}
