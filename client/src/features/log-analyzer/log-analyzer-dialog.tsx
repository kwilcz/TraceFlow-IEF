import React from "react";
import * as dialog from "@/components/ui/dialog.tsx";
import { GearIcon } from "@phosphor-icons/react";
import {
    CredentialsForm,
    type CredentialsSubmitPayload,
} from "@/features/log-analyzer/credentials-form.tsx";
import { useCredentialPersistence } from "@/hooks/use-credential-persistence";
import { useLogStore } from "@/stores/log-store";
import { LOG_LIMITS } from "@/constants/log-analyzer.constants";
import { mapAppInsightsAuthError } from "@/lib/api/app-insights-auth-error";

/** Default timespan used for the initial import-on-connect validation fetch. */
const CONNECT_VALIDATION_TIMESPAN = "PT30M";

/** Props for the {@link LogAnalyzerDialog} component. */
export type LogAnalyzerDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Called after credentials are validated via a successful fetchLogs call. */
    onConnect: (credentials: { applicationId: string; apiKey: string }) => void;
};

type SubmitState = {
    isSubmitting: boolean;
    error: string | null;
};

type SubmitAction =
    | { type: "submit-start" }
    | { type: "submit-failed"; error: string }
    | { type: "submit-finished" }
    | { type: "reset" };

const initialSubmitState: SubmitState = {
    isSubmitting: false,
    error: null,
};

const submitStateReducer = (
    state: SubmitState,
    action: SubmitAction,
): SubmitState => {
    switch (action.type) {
        case "submit-start":
            return {
                isSubmitting: true,
                error: null,
            };
        case "submit-failed":
            return {
                isSubmitting: false,
                error: action.error,
            };
        case "submit-finished":
        case "reset":
            return initialSubmitState;
        default:
            return state;
    }
};

/**
 * Connection settings dialog for Application Insights.
 *
 * On submit the dialog triggers a validation fetch (import-on-connect) using
 * default query parameters. It stays open while the fetch runs and shows any
 * error inline. On success it persists credentials and closes.
 */
export const LogAnalyzerDialog = ({
    open,
    onOpenChange,
    onConnect,
}: LogAnalyzerDialogProps) => {
    const { shouldSave, loadCredentials, saveCredentials, togglePersistence } =
        useCredentialPersistence();
    const fetchLogs = useLogStore((state) => state.fetchLogs);
    const [submitState, dispatchSubmitAction] = React.useReducer(
        submitStateReducer,
        initialSubmitState,
    );

    // Compute initial values from storage on each open — no useEffect needed.
    // loadCredentials is a stable module-level function.
    const initial = open ? loadCredentials() : null;

    const formKey = open ? "open" : "closed";

    /**
     * Import-on-connect: persist credentials, trigger fetchLogs to validate
     * them and pre-populate workspace data, then close on success.
     */
    const handleSubmit = async ({ applicationId, apiKey, persistCredentials }: CredentialsSubmitPayload) => {
        dispatchSubmitAction({ type: "submit-start" });

        const trimmedApplicationId = applicationId.trim();
        const trimmedApiKey = apiKey.trim();

        saveCredentials({ applicationId: trimmedApplicationId, apiKey: trimmedApiKey }, persistCredentials);

        try {
            await fetchLogs({
                applicationId: trimmedApplicationId,
                apiKey: trimmedApiKey,
                maxRows: LOG_LIMITS.DEFAULT_ROWS,
                timespan: CONNECT_VALIDATION_TIMESPAN,
            });
        } catch (error) {
            dispatchSubmitAction({
                type: "submit-failed",
                error: mapAppInsightsAuthError(error),
            });
            return;
        }

        const storeError = useLogStore.getState().error;

        if (storeError) {
            dispatchSubmitAction({
                type: "submit-failed",
                error: mapAppInsightsAuthError(storeError),
            });
            return;
        }

        dispatchSubmitAction({ type: "submit-finished" });
        onConnect({ applicationId: trimmedApplicationId, apiKey: trimmedApiKey });
        onOpenChange(false);
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            dispatchSubmitAction({ type: "reset" });
        }

        onOpenChange(nextOpen);
    };

    /** Toggle is authoritative — clearing fires immediately. */
    const handlePersistenceToggle = (persist: boolean) => {
        togglePersistence(persist);
    };

    return (
        <dialog.Dialog open={open} onOpenChange={handleOpenChange}>
            <dialog.DialogContent className="gap-4">
                <dialog.DialogHeader className="flex flex-row items-center-safe text-end">
                    <GearIcon className="mb-px" />
                    <dialog.DialogTitle>Connection Settings</dialog.DialogTitle>
                </dialog.DialogHeader>
                <div>
                    <CredentialsForm
                        key={formKey}
                        onSubmit={handleSubmit}
                        onPersistenceToggle={handlePersistenceToggle}
                        initialApplicationId={initial?.applicationId ?? ""}
                        initialApiKey={initial?.apiKey ?? ""}
                        initialPersistCredentials={shouldSave}
                        isSubmitting={submitState.isSubmitting}
                        error={submitState.error}
                    />
                </div>
            </dialog.DialogContent>
        </dialog.Dialog>
    );
};