import { useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getGroupedRowModel,
    getExpandedRowModel,
    getPaginationRowModel,
    flexRender,
    type ExpandedState,
    type PaginationState,
    type Row,
} from "@tanstack/react-table";

import type { UserFlow } from "@/types/trace";
import { flowColumns } from "./flow-selection-columns";
import { FlowSelectionPagination } from "./flow-selection-pagination";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
const paginationRowModel = getPaginationRowModel<UserFlow>();

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

export function FlowSelectionTable({
    userFlows,
    selectedFlow,
    onSelectFlow,
}: FlowSelectionTableProps) {
    const [expanded, setExpanded] = useState<ExpandedState>(true);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const table = useReactTable({
        data: userFlows,
        columns: flowColumns,
        state: { grouping: GROUPING, expanded, pagination },
        onExpandedChange: setExpanded,
        onPaginationChange: setPagination,
        getCoreRowModel: coreRowModel,
        getGroupedRowModel: groupedRowModel,
        getExpandedRowModel: expandedRowModel,
        getPaginationRowModel: paginationRowModel,
        groupedColumnMode: "remove",
        paginateExpandedRows: false,
    });

    /* -------------------------------------------------------------- */
    /*  Row renderers                                                  */
    /* -------------------------------------------------------------- */

    function renderGroupRow(row: Row<UserFlow>) {
        const visibleCells = row.getVisibleCells();
        const toggleExpanded = row.getToggleExpandedHandler();

        return (
            <TableRow
                key={row.id}
                data-testid={`group-row-${row.groupingValue}`}
                role="button"
                tabIndex={0}
                aria-expanded={row.getIsExpanded()}
                aria-label={`${String(row.groupingValue ?? "")} group`}
                className="cursor-pointer"
                onClick={toggleExpanded}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleExpanded();
                    }
                }}
            >
                <TableCell colSpan={visibleCells.length}>
                    {flexRender(
                        visibleCells[0].column.columnDef.aggregatedCell,
                        visibleCells[0].getContext(),
                    )}
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
                        {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                        )}
                    </TableCell>
                ))}
            </TableRow>
        );
    }

    /* -------------------------------------------------------------- */
    /*  Render                                                         */
    /* -------------------------------------------------------------- */

    return (
        <div data-testid="available-flows-table">
            <ScrollArea className="w-full">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        colSpan={header.colSpan}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef
                                                      .header,
                                                  header.getContext(),
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.map((row) => {
                            if (row.getIsGrouped()) {
                                return renderGroupRow(row);
                            }
                            return renderLeafRow(row);
                        })}
                    </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <FlowSelectionPagination table={table} />
        </div>
    );
}
