import { createColumnHelper } from "@tanstack/react-table";
import type { ClaimDiffRow, ClaimRowStatus } from "../use-claims-diff";
import { ClaimsDiffStatusBadge } from "./claims-diff-status-badge";
import { ClaimsDiffValueCell } from "./claims-diff-value-cell";

// ============================================================================
// Column Definitions
// ============================================================================

const columnHelper = createColumnHelper<ClaimDiffRow>();

export const claimsDiffColumns = [
    columnHelper.accessor("key", {
        header: "Key",
        cell: ({ getValue }) => (
            <span className="font-mono text-xs truncate block" title={getValue()}>
                {getValue()}
            </span>
        ),
    }),
    columnHelper.accessor("status", {
        header: "Status",
        filterFn: (row, _columnId, filterValue: Set<ClaimRowStatus>) =>
            filterValue.has(row.getValue("status")),
        cell: ({ getValue }) => <ClaimsDiffStatusBadge status={getValue()} />,
    }),
    columnHelper.accessor("oldValue", {
        header: "Old Value",
        cell: ({ row }) => {
            // For unchanged claims, don't show the old value (it's the same)
            if (row.original.status === "unchanged") {
                return <span className="text-muted-foreground text-xs">—</span>;
            }
            return (
                <ClaimsDiffValueCell
                    value={row.original.oldValue}
                    status={row.original.status}
                    type="old"
                    claimKey={row.original.key}
                />
            );
        },
    }),
    columnHelper.accessor("newValue", {
        header: "New Value",
        cell: ({ row }) => (
            <ClaimsDiffValueCell
                value={row.original.newValue}
                status={row.original.status}
                type="new"
                claimKey={row.original.key}
            />
        ),
    }),
];
