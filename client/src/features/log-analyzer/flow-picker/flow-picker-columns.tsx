import { createColumnHelper } from "@tanstack/react-table";

import type { UserFlow } from "@/types/trace";
import { createDateFormatter } from "@/lib/formatters/date-formatters";
import { FlowStatusDot } from "./flow-status-cell";

/* ------------------------------------------------------------------ */
/*  Utilities                                                         */
/* ------------------------------------------------------------------ */

/** Strips the `B2C_1A_` prefix from a policy ID for display. */
export function formatPolicyName(policyId: string): string {
    return policyId.replace(/^B2C_1A_/i, "");
}

/* ------------------------------------------------------------------ */
/*  Module-level singletons                                           */
/* ------------------------------------------------------------------ */

const columnHelper = createColumnHelper<UserFlow>();

/** Compact date formatter: "MMM DD, hh:mm AM/PM" */
const dateFormatter = createDateFormatter({
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
});

/* ------------------------------------------------------------------ */
/*  Column definitions                                                */
/* ------------------------------------------------------------------ */

/** Column definitions for the flat flow picker table. */
export const flowPickerColumns = [
    /* 1 — Status dot (40px fixed) */
    columnHelper.display({
        id: "status",
        header: "",
        size: 40,
        minSize: 40,
        maxSize: 40,
        cell: ({ row }) => (
            <div className="flex items-center justify-center">
                <FlowStatusDot flow={row.original} />
            </div>
        ),
    }),

    /* 2 — Policy ID (flex: 1, min 200px) */
    columnHelper.accessor("policyId", {
        header: "Policy",
        size: 200,
        minSize: 200,
        cell: ({ getValue }) => {
            const raw = getValue();
            const display = formatPolicyName(raw);
            return (
                <span
                    className="block truncate font-mono text-sm"
                    title={raw}
                >
                    {display}
                </span>
            );
        },
    }),

    /* 3 — User Email (flex: 0.6, min 140px) */
    columnHelper.accessor("userEmail", {
        header: "Email",
        size: 140,
        minSize: 140,
        cell: ({ getValue }) => {
            const value = getValue();
            return (
                <span
                    className="block truncate text-sm"
                    title={value ?? ""}
                >
                    {value ?? "—"}
                </span>
            );
        },
    }),

    /* 4 — Date (140px fixed) */
    columnHelper.accessor("startTime", {
        header: "Date",
        size: 140,
        minSize: 140,
        maxSize: 140,
        cell: ({ getValue }) => (
            <span className="text-sm tabular-nums whitespace-nowrap">
                {dateFormatter.format(getValue())}
            </span>
        ),
    }),

    /* 5 — Correlation ID (flex: 0.5, min 120px) */
    columnHelper.accessor("correlationId", {
        header: "Correlation ID",
        size: 120,
        minSize: 120,
        cell: ({ getValue }) => {
            const value = getValue();
            return (
                <span
                    className="block truncate font-mono text-[0.8em]"
                    title={value}
                >
                    {value}
                </span>
            );
        },
    }),
];
