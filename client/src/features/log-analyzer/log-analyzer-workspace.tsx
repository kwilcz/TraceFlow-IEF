import { QueryControls } from "@/features/log-analyzer/query-controls.tsx";
import { FlowSelectionPanel } from "@/features/log-analyzer/flow-selection";

/** Props for the {@link LogAnalyzerWorkspace} component. */
export type LogAnalyzerWorkspaceProps = {
    /** Opens the credentials dialog so the user can change connection settings. */
    onOpenSettings: () => void;
};

/**
 * Connected workspace view for the log analyzer.
 *
 * Renders query controls with the flow selection panel, and (in future phases)
 * the log table, flow viewer, and trace debugger.
 * Assumes credentials have already been validated.
 */
export const LogAnalyzerWorkspace = ({ onOpenSettings }: LogAnalyzerWorkspaceProps) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen-navbar gap-8 px-4 py-8">
            <QueryControls onOpenSettings={onOpenSettings}>
                <FlowSelectionPanel />
            </QueryControls>
        </div>
    );
};
