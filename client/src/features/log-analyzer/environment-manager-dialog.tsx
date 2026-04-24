import React from "react";
import * as alert from "@/components/ui/alert";
import * as dialog from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { validateGuid } from "@/lib/validators/log-validators";
import { useCredentialPersistence } from "@/hooks/use-credential-persistence";
import { useLogStore } from "@/stores/log-store";
import type { LogCredentialAuthType, LogCredentialEnvironment } from "@/types/logs";
import { EnvironmentFormFields, type EnvironmentDraft } from "@/features/log-analyzer/environment-form-fields";
import { EnvironmentListPane } from "@/features/log-analyzer/environment-list-pane";
import { validateAppInsightsCredentials } from "@/features/log-analyzer/services/credential-validation-service";

type EnvironmentManagerDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (credentials: { applicationId: string; apiKey: string }) => void;
};

const APP_INSIGHTS_AUTH_TYPE: LogCredentialAuthType = "app-insights";

const createEnvironmentId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `env-${Date.now()}`;

const createDraftFromEnvironment = (
    environment?: LogCredentialEnvironment | null,
): EnvironmentDraft => ({
    id: environment?.id ?? createEnvironmentId(),
    name: environment?.name ?? "",
    authType: APP_INSIGHTS_AUTH_TYPE,
    applicationId: environment?.applicationId ?? "",
    apiKey: environment?.apiKey ?? "",
    persist: environment?.persist ?? false,
});

const resolveInitialSelection = (
    environments: LogCredentialEnvironment[],
    activeEnvironmentId: string | null,
) => {
    const selected =
        environments.find((environment) => environment.id === activeEnvironmentId) ??
        environments[0] ??
        null;

    return {
        selectedEnvironmentId: selected?.id ?? null,
        draft: createDraftFromEnvironment(selected),
    };
};

const validateDraft = (draft: EnvironmentDraft) => {
    if (!draft.name.trim()) {
        return "Display Name is required.";
    }

    if (!validateGuid(draft.applicationId.trim())) {
        return "Application ID must be a GUID.";
    }

    if (!draft.apiKey.trim()) {
        return "API Key is required.";
    }

    return null;
};

