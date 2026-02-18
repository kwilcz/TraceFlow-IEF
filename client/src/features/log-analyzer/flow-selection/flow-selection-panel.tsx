import { useCallback } from "react";
import type { UserFlow } from "@/types/trace";
import { useLogStore } from "@/stores/log-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { usePanelCollapse } from "./use-panel-collapse";
import { FlowSelectionSummary } from "./flow-selection-summary";
import { FlowSelectionTable } from "./flow-selection-table";
import { FlowSelectionLoading, FlowSelectionNoLogs, FlowSelectionNoFlows } from "./flow-selection-empty-states";

/**
 * Top-level orchestrator for the flow-selection feature.
 *
 * Reads directly from the Zustand log store, determines the current
 * display mode (loading / no-logs / normal), and renders the
 * appropriate child component. Takes **no props**.
 */
export function FlowSelectionPanel() {
    const { userFlows, selectedFlow, selectFlow, isLoading, logs } = useLogStore(
        useShallow((state) => ({
            userFlows: state.userFlows,
            selectedFlow: state.selectedFlow,
            selectFlow: state.selectFlow,
            isLoading: state.isLoading,
            logs: state.logs,
        })),
    );

    const [collapseState, dispatchCollapse] = usePanelCollapse();

    const handleSelectFlow = useCallback(
        (flow: UserFlow) => {
            selectFlow(flow);
            dispatchCollapse({ type: "auto-collapse" });
        },
        [selectFlow, dispatchCollapse],
    );

    const handleToggle = useCallback(
        () => dispatchCollapse({ type: "manual-toggle" }),
        [dispatchCollapse],
    );

    /* ---- Display-mode branching ---- */

    if (isLoading) {
        return <FlowSelectionLoading />;
    }

    if (logs.length === 0) {
        return <FlowSelectionNoLogs />;
    }

    if (userFlows.length === 0) {
        return <FlowSelectionNoFlows />;
    }

    /* ---- Normal mode ---- */

    return (
        <div
            data-testid="available-flows-panel"
            data-state={collapseState.expanded ? "expanded" : "collapsed"}
        >
            <FlowSelectionSummary
                selectedFlow={selectedFlow}
                expanded={collapseState.expanded}
                onToggle={() => dispatchCollapse({ type: "manual-toggle" })}
            />

            {/* CSS grid animation wrapper — table stays in the DOM even when collapsed */}
            <div
                className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    collapseState.expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
            >
                <div className="overflow-hidden min-h-0">
                    <FlowSelectionTable
                        userFlows={userFlows}
                        selectedFlow={selectedFlow}
                        onSelectFlow={handleSelectFlow}
                    />
                </div>
            </div>
        </div>
    );
}
