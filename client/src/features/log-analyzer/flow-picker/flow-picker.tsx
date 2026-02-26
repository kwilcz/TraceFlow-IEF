import { CaretDoubleDownIcon, CaretDoubleUpIcon } from "@phosphor-icons/react";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { animate, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
    ScrollAreaContent,
    ScrollAreaCorner,
    ScrollAreaRoot,
    ScrollAreaViewport,
    ScrollBar,
} from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { UserFlow } from "@/types/trace";
import { flowPickerColumns } from "./flow-picker-columns";

// Create Motion component outside render loop
const MotionTableRow = motion.create(TableRow);

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const ROW_HEIGHT = 32;
const COLLAPSED_ROWS = 5;
const CYLINDER_SIZE = 200;
const COLLAPSED_CENTER_OFFSET = 64; // Distance from top to the "active" row

// Pure math for wheel geometry:
const CYLINDER_RADIUS = CYLINDER_SIZE;
const ITEM_ANGLE = (2 * Math.atan(ROW_HEIGHT / 2 / CYLINDER_RADIUS) * 180) / Math.PI;
const CENTER_ZOOM_MAX = 1.01;
const CENTER_ZOOM_RANGE_ROWS = 1.01;

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
    const tbodyRef = useRef<HTMLTableSectionElement>(null); // Ref for perspective correction
    const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

    const hasAutoSelected = useRef(false);
    const [animationOrigin, setAnimationOrigin] = useState<number | null>(null);

    const activeId = selectedFlow?.id ?? null;
    const lastInternalSelectedIdRef = useRef<string | null>(null);

    // Trackers for precision "magnetic" scrolling
    const wheelAccumRef = useRef(0);
    const targetScrollIndexRef = useRef(0);
    const scrollAnimationRef = useRef<ReturnType<typeof animate> | null>(null);

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

    const getRowPitch = useCallback(() => {
        const first = rowRefs.current.get(0);
        const second = rowRefs.current.get(1);

        if (first && second) {
            const measured = second.offsetTop - first.offsetTop;
            if (Number.isFinite(measured) && measured > 0) {
                return measured;
            }
        }

        return ROW_HEIGHT;
    }, []);

    /* ---- Strictly Locked Scroll Executor ---- */
    const scrollToRow = useCallback(
        (index: number, isExpandedMode: boolean, behavior: ScrollBehavior = "smooth") => {
            const viewport = viewportRef.current;
            if (!viewport) return;

            targetScrollIndexRef.current = index;

            if (isExpandedMode) {
                rowRefs.current.get(index)?.scrollIntoView({ block: "nearest", behavior });
            } else {
                const rowTop = rowRefs.current.get(index)?.offsetTop;
                const targetTop =
                    rowTop !== undefined ? Math.max(0, rowTop - COLLAPSED_CENTER_OFFSET) : index * getRowPitch();

                scrollAnimationRef.current?.stop();
                scrollAnimationRef.current = null;

                if (behavior === "instant") {
                    viewport.scrollTop = targetTop;
                    return;
                }

                scrollAnimationRef.current = animate(viewport.scrollTop, targetTop, {
                    duration: 0.2,
                    ease: "easeOut",
                    onUpdate: (latest) => {
                        viewport.scrollTop = latest;
                    },
                    onComplete: () => {
                        scrollAnimationRef.current = null;
                    },
                });
            }
        },
        [getRowPitch],
    );

    useEffect(() => {
        return () => {
            scrollAnimationRef.current?.stop();
            scrollAnimationRef.current = null;
        };
    }, []);

    /* ---- Initial Auto-select & External Sync ---- */
    const prevFlowsRef = useRef(userFlows);
    if (prevFlowsRef.current !== userFlows) {
        prevFlowsRef.current = userFlows;
        hasAutoSelected.current = false;
    }

    useEffect(() => {
        if (!hasAutoSelected.current && !expanded && rows.length > 0 && selectedFlow === null) {
            hasAutoSelected.current = true;
            lastInternalSelectedIdRef.current = rows[0].original.id;
            onSelectFlow(rows[0].original);
        }
    }, [rows, expanded, selectedFlow, onSelectFlow]);

    useEffect(() => {
        if (activeId && activeId !== lastInternalSelectedIdRef.current) {
            const idx = rows.findIndex((r) => r.original.id === activeId);
            if (idx >= 0) {
                setFocusedIndex(idx);
                targetScrollIndexRef.current = idx;
                scrollToRow(idx, expanded, "smooth");
            }
            lastInternalSelectedIdRef.current = activeId;
        }
    }, [activeId, rows, expanded, scrollToRow]);

    /* ---- Layout Shift Sync ---- */
    const prevExpandedRef = useRef(expanded);
    useEffect(() => {
        if (prevExpandedRef.current !== expanded) {
            prevExpandedRef.current = expanded;
            const idx = rows.findIndex((r) => r.original.id === activeId);
            if (idx >= 0) {
                scrollToRow(idx, expanded, "instant");
            }
        }
    }, [expanded, activeId, rows, scrollToRow]);

    /* ---- Zero-Render DOM Animation Loop for 3D Wheel Projection ---- */
    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        if (expanded) {
            // Reset styles when expanded
            rowRefs.current.forEach((el) => {
                el.style.transform = "";
                el.style.opacity = "";
                el.style.pointerEvents = "";
                el.style.willChange = "";
                el.style.backfaceVisibility = "";
            });
            if (tbodyRef.current) {
                tbodyRef.current.style.perspectiveOrigin = "";
            }
            return;
        }

        const applyProjection = () => {
            const sy = viewport.scrollTop;
            const rowPitch = getRowPitch();

            // FIXED: Move the perspective origin to match the scroll position.
            // This ensures the "camera" stays centered on the viewport, regardless of
            // how tall the total table content is.
            if (tbodyRef.current) {
                // Calculate center of the *visible viewport* relative to the document
                // 64 (offset) + 16 (half row) = 80px from the top of the viewport
                const perspectiveY = sy + COLLAPSED_CENTER_OFFSET + ROW_HEIGHT / 2;
                tbodyRef.current.style.perspectiveOrigin = `50% ${perspectiveY}px`;
            }

            rowRefs.current.forEach((el) => {
                const distance = el.offsetTop - COLLAPSED_CENTER_OFFSET - sy;

                // Optimization: Hide rows far outside the cylinder curve
                if (Math.abs(distance) > rowPitch * 6) {
                    el.style.opacity = "0";
                    el.style.pointerEvents = "none";
                    return;
                }

                const degrees = (distance / rowPitch) * ITEM_ANGLE;
                const zoomRangePx = rowPitch * CENTER_ZOOM_RANGE_ROWS;
                const proximity = Math.max(0, 1 - Math.abs(distance) / zoomRangePx);
                const easedProximity = proximity * proximity;
                const scale = 1 + (CENTER_ZOOM_MAX - 1) * easedProximity;

                el.style.transform = `translateY(${-distance}px) translateZ(${-CYLINDER_RADIUS}px) rotateX(${-degrees}deg) translateZ(${CYLINDER_RADIUS}px) scale(${scale})`;
                el.style.opacity = Math.max(0, 1 - Math.abs(distance) / (rowPitch * 2.5)).toString();
                el.style.pointerEvents = "auto";
                el.style.willChange = "transform, opacity";
                el.style.backfaceVisibility = "hidden";
            });
        };

        viewport.addEventListener("scroll", applyProjection, { passive: true });
        // Run once on mount to set initial positions
        applyProjection();

        return () => {
            viewport.removeEventListener("scroll", applyProjection);
        };
    }, [expanded, rows.length, getRowPitch]);

    /* ---- Strictly 1-by-1 Magnetic Wheel Stepping ---- */
    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport || expanded) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();

            wheelAccumRef.current += e.deltaY;

            const threshold = 20;
            if (Math.abs(wheelAccumRef.current) >= threshold) {
                const direction = Math.sign(wheelAccumRef.current);
                wheelAccumRef.current = 0;

                const nextIdx = Math.max(0, Math.min(targetScrollIndexRef.current + direction, rows.length - 1));
                if (nextIdx !== targetScrollIndexRef.current) {
                    scrollToRow(nextIdx, false, "smooth");
                }
            }
        };

        viewport.addEventListener("wheel", onWheel, { passive: false });
        return () => viewport.removeEventListener("wheel", onWheel);
    }, [expanded, rows.length, scrollToRow]);

    /* ---- Native Scroll Hookup for Physics Tracking ---- */
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (expanded) return;

        const currentScroll = e.currentTarget.scrollTop;
        const rowPitch = getRowPitch();
        const index = Math.round(currentScroll / rowPitch);
        const validIndex = Math.max(0, Math.min(index, rows.length - 1));

        if (!scrollAnimationRef.current) {
            targetScrollIndexRef.current = validIndex;
        }

        if (validIndex !== focusedIndex) {
            setFocusedIndex(validIndex);
            const flow = rows[validIndex].original;
            lastInternalSelectedIdRef.current = flow.id;
            onSelectFlow(flow);
        }
    };

    /* ---- Handlers ---- */
    function toggle() {
        setExpanded((prev) => {
            setAnimationOrigin(prev ? null : focusedIndex);
            return !prev;
        });
    }

    function handleRowClick(index: number, flow: UserFlow) {
        lastInternalSelectedIdRef.current = flow.id;
        setFocusedIndex(index);
        onSelectFlow(flow);
        scrollToRow(index, expanded, "smooth");
    }

    function handleGlobalKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Escape" && expanded) {
            setExpanded(false);
            return;
        }

        const navKeys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"];
        if (navKeys.includes(e.key)) {
            e.preventDefault();

            let nextIndex = focusedIndex;
            switch (e.key) {
                case "ArrowDown":
                    nextIndex = Math.min(focusedIndex + 1, rows.length - 1);
                    break;
                case "ArrowUp":
                    nextIndex = Math.max(focusedIndex - 1, 0);
                    break;
                case "PageDown":
                    nextIndex = Math.min(focusedIndex + 5, rows.length - 1);
                    break;
                case "PageUp":
                    nextIndex = Math.max(focusedIndex - 5, 0);
                    break;
                case "Home":
                    nextIndex = 0;
                    break;
                case "End":
                    nextIndex = rows.length - 1;
                    break;
            }

            if (nextIndex !== focusedIndex) {
                setFocusedIndex(nextIndex);
                rowRefs.current.get(nextIndex)?.focus({ preventScroll: true });

                const flow = rows[nextIndex].original;
                lastInternalSelectedIdRef.current = flow.id;
                onSelectFlow(flow);
                scrollToRow(nextIndex, expanded, "smooth");
            }
        } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleRowClick(focusedIndex, rows[focusedIndex].original);
        }
    }

    /* ---- Render ---- */
    const sizeClasses = expanded ? "h-auto max-h-[calc(100vh-200px)]" : "h-[160px] min-h-[160px] max-h-[160px]";

    return (
        <div
            className="relative w-full outline-none"
            data-testid="flow-picker"
            onKeyDown={handleGlobalKeyDown}
            tabIndex={-1}
        >
            <ScrollAreaRoot className="relative w-full">
                {/* Fixed Non-moving highlight lens overlay */}
                {!expanded && rows.length > 0 && (
                    <div className="pointer-events-none absolute inset-x-0 top-[64px] z-0 h-[32px] border-l-3 border-l-accent bg-accent/12" />
                )}

                <ScrollAreaViewport
                    ref={viewportRef}
                    onScroll={handleScroll}
                    className={cn(
                        "relative z-10 transition-[max-height] duration-500 ease-in-out overflow-x-hidden",
                        sizeClasses,
                    )}
                >
                    <ScrollAreaContent>
                        <Table role="grid" aria-label="Flow picker" className="table-fixed">
                            <colgroup>
                                {table.getAllColumns().map((col) => (
                                    <col key={col.id} style={{ width: col.getSize() }} />
                                ))}
                            </colgroup>

                            {expanded && (
                                <TableHeader className="sticky top-0 z-10 bg-background border-b">
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id} className="h-8">
                                            {headerGroup.headers.map((header) => (
                                                <TableHead key={header.id} className="h-8 px-3 py-1.5 text-xs">
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

                            {/* ATTACHED TBODY REF HERE */}
                            <TableBody ref={tbodyRef} className="perspective-distant">
                                {/* Top spacer to allow to scroll to first item */}
                                {!expanded && (
                                    <tr
                                        aria-hidden="true"
                                        style={{ height: 64 }}
                                        className="pointer-events-none border-0"
                                    >
                                        <td colSpan={flowPickerColumns.length} className="p-0 border-0" />
                                    </tr>
                                )}

                                {rows.map((row, index) => {
                                    const isSelected = activeId === row.original.id;
                                    const isExpandedSelected = isSelected && expanded;

                                    const dynamicStyles: React.CSSProperties = {
                                        height: ROW_HEIGHT,
                                        transformOrigin: "center center",
                                        transformStyle: !expanded ? "preserve-3d" : undefined,
                                    };

                                    const sharedProps = {
                                        ref: (el: HTMLTableRowElement | null) => {
                                            if (el) rowRefs.current.set(index, el);
                                            else rowRefs.current.delete(index);
                                        },
                                        "data-state": expanded && isSelected ? ("selected" as const) : undefined,
                                        tabIndex: index === focusedIndex ? (0 as const) : (-1 as const),
                                        role: "row" as const,
                                        "aria-selected": isSelected,
                                        style: dynamicStyles,
                                        className: cn(
                                            "cursor-pointer box-border border-l-3 outline-none",
                                            !expanded && "snap-center",
                                            isExpandedSelected
                                                ? "bg-accent/12 border-l-accent"
                                                : "border-l-transparent",
                                        ),
                                        onClick: () => handleRowClick(index, row.original),
                                        onFocus: () => setFocusedIndex(index),
                                    };

                                    const cells = row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className="py-0 px-3 h-[32px] min-h-[32px] max-h-[32px] overflow-hidden align-middle"
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ));

                                    const origin = animationOrigin ?? focusedIndex;
                                    const shouldAnimateExpand =
                                        animationOrigin !== null &&
                                        Math.abs(index - origin) > Math.floor(COLLAPSED_ROWS / 2);

                                    if (shouldAnimateExpand) {
                                        return (
                                            <MotionTableRow
                                                key={row.id}
                                                initial={{ opacity: 0, y: index < origin ? -4 : 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.15, ease: "easeOut" }}
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

                                {/* Bottom spacer */}
                                {!expanded && (
                                    <tr
                                        aria-hidden="true"
                                        style={{ height: 64 }}
                                        className="pointer-events-none border-0"
                                    >
                                        <td colSpan={flowPickerColumns.length} className="p-0 border-0" />
                                    </tr>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollAreaContent>
                </ScrollAreaViewport>
                {expanded && <ScrollBar />}
                <ScrollAreaCorner />
            </ScrollAreaRoot>

            {rows.length > COLLAPSED_ROWS && (
                <Button
                    size="sm"
                    variant={"outline"}
                    onClick={toggle}
                    data-testid="flow-picker-toggle"
                    aria-label={expanded ? "Collapse flow list" : "Expand flow list"}
                    title={expanded ? "Collapse" : "Expand"}
                    className={cn(
                        "absolute bottom-0 left-1/2 transform -translate-x-1/2 z-10",
                        "bg-transparent backdrop-blur-sm rounded-full",
                    )}
                >
                    {expanded ? (
                        <>
                            <CaretDoubleUpIcon />
                            Collapse
                        </>
                    ) : (
                        <>
                            <CaretDoubleDownIcon />
                            Show All
                        </>
                    )}
                </Button>
            )}
        </div>
    );
}
