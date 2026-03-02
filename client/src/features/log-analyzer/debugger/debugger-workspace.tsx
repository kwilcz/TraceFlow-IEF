import { useEffect } from "react";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { useLogStore } from "@/stores/log-store";
import { getStepPosition } from "@/lib/trace/domain/flow-node-utils";
import { DebuggerProvider, useDebuggerContext } from "./debugger-context";
import { InspectorPanel } from "./inspector-panel";
import { JourneyTree } from "./journey-tree/journey-tree";
import { BottomPanel } from "./bottom-panel";
import { useResizer } from "./use-resizer";

// ============================================================================
// Selection ↔ LogStore sync
// ============================================================================

/**
 * Null-rendering component that keeps `LogStore.activeStepIndex` in sync
 * with the debugger's selection state.
 */
function SelectionSync() {
    const { selection } = useDebuggerContext();
    const flowTree = useLogStore((s) => s.flowTree);
    const setActiveStep = useLogStore((s) => s.setActiveStep);

    useEffect(() => {
        if (!selection?.nodeId || !flowTree) {
            setActiveStep(null);
            return;
        }
        const position = getStepPosition(flowTree, selection.nodeId);
        setActiveStep(position >= 0 ? position : null);
    }, [selection?.nodeId, flowTree, setActiveStep]);

    return null;
}

// ============================================================================
// Debugger Workspace Shell
// ============================================================================

/**
 * Two-row debugger workspace with resizable vertical split.
 *
 * **Layout** (CSS custom-property driven):
 * - Top row (default 60 %):  JourneyTree (~35 %) | InspectorPanel (~65 %)
 * - Horizontal resizer       (6 px drag handle, ARIA separator)
 * - Bottom row (default 40 %): StatebagPanel (Phase 3 → ClaimsDiffTable)
 *
 * The split ratio is persisted to localStorage and exposed via the
 * `--split-ratio` CSS custom property on the container.
 */
export function DebuggerWorkspace() {
    const traceLoading = useLogStore((s) => s.traceLoading);
    const { splitRatio, resizerProps, containerRef } = useResizer();

    const topBasis = `calc(var(--split-ratio) * 100%)`;
    const bottomBasis = `calc((1 - var(--split-ratio)) * 100%)`;

    return (
        <DebuggerProvider>
            <SelectionSync />

            {/* Vertical split container */}
            <div
                ref={containerRef}
                className="flex flex-col flex-1 min-h-0 w-full relative"
            >
                {traceLoading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <SpinnerGapIcon className="size-4 animate-spin" />
                            <span>Computing trace…</span>
                        </div>
                    </div>
                )}
                {/* ── Top row: Tree + Inspector ─────────────────────── */}
                <div
                    className="flex flex-row min-h-0 overflow-hidden"
                    style={{ flexBasis: topBasis }}
                >
                    {/* Left: Journey Tree (~35 %) */}
                    <aside className="basis-[35%] shrink-0 overflow-y-auto border-r border-border">
                        <JourneyTree />
                    </aside>

                    {/* Right: Inspector (~65 %) */}
                    <main className="flex-1 min-w-0 overflow-y-auto">
                        <InspectorPanel />
                    </main>
                </div>

                {/* ── Horizontal Resizer ────────────────────────────── */}
                <div
                    {...resizerProps}
                    className="h-1.5 shrink-0 cursor-row-resize select-none touch-action-none bg-border hover:bg-accent transition-colors"
                    data-testid="workspace-resizer"
                />

                {/* ── Bottom row: Tabbed panel (Claims Diff + Raw Log) */}
                <div
                    className="min-h-0 overflow-hidden"
                    style={{ flexBasis: bottomBasis }}
                >
                    <BottomPanel />
                </div>
            </div>
        </DebuggerProvider>
    );
}
