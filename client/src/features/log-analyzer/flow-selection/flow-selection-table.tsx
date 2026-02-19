import { Fragment, useState, useCallback, useMemo } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getGroupedRowModel,
    getExpandedRowModel,
    flexRender,
    type Row,
} from "@tanstack/react-table";

import type { UserFlow } from "@/types/trace";
import { flowColumns } from "./flow-selection-columns";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Stable references — created once at module scope                   */
/* ------------------------------------------------------------------ */

/** Grouping key — stable array reference to avoid TanStack re-render loops. */
const GROUPING: string[] = ["policyId"];

/** Pre-built model factories — stable references prevent recomputation. */
const coreRowModel = getCoreRowModel<UserFlow>();
const groupedRowModel = getGroupedRowModel<UserFlow>();
const expandedRowModel = getExpandedRowModel<UserFlow>();

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface FlowSelectionTableProps {
    userFlows: UserFlow[];
    selectedFlow: UserFlow | null;
    onSelectFlow: (flow: UserFlow) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FlowSelectionTable({ userFlows, selectedFlow, onSelectFlow }: FlowSelectionTableProps) {
    /* ---- Visual group collapse (independent of TanStack expanded) ---- */
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());

    const toggleGroup = useCallback((groupId: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    }, []);

    /* ---- TanStack Table — expanded is ALWAYS true ---- */
    const tableState = useMemo(() => ({ grouping: GROUPING, expanded: true as const }), []);
    const tableMeta = useMemo(() => ({ collapsedGroups }), [collapsedGroups]);

    const table = useReactTable({
        data: userFlows,
        columns: flowColumns,
        state: tableState,
        getCoreRowModel: coreRowModel,
        getGroupedRowModel: groupedRowModel,
        getExpandedRowModel: expandedRowModel,
        groupedColumnMode: "remove",
        meta: tableMeta,
    });

    const allRows = table.getRowModel().rows;
    const groupRows = allRows.filter(row => row.getIsGrouped());

    /* -------------------------------------------------------------- */
    /*  Row renderers                                                  */
    /* -------------------------------------------------------------- */

    function renderGroupRow(row: Row<UserFlow>) {
        const visibleCells = row.getVisibleCells();
        const groupId = String(row.groupingValue ?? "");
        const isCollapsed = collapsedGroups.has(groupId);

        return (
            <TableRow
                key={row.id}
                data-testid={`group-row-${row.groupingValue}`}
                role="button"
                tabIndex={0}
                aria-expanded={!isCollapsed}
                aria-label={`${groupId} group`}
                className="cursor-pointer"
                onClick={() => toggleGroup(groupId)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleGroup(groupId);
                    }
                }}
            >
                <TableCell colSpan={visibleCells.length}>
                    {flexRender(visibleCells[0].column.columnDef.aggregatedCell, visibleCells[0].getContext())}
                </TableCell>
            </TableRow>
        );
    }

    function renderLeafRow(row: Row<UserFlow>) {
        const flow = row.original;
        const isSelected = selectedFlow?.id === flow.id;

        return (
            <TableRow
                key={row.id}
                role="button"
                aria-label={flow.id}
                tabIndex={0}
                data-state={isSelected ? "selected" : undefined}
                className={cn(
                    "cursor-pointer",
                    isSelected && "bg-primary/5 border-l-2 border-l-primary",
                )}
                onClick={() => onSelectFlow(flow)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectFlow(flow);
                    }
                }}
            >
                {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                ))}
            </TableRow>
        );
    }

    /* -------------------------------------------------------------- */
    /*  Render                                                         */
    /* -------------------------------------------------------------- */
    return (
        <Table data-testid="available-flows-table">
            <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                            <TableHead key={header.id} colSpan={header.colSpan}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                        ))}
                    </TableRow>
                ))}
            </TableHeader>

            {groupRows.map((groupRow) => {
                const groupId = String(groupRow.groupingValue ?? "");
                const isCollapsed = collapsedGroups.has(groupId);

                return (
                    <Fragment key={groupRow.id}>
                        <TableBody>
                            {renderGroupRow(groupRow)}
                        </TableBody>
                        <AnimatePresence initial={false}>
                            {!isCollapsed && (
                                <motion.tbody
                                    key={`leaves-${groupId}`}
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                >
                                    {groupRow.subRows.map((leafRow) => renderLeafRow(leafRow))}
                                </motion.tbody>
                            )}
                        </AnimatePresence>
                    </Fragment>
                );
            })}
        </Table>
    );
}
