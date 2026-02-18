import type { Table as ReactTable } from "@tanstack/react-table";
import type { UserFlow } from "@/types/trace";
import { Button } from "@/components/ui/button";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

interface FlowSelectionPaginationProps {
    table: ReactTable<UserFlow>;
}

export function FlowSelectionPagination({
    table,
}: FlowSelectionPaginationProps) {
    return (
        <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
            <span>
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
            </span>

            <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <select
                    aria-label="Rows per page"
                    value={table.getState().pagination.pageSize}
                    onChange={(e) =>
                        table.setPageSize(Number(e.target.value))
                    }
                    className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                >
                    {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="xs"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    <CaretLeft className="size-3.5" />
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="xs"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                    <CaretRight className="size-3.5" />
                </Button>
            </div>
        </div>
    );
}
