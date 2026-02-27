import { describe, it, expect, vi } from "vitest";
import type { AppInsightsResponse, AppInsightsTable } from "@/lib/api/application-insights-client";
import { runTwoPhaseLogFetchOrchestration } from "@/features/log-analyzer/services/log-fetch-orchestration-service";
import type { LogFetchOrchestrationDeps } from "@/features/log-analyzer/types/log-fetch-orchestration";
import type { LogRecord } from "@/types/logs";
import type { UserFlow } from "@/types/trace";

function makeLog(id: string, correlationId: string, timestamp: Date, policyId = "B2C_1A_Test"): LogRecord {
    return {
        id,
        timestamp,
        policyId,
        correlationId,
        cloudRoleInstance: "test-role",
        rawIds: [id],
        payloadText: "[]",
        parsedPayload: [],
        clips: [],
        customDimensions: {
            correlationId,
            eventName: "Journey Recorder Event v1.0.0",
            tenant: "test.onmicrosoft.com",
            userJourney: policyId,
            version: "1.0.0",
        },
    };
}

function makeFlow(
    id: string,
    policyId: string,
    startTime: Date,
    logIds: string[],
    correlationId = "corr-1",
): UserFlow {
    return {
        id,
        correlationId,
        policyId,
        startTime,
        endTime: new Date(startTime.getTime() + 1000),
        stepCount: 0,
        completed: false,
        hasErrors: false,
        cancelled: false,
        subJourneys: [],
        logIds,
        userEmail: undefined,
        userObjectId: undefined,
    };
}

describe("runTwoPhaseLogFetchOrchestration", () => {
    it("selects the first flow using picker sort order (policy asc, date desc)", async () => {
        const initialTable: AppInsightsTable = { name: "Initial", columns: [], rows: [] };
        const fullTable: AppInsightsTable = { name: "Full", columns: [], rows: [] };

        const initialLogs = [makeLog("l1", "corr-1", new Date("2026-02-27T10:00:00.000Z"))];
        const fullLogs = [
            makeLog("l-a-old", "corr-1", new Date("2026-02-27T09:00:00.000Z"), "B2C_1A_A"),
            makeLog("l-z", "corr-2", new Date("2026-02-27T12:00:00.000Z"), "B2C_1A_Z"),
            makeLog("l-a-new", "corr-3", new Date("2026-02-27T11:00:00.000Z"), "B2C_1A_A"),
        ];

        const flows = [
            makeFlow("flow-z", "B2C_1A_Z", new Date("2026-02-27T12:00:00.000Z"), ["l-z"], "corr-2"),
            makeFlow("flow-a-old", "B2C_1A_A", new Date("2026-02-27T09:00:00.000Z"), ["l-a-old"], "corr-1"),
            makeFlow("flow-a-new", "B2C_1A_A", new Date("2026-02-27T11:00:00.000Z"), ["l-a-new"], "corr-3"),
        ];

        const queryResponse: AppInsightsResponse = { tables: [initialTable] };
        const fullResponse: AppInsightsResponse = { tables: [fullTable] };

        const deps: LogFetchOrchestrationDeps = {
            client: {
                query: vi.fn().mockResolvedValue(queryResponse),
                fetchCompleteFlows: vi.fn().mockResolvedValue(fullResponse),
                extractPrimaryTable: vi.fn((response: AppInsightsResponse) => response.tables?.[0]),
            },
            processTable: vi.fn((table?: AppInsightsTable) =>
                table?.name === "Initial" ? initialLogs : fullLogs,
            ),
            groupLogsIntoFlows: vi.fn().mockReturnValue(flows),
        };

        const result = await runTwoPhaseLogFetchOrchestration(
            {
                args: {
                    applicationId: "app-id",
                    apiKey: "api-key",
                    maxRows: 200,
                    timespan: "PT1H",
                },
                searchText: "",
            },
            deps,
        );

        expect(result.selectedFlow?.id).toBe("flow-a-new");
        expect(result.selectedLog?.id).toBe("l-a-new");
    });

    it("returns null selectedFlow when no flows are available", async () => {
        const table: AppInsightsTable = { name: "Initial", columns: [], rows: [] };
        const response: AppInsightsResponse = { tables: [table] };
        const logs = [makeLog("l1", "corr-1", new Date("2026-02-27T10:00:00.000Z"))];

        const deps: LogFetchOrchestrationDeps = {
            client: {
                query: vi.fn().mockResolvedValue(response),
                fetchCompleteFlows: vi.fn().mockResolvedValue(response),
                extractPrimaryTable: vi.fn((value: AppInsightsResponse) => value.tables?.[0]),
            },
            processTable: vi.fn().mockReturnValue(logs),
            groupLogsIntoFlows: vi.fn().mockReturnValue([]),
        };

        const result = await runTwoPhaseLogFetchOrchestration(
            {
                args: {
                    applicationId: "app-id",
                    apiKey: "api-key",
                    maxRows: 200,
                    timespan: "PT1H",
                },
                searchText: "",
            },
            deps,
        );

        expect(result.selectedFlow).toBeNull();
        expect(result.selectedLog).toBeNull();
    });
});
