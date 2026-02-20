import { Equals, Minus, PencilSimple, Plus } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ToggleTag } from "@/components/ui/toggle-tag";
import { CLAIM_STATUSES, type ClaimRowStatus } from "../use-claims-diff";

// ============================================================================
// Claims Diff Filter Bar
// ============================================================================

interface ClaimsDiffFilterBarProps {
    stepOrder: number;
    totalCount: number;
    changedCount: number;
    statusCounts: Record<ClaimRowStatus, number>;
    activeStatuses: Set<ClaimRowStatus>;
    onToggleStatus: (status: ClaimRowStatus) => void;
    onToggleAll: () => void;
    filterText: string;
    onFilterTextChange: (value: string) => void;
}

const TAG_ICONS: Record<ClaimRowStatus, React.ElementType> = {
    added: Plus,
    modified: PencilSimple,
    removed: Minus,
    unchanged: Equals,
};

const TAG_LABELS: Record<ClaimRowStatus, string> = {
    added: "Added",
    modified: "Modified",
    removed: "Removed",
    unchanged: "Unchanged",
};

export function ClaimsDiffFilterBar({
    stepOrder,
    totalCount,
    changedCount,
    statusCounts,
    activeStatuses,
    onToggleStatus,
    onToggleAll,
    filterText,
    onFilterTextChange,
}: ClaimsDiffFilterBarProps) {
    const allActive = CLAIM_STATUSES.every((s) => activeStatuses.has(s));

    return (
        <div className="flex items-center gap-2 px-3 h-7 border-b border-border shrink-0">
            {/* Left: Title + change count badge */}
            <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Claims Diff (Step {stepOrder})
                </span>
                {changedCount > 0 && (
                    <Badge variant="warning" size="sm">
                        {changedCount} changed
                    </Badge>
                )}
            </div>

            {/* Center: Status toggle tags */}
            <div className="flex items-center gap-1 ml-auto">
                <ToggleTag active={allActive} onClick={onToggleAll} data-testid="toggle-all">
                    All {totalCount}
                </ToggleTag>

                {CLAIM_STATUSES.map((status) => {
                    const Icon = TAG_ICONS[status];
                    const isActive = activeStatuses.has(status);

                    return (
                        <ToggleTag
                            key={status}
                            active={isActive}
                            onClick={() => onToggleStatus(status)}
                            data-testid={`toggle-${status}`}
                        >
                            <Icon weight="bold" className="size-3" />
                            {TAG_LABELS[status]} {statusCounts[status]}
                        </ToggleTag>
                    );
                })}
            </div>

            {/* Right: Filter input */}
            <Input
                value={filterText}
                onChange={(e) => onFilterTextChange(e.target.value)}
                placeholder="Filter claims…"
                aria-label="Filter claims by key"
                className="h-5 w-36 text-xs sm:text-xs"
                data-testid="claims-filter-input"
            />
        </div>
    );
}
