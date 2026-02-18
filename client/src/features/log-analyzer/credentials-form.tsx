import { Form } from "@base-ui/react";
import React from "react";
import * as Field from "@/components/ui/field.tsx";
import { Input } from "@components/ui/input.tsx";
import { Button } from "@components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox";
import * as alert from "@/components/ui/alert.tsx";
import { validateGuid } from "@/lib/validators/log-validators";
import { GUID_REGEX } from "@/constants/log-analyzer.constants";

/** Payload emitted when the credentials form is submitted. */
export type CredentialsSubmitPayload = {
    applicationId: string;
    apiKey: string;
    persistCredentials: boolean;
};

/** Props for the {@link CredentialsForm} component. */
export type CredentialsFormProps = {
    /** Called when the form passes client-side validation and the user clicks Connect. */
    onSubmit: (payload: CredentialsSubmitPayload) => void;
    /** Fires immediately when the persistence toggle changes. */
    onPersistenceToggle?: (persist: boolean) => void;
    /** Pre-filled Application ID (used as initial state via key-reset pattern). */
    initialApplicationId?: string;
    /** Pre-filled API key (used as initial state via key-reset pattern). */
    initialApiKey?: string;
    /** Whether the "Remember credentials" checkbox starts checked. */
    initialPersistCredentials?: boolean;
    /** Controls the loading state of the Connect button. */
    isSubmitting?: boolean;
    /** API-level error message to display (e.g. invalid credentials from fetchLogs). */
    error?: string | null;
};

type CredentialsFormState = {
    applicationId: string;
    apiKey: string;
    persistCredentials: boolean;
};

type CredentialsFormAction =
    | { type: "set-application-id"; value: string }
    | { type: "set-api-key"; value: string }
    | { type: "set-persist-credentials"; value: boolean };

const credentialsFormReducer = (
    state: CredentialsFormState,
    action: CredentialsFormAction,
): CredentialsFormState => {
    switch (action.type) {
        case "set-application-id":
            return { ...state, applicationId: action.value };
        case "set-api-key":
            return { ...state, apiKey: action.value };
        case "set-persist-credentials":
            return { ...state, persistCredentials: action.value };
        default:
            return state;
    }
};

/**
 * Form for entering Application Insights credentials.
 *
 * Uses the key-reset pattern: the parent should provide a unique `key` prop
 * whenever the form should reinitialize (e.g. on dialog open). This avoids
 * sync useEffects for piping initial* props into local state.
 */
export const CredentialsForm = ({
    onSubmit,
    onPersistenceToggle,
    initialApplicationId = "",
    initialApiKey = "",
    initialPersistCredentials = false,
    isSubmitting = false,
    error = null,
}: CredentialsFormProps) => {
    const [formState, dispatch] = React.useReducer(credentialsFormReducer, {
        applicationId: initialApplicationId,
        apiKey: initialApiKey,
        persistCredentials: initialPersistCredentials,
    });

    const appIdIsValid = validateGuid(formState.applicationId);
    const apiKeyIsValid = formState.apiKey.trim().length > 0;
    const canSubmit = appIdIsValid && apiKeyIsValid && !isSubmitting;

    const handlePersistenceChange = (checked: boolean | "indeterminate") => {
        const persist = Boolean(checked);
        dispatch({ type: "set-persist-credentials", value: persist });
        onPersistenceToggle?.(persist);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) return;

        onSubmit({
            applicationId: formState.applicationId.trim(),
            apiKey: formState.apiKey.trim(),
            persistCredentials: formState.persistCredentials,
        });
    };

    return (
        <Form className="space-y-4" aria-label="Specify Application Insights credentials" onSubmit={handleSubmit}>
            {error && (
                <alert.Root variant="destructive">
                    <alert.Title>Connection failed</alert.Title>
                    <alert.Description>{error}</alert.Description>
                </alert.Root>
            )}

            <Field.Root name="applicationId">
                <Field.Label>Application ID</Field.Label>
                <Field.Control
                    render={
                        <Input
                            variant={"secondary"}
                            value={formState.applicationId}
                            onChange={(event) => dispatch({ type: "set-application-id", value: event.target.value })}
                        />
                    }
                    placeholder="00000000-0000-0000-0000-000000000000"
                    required
                    pattern={GUID_REGEX.source}
                />
                <Field.Error match="valueMissing">This field is required.</Field.Error>
                <Field.Error match="patternMismatch">Application ID must be a GUID.</Field.Error>
                <Field.Description>
                    Identifies specific Application Insights instance when using the Application Insights API.
                </Field.Description>
            </Field.Root>

            <Field.Root name="apiKey">
                <Field.Label>API Key</Field.Label>
                <Field.Control
                    render={
                        <Input
                            variant={"secondary"}
                            type="password"
                            value={formState.apiKey}
                            onChange={(event) => dispatch({ type: "set-api-key", value: event.target.value })}
                        />
                    }
                    placeholder="xxxxxxxxxxxx"
                    required
                />
                <Field.Error match="valueMissing">This field is required.</Field.Error>
                <Field.Description>
                    API Key that can be used to authenticate requests to the Application Insights API.
                </Field.Description>
            </Field.Root>

            <Field.Root name="persistCredentials">
                <Field.Label className="flex flex-row gap-2 items-center">
                    <Checkbox checked={formState.persistCredentials} onCheckedChange={handlePersistenceChange} />
                    Remember credentials on this device
                </Field.Label>
                <Field.Description>
                    When enabled, credentials persist in browser local storage across sessions.
                    Disabling this will remove stored credentials immediately. Session-only storage is the safer default.
                </Field.Description>
            </Field.Root>

            <Button type="submit" disabled={!canSubmit}>
                {isSubmitting ? "Connecting..." : "Connect"}
            </Button>
        </Form>
    );
};