export const EnvironmentManagerDialog = ({
    open,
    onOpenChange,
    onSave,
}: EnvironmentManagerDialogProps) => {
    const {
        loadCredentialEnvironments,
        saveCredentialEnvironment,
        deleteCredentialEnvironment,
    } = useCredentialPersistence();
    const credentialEnvironments = useLogStore((state) => state.credentialEnvironments);
    const activeEnvironmentId = useLogStore((state) => state.activeEnvironmentId);
    const setCredentialEnvironments = useLogStore((state) => state.setCredentialEnvironments);
    const storedEnvironments = React.useMemo(
        () => (credentialEnvironments.length > 0 ? null : loadCredentialEnvironments()),
        [credentialEnvironments, loadCredentialEnvironments],
    );
    const environments = React.useMemo(
        () => credentialEnvironments.length > 0 ? credentialEnvironments : storedEnvironments?.environments ?? [],
        [credentialEnvironments, storedEnvironments],
    );
    const resolvedActiveEnvironmentId = activeEnvironmentId ?? storedEnvironments?.activeEnvironmentId ?? null;

    const [selectedEnvironmentId, setSelectedEnvironmentId] = React.useState<string | null>(null);
    const [draft, setDraft] = React.useState<EnvironmentDraft>(() =>
        createDraftFromEnvironment(),
    );
    const [error, setError] = React.useState<{
        title: string;
        description: string;
    } | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const hasSavedEnvironments = environments.length > 0;

    const handleOpenChange = React.useCallback((nextOpen: boolean) => {
        if (isSaving) {
            return;
        }

        onOpenChange(nextOpen);
    }, [isSaving, onOpenChange]);

    React.useEffect(() => {
        if (!open) {
            return;
        }

        const initialSelection = resolveInitialSelection(
            environments,
            resolvedActiveEnvironmentId,
        );

        setSelectedEnvironmentId(initialSelection.selectedEnvironmentId);
        setDraft(initialSelection.draft);
        setError(null);
    }, [environments, open, resolvedActiveEnvironmentId]);

    const handleFieldChange = <K extends keyof EnvironmentDraft>(
        field: K,
        value: EnvironmentDraft[K],
    ) => {
        if (isSaving) {
            return;
        }

        setError(null);
        setDraft((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const handleSelectEnvironment = (environmentId: string) => {
        if (isSaving) {
            return;
        }

        const environment = environments.find(
            (candidate) => candidate.id === environmentId,
        );

        if (!environment) {
            return;
        }

        setSelectedEnvironmentId(environmentId);
        setDraft(createDraftFromEnvironment(environment));
        setError(null);
    };

    const handleAddEnvironment = () => {
        if (isSaving) {
            return;
        }

        setSelectedEnvironmentId(null);
        setDraft(createDraftFromEnvironment());
        setError(null);
    };

    const handleSave = async () => {
        const validationError = validateDraft(draft);
        if (validationError) {
            setError({
                title: "Unable to save",
                description: validationError,
            });
            return;
        }

        const nextEnvironment: LogCredentialEnvironment = {
            id: draft.id,
            name: draft.name.trim(),
            authType: APP_INSIGHTS_AUTH_TYPE,
            applicationId: draft.applicationId.trim(),
            apiKey: draft.apiKey.trim(),
            persist: draft.persist,
        };

        setIsSaving(true);

        try {
            await validateAppInsightsCredentials({
                applicationId: nextEnvironment.applicationId,
                apiKey: nextEnvironment.apiKey,
            });
        } catch (verificationError) {
            setError({
                title: "Unable to verify credentials",
                description:
                    verificationError instanceof Error
                        ? verificationError.message
                        : "Unable to verify credentials.",
            });
            setIsSaving(false);
            return;
        }

        try {
            saveCredentialEnvironment(nextEnvironment);

            const stored = loadCredentialEnvironments();
            setCredentialEnvironments(stored);
            setSelectedEnvironmentId(nextEnvironment.id);
            setDraft(createDraftFromEnvironment(nextEnvironment));
            setError(null);
            onSave({
                applicationId: nextEnvironment.applicationId,
                apiKey: nextEnvironment.apiKey,
            });
            onOpenChange(false);
        } catch (saveError) {
            setError({
                title: "Unable to save",
                description:
                    saveError instanceof Error
                        ? saveError.message
                        : "Unable to save.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        if (!selectedEnvironmentId || isSaving) {
            return;
        }

        deleteCredentialEnvironment(selectedEnvironmentId);

        const stored = loadCredentialEnvironments();
        setCredentialEnvironments(stored);
        setError(null);
        handleOpenChange(false);
    };

    return (
        <dialog.Dialog open={open} onOpenChange={handleOpenChange}>
            <dialog.DialogContent className="max-w-4xl gap-4" showCloseButton={!isSaving}>
                <dialog.DialogHeader>
                    <dialog.DialogTitle>Manage Environments</dialog.DialogTitle>
                    {!hasSavedEnvironments ? (
                        <dialog.DialogDescription>
                            Create your first environment.
                        </dialog.DialogDescription>
                    ) : null}
                </dialog.DialogHeader>

                {error ? (
                    <alert.Root variant="destructive">
                        <alert.Title>{error.title}</alert.Title>
                        <alert.Description>{error.description}</alert.Description>
                    </alert.Root>
                ) : null}

                <div className="flex flex-col gap-4 md:flex-row">
                    {hasSavedEnvironments ? (
                        <>
                            <div className="md:w-72 md:flex-none">
                                <EnvironmentListPane
                                    environments={environments}
                                    selectedEnvironmentId={selectedEnvironmentId}
                                    activeEnvironmentId={resolvedActiveEnvironmentId}
                                    onSelectEnvironment={handleSelectEnvironment}
                                    onAddEnvironment={handleAddEnvironment}
                                    disabled={isSaving}
                                />
                            </div>

                            <Separator className="md:hidden" />
                            <Separator orientation="vertical" className="hidden md:block" />
                        </>
                    ) : null}

                    <div className="min-w-0 flex-1">
                        <EnvironmentFormFields
                            draft={draft}
                            onChange={handleFieldChange}
                            disabled={isSaving}
                        />
                    </div>
                </div>

                <dialog.DialogFooter>
                    {selectedEnvironmentId ? (
                        <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
                            Delete
                        </Button>
                    ) : null}
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={() => void handleSave()} disabled={isSaving}>
                        {isSaving ? "Verifying..." : "Save"}
                    </Button>
                </dialog.DialogFooter>
            </dialog.DialogContent>
        </dialog.Dialog>
    );
};
