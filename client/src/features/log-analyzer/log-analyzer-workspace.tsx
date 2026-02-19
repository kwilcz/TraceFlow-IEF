import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useLogStore } from "@/stores/log-store";
import type { UserFlow } from "@/types/trace";
import { QueryControls } from "@/features/log-analyzer/query-controls.tsx";
import { FlowSelectionPanel, FlowSelectionSummary } from "@/features/log-analyzer/flow-selection";
import { FlowSelectionLoading, FlowSelectionNoLogs, FlowSelectionNoFlows } from "@/features/log-analyzer/flow-selection/flow-selection-empty-states";
import { usePanelCollapse } from "@/features/log-analyzer/flow-selection/use-panel-collapse";
import * as card from "@/components/ui/card";

/** Props for the {@link LogAnalyzerWorkspace} component. */
export type LogAnalyzerWorkspaceProps = {
    /** Opens the credentials dialog so the user can change connection settings. */
    onOpenSettings: () => void;
};

/**
 * Connected workspace view for the log analyzer.
 *
 * Orchestrates the sticky query bar + summary and the flow selection table.
 * Reads from the Zustand log store and manages panel collapse state.
 */
export const LogAnalyzerWorkspace = ({ onOpenSettings }: LogAnalyzerWorkspaceProps) => {
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

    /* ---- Determine display mode ---- */
    const isNormalMode = !isLoading && logs.length > 0 && userFlows.length > 0;

    return (
        <div className="flex flex-col items-center min-h-screen-navbar gap-2 sm:gap-4 px-2 sm:px-4 ">
            {/* Sticky search bar + summary */}
            <div className="sticky top-0 z-10 w-full max-w-full lg:max-w-[75vw]">
                <QueryControls onOpenSettings={onOpenSettings}>
                    {isNormalMode && (
                        <div
                            data-testid="available-flows-panel"
                            data-state={collapseState.expanded ? "expanded" : "collapsed"}
                        >
                            <FlowSelectionSummary
                                selectedFlow={selectedFlow}
                                expanded={collapseState.expanded}
                                onToggle={handleToggle}
                            />
                        </div>
                    )}
                </QueryControls>
            </div>

            {/* Content area: empty states OR table card */}
            {isLoading && (
                <card.Card className="w-full">
                    <card.CardContent>
                        <FlowSelectionLoading />
                    </card.CardContent>
                </card.Card>
            )}

            {!isLoading && logs.length === 0 && <FlowSelectionNoLogs />}

            {!isLoading && logs.length > 0 && userFlows.length === 0 && (
                <card.Card className="w-full">
                    <card.CardContent>
                        <FlowSelectionNoFlows />
                    </card.CardContent>
                </card.Card>
            )}

            {isNormalMode && collapseState.expanded && (
                <FlowSelectionPanel
                    userFlows={userFlows}
                    selectedFlow={selectedFlow}
                    onSelectFlow={handleSelectFlow}
                />
            )}
        </div>
    );
};
