import type { AppInsightsResponse, AppInsightsTable, FetchFlowsParams } from "@/lib/api/application-insights-client";
import type { FetchLogsArgs, LogRecord } from "@/types/logs";
import type { UserFlow } from "@/types/trace";

export interface LogFetchClient {
    query: (params: {
        applicationId: string;
        apiKey: string;
        maxRows: number;
        timespan: string;
        policyIds: string[];
        searchText?: string;
    }) => Promise<AppInsightsResponse>;
    fetchCompleteFlows: (params: FetchFlowsParams) => Promise<AppInsightsResponse>;
    extractPrimaryTable: (response: AppInsightsResponse) => AppInsightsTable | undefined;
}

export interface LogFetchOrchestrationDeps {
    client: LogFetchClient;
    processTable: (table?: AppInsightsTable) => LogRecord[];
    groupLogsIntoFlows: (logs: LogRecord[]) => UserFlow[];
}

export interface LogFetchOrchestrationInput {
    args: FetchLogsArgs;
    searchText: string;
}

export interface LogFetchOrchestrationResult {
    processed: LogRecord[];
    userFlows: UserFlow[];
    selectedFlow: UserFlow | null;
    selectedLog: LogRecord | null;
    effectiveMaxRows: number;
}