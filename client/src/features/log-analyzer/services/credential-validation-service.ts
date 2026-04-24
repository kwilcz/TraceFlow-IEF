import {
    applicationInsightsClient,
    type AppInsightsQueryParams,
    type ApplicationInsightsClient,
} from "@/lib/api/application-insights-client";
import { mapAppInsightsAuthError } from "@/lib/api/app-insights-auth-error";

export interface AppInsightsCredentialValidationParams {
    applicationId: string;
    apiKey: string;
}

type AppInsightsCredentialValidationClient = Pick<ApplicationInsightsClient, "query">;

export class AppInsightsCredentialValidationError extends Error {
    readonly cause: unknown;

    constructor(message: string, cause: unknown) {
        super(message);
        this.name = "AppInsightsCredentialValidationError";
        this.cause = cause;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

const VALIDATION_QUERY_PARAMS = {
    maxRows: 1,
    timespan: "PT5M",
    policyIds: [],
    searchText: undefined,
} satisfies Omit<AppInsightsQueryParams, "applicationId" | "apiKey">;

export async function validateAppInsightsCredentials(
    params: AppInsightsCredentialValidationParams,
    client: AppInsightsCredentialValidationClient = applicationInsightsClient,
): Promise<void> {
    try {
        await client.query({
            applicationId: params.applicationId,
            apiKey: params.apiKey,
            ...VALIDATION_QUERY_PARAMS,
        });
    } catch (error) {
        throw new AppInsightsCredentialValidationError(mapAppInsightsAuthError(error), error);
    }
}
