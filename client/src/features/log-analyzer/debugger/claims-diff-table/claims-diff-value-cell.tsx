import { cn } from "@/lib/utils";
import { DisplayField } from "@/components/ui/display-field";
import { CopyButton } from "../shared/copy-button";
import type { ClaimRowStatus } from "../use-claims-diff";

// ============================================================================
// Claims Diff Value Cell
// ============================================================================

interface ClaimsDiffValueCellProps {
    value: string | null;
    status: ClaimRowStatus;
    type: "old" | "new";
    claimKey: string;
}

export function ClaimsDiffValueCell({ value, status, type, claimKey }: ClaimsDiffValueCellProps) {
    if (value === null) {
        return <span className="text-muted-foreground text-xs">—</span>;
    }

    return (
        <DisplayField
            className={cn(
                "font-mono text-xs px-2 py-1 max-h-18 overflow-hidden whitespace-pre-wrap break-all",
                type === "old" && status === "modified" && "line-through text-muted-foreground",
                type === "old" && status === "removed" && "line-through text-destructive-foreground",
            )}
            action={<CopyButton value={value} label={`${type} value of ${claimKey}`} />}
        >
            {value}
        </DisplayField>
    );
}
