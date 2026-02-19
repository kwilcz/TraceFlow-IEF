import { createColumnHelper, type Row, type Table } from "@tanstack/react-table";
import {
    CaretRight,
    CaretDown,
} from "@phosphor-icons/react";

import type { UserFlow } from "@/types/trace";
import { Badge } from "@/components/ui/badge";
import { createDateFormatter } from "@/lib/formatters/date-formatters";
import { FlowStatusCell } from "./flow-status-cell";
import { formatPolicyName } from "./flow-selection-utils";

/* ------------------------------------------------------------------ */
/*  Module-level singletons                                           */
/* ------------------------------------------------------------------ */

const columnHelper = createColumnHelper<UserFlow>();

/** Reusable date formatter — created once at module scope. */
const dateFormatter = createDateFormatter();

/* ------------------------------------------------------------------ */
/*  Column definitions                                                */
/* ------------------------------------------------------------------ */

/** Column definitions for the flow-selection table. */
export const flowColumns = [
    /* 1 — policyId (grouping only; removed from leaf rows via groupedColumnMode) */
    columnHelper.accessor("policyId", {
        header: "Policy",
    }),

    /* 2 — correlationId (also renders group header via aggregatedCell) */
    columnHelper.accessor("correlationId", {
        header: "Correlation ID",
        size: 150,
        cell: ({ getValue }) => {
            const value = getValue();
            return (
                <span
                    className="font-mono text-xs truncate block max-w-37.5"
                    title={value}
                >
                    {value}
                </span>
            );
        },
        aggregatedCell: ({ row, table }: { row: Row<UserFlow>; table: Table<UserFlow> }) => {
            const collapsedGroups = (table.options.meta as { collapsedGroups?: Set<string> })?.collapsedGroups;
            const groupId = String(row.groupingValue ?? "");
            const isExpanded = !collapsedGroups?.has(groupId);
            const policyName = formatPolicyName(String(row.groupingValue ?? ""));
            const count = row.subRows.length;

            return (
                <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1">
                    {isExpanded ? (
                        <CaretDown className="size-4 shrink-0" />
                    ) : (
                        <CaretRight className="size-4 shrink-0" />
                    )}
                    <span className="font-bold text-sm truncate">
                        {policyName}
                    </span>
                    <Badge variant="outline" size="sm">
                        {count} flow{count !== 1 ? "s" : ""}
                    </Badge>
                </div>
            );
        },
    }),

    /* 3 — status (display column) */
    columnHelper.display({
        id: "status",
        header: "Status",
        size: 120,
        cell: ({ row }) => <FlowStatusCell flow={row.original} />,
        aggregatedCell: () => null,
    }),

    /* 4 — userEmail */
    columnHelper.accessor("userEmail", {
        header: "Email",
        cell: ({ getValue }) => {
            const value = getValue();
            return (
                <span
                    className="text-xs truncate block max-w-45"
                    title={value ?? ""}
                >
                    {value ?? "—"}
                </span>
            );
        },
        aggregatedCell: () => null,
    }),

    /* 5 — userObjectId */
    columnHelper.accessor("userObjectId", {
        header: "Object ID",
        cell: ({ getValue }) => {
            const value = getValue();
            return (
                <span
                    className="font-mono text-xs truncate block max-w-30"
                    title={value ?? ""}
                >
                    {value ?? "—"}
                </span>
            );
        },
        aggregatedCell: () => null,
    }),

    /* 6 — stepCount */
    columnHelper.accessor("stepCount", {
        header: "Steps",
        size: 60,
        cell: ({ getValue }) => (
            <span className="text-xs text-center block">{getValue()}</span>
        ),
        aggregatedCell: () => null,
    }),

    /* 7 — startTime */
    columnHelper.accessor("startTime", {
        header: "Start Time",
        size: 150,
        cell: ({ getValue }) => (
            <span className="text-xs">
                {dateFormatter.format(getValue())}
            </span>
        ),
        aggregatedCell: () => null,
    }),
];
