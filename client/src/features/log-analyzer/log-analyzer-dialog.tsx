import { EnvironmentManagerDialog } from "@/features/log-analyzer/environment-manager-dialog";

/** Props for the {@link LogAnalyzerDialog} component. */
export type LogAnalyzerDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Called after an environment save makes credentials available to the route. */
    onConnect: (credentials: { applicationId: string; apiKey: string }) => void;
};

export const LogAnalyzerDialog = ({
    open,
    onOpenChange,
    onConnect,
}: LogAnalyzerDialogProps) => {
    return (
        <EnvironmentManagerDialog
            open={open}
            onOpenChange={onOpenChange}
            onSave={onConnect}
        />
    );
};
