import { useEffect, useRef, useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
} from "@tanstack/react-table";
import { motion } from "motion/react";
import { CaretDoubleDown, CaretDoubleUp } from "@phosphor-icons/react";

import type { UserFlow } from "@/types/trace";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ScrollAreaRoot,
    ScrollAreaViewport,
    ScrollAreaContent,
    ScrollBar,
    ScrollAreaCorner,
} from "@/components/ui/scroll-area";

/** Motion-enhanced TableRow — avoids invalid <tr> nesting from motion.tr wrapper. */
const MotionTableRow = motion.create(TableRow);
import { flowPickerColumns } from "./flow-picker-columns";
import "./flow-picker.css";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const ROW_HEIGHT = 32; // px
const COLLAPSED_ROWS = 5;
/** Conceptual max-height: ROW_HEIGHT × COLLAPSED_ROWS = 160px. Hardcoded in the Tailwind class below. */
const _COLLAPSED_MAX_H = ROW_HEIGHT * COLLAPSED_ROWS; // eslint-disable-line @typescript-eslint/no-unused-vars
/** Wheel-event delta accumulator threshold (px) for drum-picker in collapsed mode. */
const WHEEL_THRESHOLD = 40;

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

interface FlowPickerProps {
    userFlows: UserFlow[];
    selectedFlow: UserFlow | null;
    onSelectFlow: (flow: UserFlow) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function FlowPicker({ userFlows, selectedFlow, onSelectFlow }: FlowPickerProps) {
    const [expanded, setExpanded] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const viewportRef = useRef<HTMLDivElement>(null);
    const wheelAccumRef = useRef(0);
    const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
    const hasAutoSelected = useRef(false);
    const [animationOrigin, setAnimationOrigin] = useState<number | null>(null);
    const scrollBehaviorRef = useRef<ScrollBehavior>("smooth");
    const activeId = selectedFlow?.id ?? null;
    const justCollapsedRef = useRef(false);

    /* ---- TanStack Table ---- */
    const table = useReactTable({
        data: userFlows,
        columns: flowPickerColumns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        initialState: {
            sorting: [
                { id: "policyId", desc: false },
                { id: "startTime", desc: true },
            ],
        },
    });

    const rows = table.getRowModel().rows;

    function handleSelect(flow: UserFlow) {
        onSelectFlow(flow);
    }

    /* Render-time: reset auto-select guard when flow data changes */
    const prevFlowsRef = useRef(userFlows);
    if (prevFlowsRef.current !== userFlows) {
        prevFlowsRef.current = userFlows;
        hasAutoSelected.current = false;
    }

    /* Auto-select first flow when visible rows exist and no selection */
    useEffect(() => {
        if (!hasAutoSelected.current && !expanded && rows.length > 0 && selectedFlow === null) {
            hasAutoSelected.current = true;
            onSelectFlow(rows[0].original);
        }
    }, [rows, expanded, selectedFlow, onSelectFlow]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ---- Drum-picker wheel in collapsed mode ---- */
    useEffect(() => {
        const container = viewportRef.current;
        if (!container || expanded) return;

        function handleWheel(e: WheelEvent) {
            e.preventDefault();
            wheelAccumRef.current += e.deltaY;
            if (Math.abs(wheelAccumRef.current) < WHEEL_THRESHOLD) return;

            const direction = wheelAccumRef.current > 0 ? 1 : -1;
            wheelAccumRef.current = 0;

            let nextIdx: number | null = null;
            setFocusedIndex((prev) => {
                const newIdx = Math.max(0, Math.min(prev + direction, rows.length - 1));
                if (newIdx !== prev) nextIdx = newIdx;
                return newIdx;
            });
            if (nextIdx !== null) {
                scrollBehaviorRef.current = "instant";
                handleSelect(rows[nextIdx].original);
            }
        }

        container.addEventListener("wheel", handleWheel, { passive: false });
        return () => container.removeEventListener("wheel", handleWheel);
    }, [expanded, rows, onSelectFlow]); // eslint-disable-line react-hooks/exhaustive-deps

    /* Render-time: sync focusedIndex when activeId changes */
    const prevActiveIdRef = useRef(activeId);
    if (prevActiveIdRef.current !== activeId) {
        prevActiveIdRef.current = activeId;
        if (activeId) {
            const idx = rows.findIndex((r) => r.original.id === activeId);
            if (idx >= 0 && idx !== focusedIndex) {
                setFocusedIndex(idx);
            }
        }
    }

    /* ---- Center selected row in collapsed mode ---- */
    useEffect(() => {
        if (expanded) return;

        function centerRow() {
            const rowEl = rowRefs.current.get(focusedIndex);
            if (rowEl) {
                rowEl.scrollIntoView({ block: "center", behavior: scrollBehaviorRef.current });
                scrollBehaviorRef.current = "smooth";
            }
            justCollapsedRef.current = false;
        }

        if (justCollapsedRef.current) {
            const viewport = viewportRef.current;
            if (!viewport) {
                centerRow();
                return;
            }
            const onTransitionEnd = (e: TransitionEvent) => {
                if (e.propertyName === "max-height") {
                    centerRow();
                    viewport.removeEventListener("transitionend", onTransitionEnd);
                }
            };
            viewport.addEventListener("transitionend", onTransitionEnd);
            return () => viewport.removeEventListener("transitionend", onTransitionEnd);
        } else {
            centerRow();
        }
    }, [focusedIndex, expanded]);

    /* ---- Toggle handler ---- */
    function toggle() {
        setExpanded((prev) => {
            if (prev) {
                justCollapsedRef.current = true;
                setAnimationOrigin(null);
            } else {
                setAnimationOrigin(focusedIndex);
            }
            return !prev;
        });
    }

    /* ---- Row keyboard nav ---- */
    function handleRowKeyDown(e: React.KeyboardEvent, index: number) {
        switch (e.key) {
            case "ArrowDown": {
                e.preventDefault();
                const next = Math.min(index + 1, rows.length - 1);
                setFocusedIndex(next);
                rowRefs.current.get(next)?.focus();
                handleSelect(rows[next].original);
                break;
            }
            case "ArrowUp": {
                e.preventDefault();
                const prev = Math.max(index - 1, 0);
                setFocusedIndex(prev);
                rowRefs.current.get(prev)?.focus();
                handleSelect(rows[prev].original);
                break;
            }
            case "Home": {
                e.preventDefault();
                setFocusedIndex(0);
                rowRefs.current.get(0)?.focus();
                handleSelect(rows[0].original);
                break;
            }
            case "End": {
                e.preventDefault();
                const last = rows.length - 1;
                setFocusedIndex(last);
                rowRefs.current.get(last)?.focus();
                handleSelect(rows[last].original);
                break;
            }
            case "Enter":
            case " ": {
                e.preventDefault();
                handleSelect(rows[index].original);
                break;
            }
            case "Escape": {
                e.preventDefault();
                if (expanded) setExpanded(false);
                break;
            }
        }
    }

    /* ---- Ref setter for rows ---- */
    function setRowRef(index: number, el: HTMLTableRowElement | null) {
        if (el) {
            rowRefs.current.set(index, el);
        } else {
            rowRefs.current.delete(index);
        }
    }

    /* ---- Render ---- */
    const maxHeightClass = expanded
        ? "max-h-[calc(100vh-200px)]"
        : "max-h-[160px]";

    return (
        <div
            className="relative w-full"
            data-testid="flow-picker"
            onKeyDown={(e) => {
                if (e.key === "Escape" && expanded) setExpanded(false);
            }}
        >
            {/* Scrollable table container */}
            <ScrollAreaRoot className="relative w-full">
                <ScrollAreaViewport
                    ref={viewportRef}
                    className={cn(
                        "transition-[max-height] duration-300 ease-in-out overflow-x-hidden",
                        !expanded && rows.length > COLLAPSED_ROWS && "flow-picker-scroll",
                        maxHeightClass,
                    )}
                >
                    <ScrollAreaContent>
                        <Table role="grid" aria-label="Flow picker" className="table-fixed">
                            <colgroup>
                                {table.getAllColumns().map((col) => (
                                    <col key={col.id} style={{ width: col.getSize() }} />
                                ))}
                            </colgroup>
                            {/* Headers visible only when expanded */}
                            {expanded && (
                                <TableHeader className="sticky top-0 z-10 bg-background">
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id} className="h-8">
                                            {headerGroup.headers.map((header) => (
                                                <TableHead
                                                    key={header.id}
                                                    className="h-8 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                                                >
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                              header.column.columnDef.header,
                                                              header.getContext(),
                                                          )}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                            )}

                            <TableBody>
                                {/* Top spacer for centered scrolling in collapsed mode */}
                                {!expanded && (
                                    <tr aria-hidden="true" className="border-0 pointer-events-none">
                                        <td colSpan={flowPickerColumns.length} className="h-16 p-0 border-0" />
                                    </tr>
                                )}

                                {rows.map((row, index) => {
                                    const isSelected = activeId === row.original.id;
                                    const halfVisible = Math.floor(COLLAPSED_ROWS / 2);
                                    const origin = animationOrigin ?? focusedIndex;
                                    const shouldAnimate = expanded && animationOrigin !== null && Math.abs(index - origin) > halfVisible;
                                    const distanceFromView = Math.abs(index - origin) - halfVisible;

                                    const sharedProps = {
                                        ref: (el: HTMLTableRowElement | null) => setRowRef(index, el),
                                        "data-state": isSelected ? ("selected" as const) : undefined,
                                        tabIndex: index === focusedIndex ? (0 as const) : (-1 as const),
                                        role: "row" as const,
                                        "aria-selected": isSelected,
                                        className: cn(
                                            "h-8 cursor-pointer border-b border-border",
                                            isSelected
                                                ? "bg-accent/12 data-[state=selected]:bg-accent/12 border-l-3 border-l-accent opacity-100!"
                                                : "opacity-85",
                                        ),
                                        onClick: () => handleSelect(row.original),
                                        onKeyDown: (e: React.KeyboardEvent) => handleRowKeyDown(e, index),
                                        onFocus: () => setFocusedIndex(index),
                                    };

                                    const cells = row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className="py-1.5 px-3 align-middle"
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ));

                                    if (shouldAnimate) {
                                        return (
                                            <MotionTableRow
                                                key={row.id}
                                                initial={{ opacity: 0, y: index < origin ? -4 : 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                    delay: Math.max(0, distanceFromView) * 0.01,
                                                    duration: 0.1,
                                                    ease: "easeOut",
                                                }}
                                                {...sharedProps}
                                            >
                                                {cells}
                                            </MotionTableRow>
                                        );
                                    }

                                    return (
                                        <TableRow key={row.id} {...sharedProps}>
                                            {cells}
                                        </TableRow>
                                    );
                                })}

                                {/* Bottom spacer for centered scrolling in collapsed mode */}
                                {!expanded && (
                                    <tr aria-hidden="true" className="border-0 pointer-events-none">
                                        <td colSpan={flowPickerColumns.length} className="h-16 p-0 border-0" />
                                    </tr>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollAreaContent>
                </ScrollAreaViewport>
                {expanded && <ScrollBar />}
                <ScrollAreaCorner />
            </ScrollAreaRoot>

            {/* Expand/collapse toggle */}
            {rows.length > COLLAPSED_ROWS && (
                <button
                    type="button"
                    onClick={toggle}
                    aria-label={expanded ? "Collapse flow list" : "Expand flow list"}
                    title={expanded ? "Collapse" : "Expand"}
                    className={cn(
                        "absolute bottom-1 left-1 z-10",
                        "flex items-center justify-center",
                        "size-7 rounded-md",
                        "bg-secondary/80 hover:bg-secondary",
                        "text-muted-foreground hover:text-foreground",
                        "transition-colors duration-150",
                        "cursor-pointer",
                    )}
                    data-testid="flow-picker-toggle"
                >
                    {expanded ? (
                        <CaretDoubleUp className="size-4" />
                    ) : (
                        <CaretDoubleDown className="size-4" />
                    )}
                </button>
            )}
        </div>
    );
}
