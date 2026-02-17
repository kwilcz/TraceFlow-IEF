import { LOG_LIMITS } from "@/constants/log-analyzer.constants";
import { applicationInsightsClient } from "@/lib/api/application-insights-client";
import { AppInsightsProcessor } from "@/lib/app-insights-processor";
import { groupLogsIntoFlows } from "@/lib/trace";
import { clampRowCount } from "@/lib/validators/log-validators";
import type {
    LogFetchOrchestrationDeps,
    LogFetchOrchestrationInput,
    LogFetchOrchestrationResult,
} from "@/features/log-analyzer/types/log-fetch-orchestration";

const defaultDeps: LogFetchOrchestrationDeps = {
    client: applicationInsightsClient,
    processTable: AppInsightsProcessor.process,
    groupLogsIntoFlows,
};

export async function runTwoPhaseLogFetchOrchestration(
    { args, searchText }: LogFetchOrchestrationInput,
    deps: LogFetchOrchestrationDeps = defaultDeps,
): Promise<LogFetchOrchestrationResult> {
    const { applicationId, apiKey, maxRows, timespan } = args;
    const safeMaxRows = clampRowCount(maxRows, LOG_LIMITS.MIN_ROWS, LOG_LIMITS.MAX_ROWS);
    const normalizedPolicies: string[] = [];

    // Phase 1: Query to get initial logs and correlation IDs
    const initialResponse = await deps.client.query({
        applicationId,
        apiKey,
        maxRows: safeMaxRows,
        timespan,
        policyIds: normalizedPolicies,
        searchText: searchText.trim() || undefined,
    });

    const initialTable = deps.client.extractPrimaryTable(initialResponse);
    const initialResults = deps.processTable(initialTable);

    // Extract unique correlation IDs from initial results
    const correlationIds = Array.from(new Set(initialResults.map((log) => log.correlationId)));

    let processed = initialResults;

    if (correlationIds.length > 0) {
        // Phase 2: Fetch complete flows for all correlation IDs
        const flowsResponse = await deps.client.fetchCompleteFlows({
            applicationId,
            apiKey,
            timespan,
            correlationIds,
        });

        const flowsTable = deps.client.extractPrimaryTable(flowsResponse);
        processed = deps.processTable(flowsTable);
    }

    const userFlows = deps.groupLogsIntoFlows(processed);
    const selectedFlow = userFlows[0] ?? null;
    const selectedLog = selectedFlow
        ? (processed.find((log) => selectedFlow.logIds.includes(log.id)) ?? null)
        : null;

    return {
        processed,
        userFlows,
        selectedFlow,
        selectedLog,
        effectiveMaxRows: safeMaxRows,
    };
}
