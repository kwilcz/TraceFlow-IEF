import * as dialog from "@/components/ui/dialog.tsx"
import {GearIcon} from "@phosphor-icons/react";
import {CredentialsForm} from "@/features/log-analyzer/credentials-form.tsx";

export type LogAnalyzerDialogProps = {
    /**
     * Controls whether the dialog is open or not
     */
    open: boolean
    onClosed?: () => void
    
}

export const LogAnalyzerDialog = ({open, onClosed}: LogAnalyzerDialogProps) => {
    return (
        <dialog.Dialog open={open} onOpenChange={onClosed}>
            <dialog.DialogContent className="gap-4">
                <dialog.DialogHeader className="flex flex-row items-center-safe text-end">
                    <GearIcon className={'mb-px'}/>

                    <dialog.DialogTitle>Connection Settings</dialog.DialogTitle>
                </dialog.DialogHeader>
                <div>
                    <CredentialsForm onSubmit={() => {}} />
                </div>
            </dialog.DialogContent>
        </dialog.Dialog>
    )
}