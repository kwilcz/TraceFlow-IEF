import { useId } from "react";
import * as Field from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { LogCredentialEnvironment } from "@/types/logs";

export type EnvironmentDraft = Pick<
    LogCredentialEnvironment,
    "id" | "name" | "authType" | "applicationId" | "apiKey" | "persist"
>;

type EnvironmentFormFieldsProps = {
    draft: EnvironmentDraft;
    onChange: <K extends keyof EnvironmentDraft>(field: K, value: EnvironmentDraft[K]) => void;
    disabled?: boolean;
};

export const EnvironmentFormFields = ({
    draft,
    onChange,
    disabled = false,
}: EnvironmentFormFieldsProps) => {
    const doNotPersist = !draft.persist;
    const persistLabelId = useId();
    const persistDescriptionId = useId();

    return (
        <div className="space-y-4">
            <Field.Root name="environmentName">
                <Field.Label>Display Name</Field.Label>
                <Field.Control
                    render={
                        <Input
                            variant="secondary"
                            value={draft.name}
                            disabled={disabled}
                            onChange={(event) => onChange("name", event.target.value)}
                        />
                    }
                />
                <Field.Description>
                    Shown in the environment picker.
                </Field.Description>
            </Field.Root>

            <Field.Root name="authType">
                <Field.Label>Authorization Type</Field.Label>
                <Select value={draft.authType} disabled>
                    <Field.Control
                        render={
                            <SelectTrigger>
                                <SelectValue>Application Insights API Key</SelectValue>
                            </SelectTrigger>
                        }
                    />
                    <SelectContent>
                        <SelectItem value="app-insights">Application Insights API Key</SelectItem>
                    </SelectContent>
                </Select>
            </Field.Root>

            <Field.Root name="applicationId">
                <Field.Label>Application ID</Field.Label>
                <Field.Control
                    render={
                        <Input
                            variant="secondary"
                            value={draft.applicationId}
                            disabled={disabled}
                            onChange={(event) => onChange("applicationId", event.target.value)}
                        />
                    }
                />
            </Field.Root>

            <Field.Root name="apiKey">
                <Field.Label>API Key</Field.Label>
                <Field.Control
                    render={
                        <Input
                            variant="secondary"
                            type="password"
                            value={draft.apiKey}
                            disabled={disabled}
                            onChange={(event) => onChange("apiKey", event.target.value)}
                        />
                    }
                />
            </Field.Root>

            <div className="flex items-start gap-3 pt-1">
                <Switch
                    checked={doNotPersist}
                    disabled={disabled}
                    onCheckedChange={(checked) => onChange("persist", !checked)}
                    aria-labelledby={persistLabelId}
                    aria-describedby={persistDescriptionId}
                />
                <div className="space-y-1">
                    <div
                        id={persistLabelId}
                        className="text-sm font-medium text-foreground"
                    >
                        Do not persist credentials
                    </div>
                    <p
                        id={persistDescriptionId}
                        className="text-xs text-muted"
                    >
                        When selected, credentials are stored only while the browser window is open.
                    </p>
                </div>
            </div>
        </div>
    );
};
