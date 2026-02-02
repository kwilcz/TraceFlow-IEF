import {Form} from "@base-ui/react";
import * as Field from "@/components/ui/field.tsx"
import {Input} from "@components/ui/input.tsx";
import {Button} from "@components/ui/button.tsx";

export type CredentialsFormProps = {
    onSubmit: () => void
}

export const CredentialsForm = ({onSubmit}: CredentialsFormProps) => {
    return (
        <Form className="space-y-4"
              aria-label="Specify Application Insights credentials"
              onFormSubmit={onSubmit} >
            <Field.Root name='applicationId'>
                <Field.Label>Application ID</Field.Label>
                <Field.Control 
                    render={<Input  variant={"secondary"} />}
                    placeholder="00000000-0000-0000-0000-000000000000" 
                    required 
                    pattern="^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" 
                />
                <Field.Error match="valueMissing">This field is required.</Field.Error>
                <Field.Error match="patternMismatch">Application ID must be a GUID.</Field.Error>
                <Field.Description>Identifies specific Application Insights instance when using
                    the Application Insights API.
                </Field.Description>
            </Field.Root>

            <Field.Root name='apiKey'>
                <Field.Label>API Key</Field.Label>
                <Field.Control 
                    render={<Input variant={"secondary"} />}
                    placeholder="xxxxxxxxxxxx" 
                    required
                />
                <Field.Error match="valueMissing">This field is required.</Field.Error>
                <Field.Description>API Key that can be used to authenticate requests to the Application
                    Insights API.
                </Field.Description>
            </Field.Root>

            <Button type="submit">Connect</Button>
        </Form>
    )
}