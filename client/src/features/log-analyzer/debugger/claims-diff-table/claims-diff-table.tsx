import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    useReactTable,
    type ColumnFiltersState,
} from "@tanstack/react-table";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollAreaRoot, ScrollAreaViewport, ScrollAreaContent, ScrollBar } from "@/components/ui/scroll-area";
import { useLogStore } from "@/stores/log-store";
import { useDebuggerContext } from "../debugger-context";
import { CLAIM_STATUSES, useClaimsDiff, type ClaimDiffRow, type ClaimRowStatus } from "../use-claims-diff";
import { claimsDiffColumns } from "./claims-diff-columns";
import { ClaimsDiffEmpty } from "./claims-diff-empty";
import { ClaimsDiffFilterBar } from "./claims-diff-filter-bar";

// ============================================================================
// Module-scope table model factories (avoid re-creating every render)
// ============================================================================

const coreModel = getCoreRowModel<ClaimDiffRow>();
const filteredModel = getFilteredRowModel<ClaimDiffRow>();

// ============================================================================
// Constants
// ============================================================================

const ALL_STATUSES = new Set(CLAIM_STATUSES);

// ============================================================================
// Claims Diff Table
// ============================================================================

export function ClaimsDiffTable() {
    const { selection } = useDebuggerContext();
    const traceSteps = useLogStore(useShallow((s) => s.traceSteps));

    const { rows } = useClaimsDiff(selection, traceSteps);
    const stepIndex = selection?.stepIndex ?? -1;
    const activeStep = stepIndex >= 0 ? traceSteps[stepIndex] : undefined;

    // ── Filter state ───────────────────────────────────────────────────
    const [activeStatuses, setActiveStatuses] = useState<Set<ClaimRowStatus>>(new Set(ALL_STATUSES));
    const [filterText, setFilterText] = useState("");

    const handleFilterTextChange = (value: string) => {
        setFilterText(value);
    };

    const handleToggleStatus = (status: ClaimRowStatus) => {
        setActiveStatuses((prev) => {
            const next = new Set(prev);
            if (next.has(status)) {
                next.delete(status);
            } else {
                next.add(status);
            }
            return next;
        });
    };

    const handleToggleAll = () => {
        setActiveStatuses((prev) => {
            const allActive = ALL_STATUSES.size === prev.size;
            return allActive ? new Set<ClaimRowStatus>() : new Set(ALL_STATUSES);
        });
    };

    // ── Derived state ──────────────────────────────────────────────────
    const columnFilters = useMemo<ColumnFiltersState>(
        () => [{ id: "status", value: activeStatuses }],
        [activeStatuses],
    );

    const statusCounts = useMemo(() => {
        const counts: Record<ClaimRowStatus, number> = {
            added: 0,
            modified: 0,
            removed: 0,
            unchanged: 0,
        };
        for (const row of rows) {
            counts[row.status]++;
        }
        return counts;
    }, [rows]);

    const changedCount = statusCounts.added + statusCounts.modified + statusCounts.removed;

    // ── Table instance ─────────────────────────────────────────────────
    const table = useReactTable({
        data: rows,
        columns: claimsDiffColumns,
        getCoreRowModel: coreModel,
        getFilteredRowModel: filteredModel,
        state: {
            columnFilters,
            globalFilter: filterText,
        },
        globalFilterFn: (row, _columnId, filterValue: string) =>
            row.original.key.toLowerCase().includes(filterValue.toLowerCase()),
    });

    // ── Animation ──────────────────────────────────────────────────────
    const shouldReduce = useReducedMotion();
    const duration = shouldReduce ? 0 : 0.12;

    // ── Empty states ───────────────────────────────────────────────────
    if (!selection || !activeStep) {
        return <ClaimsDiffEmpty hasSelection={false} />;
    }

    if (rows.length === 0) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <ClaimsDiffFilterBar
                    stepOrder={activeStep.stepOrder}
                    totalCount={0}
                    changedCount={0}
                    statusCounts={statusCounts}
                    activeStatuses={activeStatuses}
                    onToggleStatus={handleToggleStatus}
                    onToggleAll={handleToggleAll}
                    filterText={filterText}
                    onFilterTextChange={handleFilterTextChange}
                />
                <ClaimsDiffEmpty hasSelection={true} />
            </div>
        );
    }

    // ── Main render ────────────────────────────────────────────────────
    const visibleRows = table.getRowModel().rows;

    return (
        <div className="flex flex-col h-full overflow-hidden min-h-0">
            <ClaimsDiffFilterBar
                stepOrder={activeStep.stepOrder}
                totalCount={rows.length}
                changedCount={changedCount}
                statusCounts={statusCounts}
                activeStatuses={activeStatuses}
                onToggleStatus={handleToggleStatus}
                onToggleAll={handleToggleAll}
                filterText={filterText}
                onFilterTextChange={handleFilterTextChange}
            />

            <ScrollAreaRoot className="flex-1 min-h-0">
                <ScrollAreaViewport className="h-full">
                    <ScrollAreaContent>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={stepIndex}
                                initial={{ opacity: 0.5 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration }}
                            >
                                <Table className="table-fixed" aria-label={`Claims diff for step ${activeStep.stepOrder}`}>
                                    <colgroup>
                                        <col className="w-[20%]" />
                                        <col className="w-[10%]" />
                                        <col className="w-[35%]" />
                                        <col className="w-[35%]" />
                                    </colgroup>

                                    <TableHeader>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <TableHead
                                                        key={header.id}
                                                        className="sticky top-0 bg-background z-10 text-xs h-7"
                                                    >
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext(),
                                                        )}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableHeader>

                                    <TableBody>
                                        {visibleRows.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={4}
                                                    className="text-center text-xs text-muted-foreground py-6"
                                                >
                                                    No matching claims
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            visibleRows.map((row) => (
                                                <TableRow
                                                    key={row.id}
                                                    data-status={row.original.status}
                                                >
                                                    {row.getVisibleCells().map((cell) => (
                                                        <TableCell key={cell.id} className="py-1.5 px-3">
                                                            {flexRender(
                                                                cell.column.columnDef.cell,
                                                                cell.getContext(),
                                                            )}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </motion.div>
                        </AnimatePresence>
                    </ScrollAreaContent>
                </ScrollAreaViewport>
                <ScrollBar />
            </ScrollAreaRoot>

            {/* Footer — must be AFTER ScrollAreaRoot, with shrink-0 */}
            <div className="flex items-center justify-between px-3 py-1 border-t border-border text-[10px] text-muted-foreground shrink-0">
                <span>
                    {rows.length} claims • {changedCount} changed
                </span>
                <span>
                    Step {activeStep.stepOrder}/{traceSteps.length}
                </span>
            </div>
        </div>
    );
}
