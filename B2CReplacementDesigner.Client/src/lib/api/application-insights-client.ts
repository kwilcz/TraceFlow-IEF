import { APP_INSIGHTS_CONFIG } from "@/constants/log-analyzer.constants";

/**
 * Parameters for querying Application Insights API.
 */
export interface AppInsightsQueryParams {
    /** Application Insights Application ID (GUID) */
    applicationId: string;
    /** API Key for authentication */
    apiKey: string;
    /** Maximum number of rows to return */
    maxRows: number;
    /** ISO 8601 duration for the query timespan */
    timespan: string;
    /** Optional array of policy IDs to filter by */
    policyIds: string[];
    /** Optional generic search text (matches any field in the log) */
    searchText?: string;
}

/**
 * Parameters for fetching complete flows by correlation IDs.
 */
export interface FetchFlowsParams {
    /** Application Insights Application ID (GUID) */
    applicationId: string;
    /** API Key for authentication */
    apiKey: string;
    /** ISO 8601 duration for the query timespan */
    timespan: string;
    /** Correlation IDs to fetch all logs for */
    correlationIds: string[];
}

/**
 * Represents a table in the Application Insights query response.
 */
export interface AppInsightsTable {
    /** Table name (typically "PrimaryResult") */
    name: string;
    /** Column definitions */
    columns: { name: string }[];
    /** Row data as 2D array */
    rows: unknown[][];
}

/**
 * Application Insights API query response structure.
 */
export interface AppInsightsResponse {
    /** Array of result tables */
    tables?: AppInsightsTable[];
}

/**
 * Client for querying the Application Insights REST API.
 * Handles KQL query generation, request execution, and response parsing.
 */
export class ApplicationInsightsClient {
    /**
     * Builds the query URL with required parameters.
     * @param applicationId - Application Insights Application ID
     * @param timespan - ISO 8601 duration for lookback period
     * @param maxRows - Maximum rows to return
     * @returns Configured URL object
     */
    private buildQueryUrl(applicationId: string, timespan: string, maxRows: number): URL {
        const url = new URL(`${APP_INSIGHTS_CONFIG.BASE_URL}/apps/${applicationId}/query`);
        url.searchParams.set("timespan", timespan);
        url.searchParams.set("$top", maxRows.toString());
        url.searchParams.set("$orderby", "timestamp desc,id");
        url.searchParams.set("$select", "id,timestamp,cloud/roleInstance,trace/message,customDimensions");
        return url;
    }

    /**
     * Builds a KQL (Kusto Query Language) query for Journey Recorder traces.
     * Filters by event name prefix and optionally by policy IDs and search text.
     * @param maxRows - Maximum number of rows to return
     * @param policyIds - Array of policy IDs to filter by (empty array = no filter)
     * @param searchText - Optional text to search for in the trace message
     * @returns KQL query string
     */
    private buildKqlQuery(maxRows: number, policyIds: string[], searchText?: string): string {
        const policyClause =
            policyIds.length > 0
                ? `\n| where tolower(customDimensions.UserJourney) in (${policyIds.map((id) => `'${id}'`).join(",")})`
                : "";

        // Generic search: search in message content for any matching text
        // This allows users to search for email addresses, user IDs, etc.
        const searchClause = searchText && searchText.trim()
            ? `\n| where message contains "${this.escapeKqlString(searchText.trim())}"`
            : "";

        // Filter out METADATA events - they are just API calls to well-known endpoints
        const metadataFilter = `\n| where message !contains '"EventInstance": "Event:METADATA"'`;
        const tokenFilter = `\n| where message !contains '"EventInstance": "Event:TOKEN"'`;

        return `traces
| where customDimensions.EventName startswith '${APP_INSIGHTS_CONFIG.EVENT_NAME_PREFIX}'
| where isnotempty(customDimensions.UserJourney)${policyClause}${searchClause}${metadataFilter}${tokenFilter}
| order by timestamp desc, itemId desc
| take ${maxRows}`;
    }

    /**
     * Builds a KQL query to fetch all logs for specific correlation IDs.
     * Used to fetch complete flows after initial search.
     * @param correlationIds - Array of correlation IDs to fetch logs for
     * @returns KQL query string
     */
    private buildCorrelationQuery(correlationIds: string[]): string {
        if (correlationIds.length === 0) {
            return `traces | where 1 == 0`; // Return empty result
        }

        const correlationClause = correlationIds
            .map(id => `"${this.escapeKqlString(id)}"`)
            .join(",");

        // Filter out METADATA events - they are just API calls to well-known endpoints
        return `traces
| where customDimensions.EventName startswith '${APP_INSIGHTS_CONFIG.EVENT_NAME_PREFIX}'
| where isnotempty(customDimensions.UserJourney)
| where customDimensions.CorrelationId in (${correlationClause})
| where message !contains '"EventInstance": "Event:METADATA"'
| order by timestamp asc, itemId asc`;
    }

    /**
     * Escape special characters in KQL string literals.
     */
    private escapeKqlString(str: string): string {
        return str
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/'/g, "\\'");
    }

    /**
     * Executes a query against the Application Insights API.
     * @param params - Query parameters including credentials, timespan, and filters
     * @returns Promise resolving to the API response
     * @throws Error if the API request fails
     */
    async query(params: AppInsightsQueryParams): Promise<AppInsightsResponse> {
        const { applicationId, apiKey, maxRows, timespan, policyIds, searchText } = params;

        const url = this.buildQueryUrl(applicationId, timespan, maxRows);
        const query = this.buildKqlQuery(maxRows, policyIds, searchText);

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || `Request failed with status ${response.status}`);
        }

        return response.json();
    }

    /**
     * Fetches all logs for the given correlation IDs to ensure complete flows.
     * @param params - Parameters including credentials and correlation IDs
     * @returns Promise resolving to the API response with all related logs
     * @throws Error if the API request fails
     */
    async fetchCompleteFlows(params: FetchFlowsParams): Promise<AppInsightsResponse> {
        const { applicationId, apiKey, timespan, correlationIds } = params;

        const url = new URL(`${APP_INSIGHTS_CONFIG.BASE_URL}/apps/${applicationId}/query`);
        url.searchParams.set("timespan", timespan);
        // No limit - we want all logs for these correlation IDs
        url.searchParams.set("$orderby", "timestamp asc,id");
        url.searchParams.set("$select", "id,timestamp,cloud/roleInstance,trace/message,customDimensions");

        const query = this.buildCorrelationQuery(correlationIds);

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || `Request failed with status ${response.status}`);
        }

        return response.json();
    }

    /**
     * Extracts the primary result table from the API response.
     * Prefers tables named "PrimaryResult", falls back to first table.
     * @param response - Application Insights API response
     * @returns The primary result table or undefined if no tables exist
     */
    extractPrimaryTable(response: AppInsightsResponse): AppInsightsTable | undefined {
        if (!Array.isArray(response.tables)) {
            return undefined;
        }

        return response.tables.find((t) => t.name === "PrimaryResult") || response.tables[0];
    }
}

/**
 * Singleton instance of ApplicationInsightsClient.
 */
export const applicationInsightsClient = new ApplicationInsightsClient();
