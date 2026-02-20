import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useLogStore } from "@/stores/log-store";
import type { UserFlow } from "@/types/trace";
import { QueryControls } from "@/features/log-analyzer/query-controls.tsx";
import { FlowPicker, FlowPickerLoading, FlowPickerNoLogs, FlowPickerNoFlows } from "@/features/log-analyzer/flow-picker";
import { DebuggerWorkspace } from "@/features/log-analyzer/debugger";
import { cn } from "@/lib/utils";
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
    const { userFlows, selectedFlow, selectFlow, isLoading, logs, traceSteps, traceLoading } = useLogStore(
        useShallow((state) => ({
            userFlows: state.userFlows,
            selectedFlow: state.selectedFlow,
            selectFlow: state.selectFlow,
            isLoading: state.isLoading,
            logs: state.logs,
            traceSteps: state.traceSteps,
            traceLoading: state.traceLoading,
        })),
    );

    const handleSelectFlow = useCallback(
        (flow: UserFlow) => {
            selectFlow(flow);
        },
        [selectFlow],
    );

    /* ---- Determine display mode ---- */
    const isNormalMode = !isLoading && logs.length > 0 && userFlows.length > 0;
    const showDebugger = selectedFlow !== null && (traceSteps.length > 0 || traceLoading);

    return (
        <div
            className={cn(
                "flex flex-col items-center gap-2 sm:gap-4 px-2 sm:px-4",
                showDebugger
                    ? "h-screen-navbar overflow-hidden"
                    : "min-h-screen-navbar",
            )}
        >
            {/* Sticky search bar */}
            <div className="sticky top-0 z-10 w-full max-w-full lg:max-w-[75vw] shrink-0">
                <QueryControls onOpenSettings={onOpenSettings} />
            </div>

            {/* Content area: empty states OR table card */}
            {isLoading && (
                <card.Card className="w-full">
                    <card.CardContent>
                        <FlowPickerLoading />
                    </card.CardContent>
                </card.Card>
            )}

            {!isLoading && logs.length === 0 && (
                <card.Card className="w-full">
                    <card.CardContent>
                        <FlowPickerNoLogs />
                    </card.CardContent>
                </card.Card>
            )}

            {!isLoading && logs.length > 0 && userFlows.length === 0 && (
                <card.Card className="w-full">
                    <card.CardContent>
                        <FlowPickerNoFlows />
                    </card.CardContent>
                </card.Card>
            )}

            {isNormalMode && (
                <FlowPicker
                    userFlows={userFlows}
                    selectedFlow={selectedFlow}
                    onSelectFlow={handleSelectFlow}
                />
            )}

            {showDebugger && <DebuggerWorkspace />}
        </div>
    );
};
