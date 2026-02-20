import { Badge } from "@/components/ui/badge";
import type { ClaimRowStatus } from "../use-claims-diff";

// ============================================================================
// Claims Diff Status Badge
// ============================================================================

const STATUS_VARIANT: Record<ClaimRowStatus, "success" | "warning" | "destructive" | "outline"> = {
    added: "success",
    modified: "warning",
    removed: "destructive",
    unchanged: "outline",
};

const STATUS_LABEL: Record<ClaimRowStatus, string> = {
    added: "ADDED",
    modified: "MODIFIED",
    removed: "REMOVED",
    unchanged: "UNCHANGED",
};

interface ClaimsDiffStatusBadgeProps {
    status: ClaimRowStatus;
}

export function ClaimsDiffStatusBadge({ status }: ClaimsDiffStatusBadgeProps) {
    return (
        <Badge variant={STATUS_VARIANT[status]} size="sm">
            {STATUS_LABEL[status]}
        </Badge>
    );
}
