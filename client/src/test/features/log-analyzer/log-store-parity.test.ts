import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LogRecord } from "@/types/logs";
import type { UserFlow } from "@/types/trace";

const {
    runTwoPhaseLogFetchOrchestrationMock,
    getLogsForFlowMock,
    parseTraceMock,
    logsToTraceInputMock,
    analyzeAllFlowsMock,
} = vi.hoisted(() => ({
    runTwoPhaseLogFetchOrchestrationMock: vi.fn(),
    getLogsForFlowMock: vi.fn(),
    parseTraceMock: vi.fn(),
    logsToTraceInputMock: vi.fn((logs: LogRecord[]) => logs),
    analyzeAllFlowsMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/log-analyzer/services/log-fetch-orchestration-service", () => ({
    runTwoPhaseLogFetchOrchestration: runTwoPhaseLogFetchOrchestrationMock,
}));

vi.mock("@/lib/trace", () => ({
    getLogsForFlow: getLogsForFlowMock,
    parseTrace: parseTraceMock,
    logsToTraceInput: logsToTraceInputMock,
}));

vi.mock("@/features/log-analyzer/services/background-flow-enrichment-service", () => ({
    analyzeAllFlows: analyzeAllFlowsMock,
}));

let useLogStore: typeof import("../../../stores/log-store").useLogStore;

function makeLog(id: string, correlationId: string): LogRecord {
    return {
        id,
        timestamp: new Date("2026-01-01T00:00:00.000Z"),
        policyId: "B2C_1A_TEST",
        correlationId,
        cloudRoleInstance: "instance",
        rawIds: [id],
        payloadText: "[]",
        parsedPayload: [],
        clips: [],
        customDimensions: {
            correlationId,
            eventName: "evt",
            tenant: "tenant",
            userJourney: "B2C_1A_TEST",
            version: "1",
        },
    };
}

function makeFlow(id: string, correlationId: string, logIds: string[]): UserFlow {
    return {
        id,
        correlationId,
        policyId: "B2C_1A_TEST",
        startTime: new Date("2026-01-01T00:00:00.000Z"),
        endTime: new Date("2026-01-01T00:10:00.000Z"),
        stepCount: 2,
        completed: false,
        hasErrors: false,
        cancelled: false,
        subJourneys: [],
        logIds,
    };
}

function createDeferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

function resetStore() {
    useLogStore.setState(useLogStore.getInitialState());
}

beforeEach(async () => {
    vi.resetModules();
    ({ useLogStore } = await import("../../../stores/log-store"));

    resetStore();
    vi.clearAllMocks();

    runTwoPhaseLogFetchOrchestrationMock.mockResolvedValue({
        processed: [],
        userFlows: [],
        selectedFlow: null,
        selectedLog: null,
        effectiveMaxRows: 100,
    });

    logsToTraceInputMock.mockImplementation((logs: LogRecord[]) => logs);
    analyzeAllFlowsMock.mockResolvedValue(undefined);
    parseTraceMock.mockReturnValue({
        traceSteps: [
            { nodeId: "step-1", sequenceNumber: 0, result: "Success" },
            { nodeId: "step-2", sequenceNumber: 1, result: "Success" },
        ],
        executionMap: {},
        mainJourneyId: "B2C_1A_TEST",
        errors: [],
        finalStatebag: {},
        finalClaims: {},
        sessions: [],
    });
});

describe("log-store parity guards", () => {
    it("applies orchestration result to store state", async () => {
        const fullFlowLogs = [makeLog("l-4", "corr-2"), makeLog("l-1", "corr-1"), makeLog("l-3", "corr-1")];
        const primaryFlow = makeFlow("flow-1", "corr-1", ["l-1", "l-3"]);

        runTwoPhaseLogFetchOrchestrationMock.mockResolvedValueOnce({
            processed: fullFlowLogs,
            userFlows: [primaryFlow],
            selectedFlow: primaryFlow,
            selectedLog: fullFlowLogs[1],
            effectiveMaxRows: 10000,
        });
        getLogsForFlowMock.mockReturnValue([fullFlowLogs[1], fullFlowLogs[2]]);

        useLogStore.setState({ searchText: "  email@contoso.com  " });

        await useLogStore.getState().fetchLogs({
            applicationId: "app-id",
            apiKey: "api-key",
            maxRows: 99999,
            timespan: "PT6H",
        });

        expect(runTwoPhaseLogFetchOrchestrationMock).toHaveBeenCalledTimes(1);
        expect(runTwoPhaseLogFetchOrchestrationMock).toHaveBeenCalledWith(
            expect.objectContaining({
                args: {
                    applicationId: "app-id",
                    apiKey: "api-key",
                    maxRows: 99999,
                    timespan: "PT6H",
                },
                searchText: "  email@contoso.com  ",
            }),
        );

        const state = useLogStore.getState();
        expect(state.logs).toEqual(fullFlowLogs);
        expect(state.selectedFlow).toEqual(primaryFlow);
        expect(state.selectedLog).toEqual(fullFlowLogs[1]);
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
    });

    it("uses selected flow/log from orchestration result", async () => {
        const fullFlowLogs = [makeLog("x", "corr-20"), makeLog("a", "corr-10"), makeLog("b", "corr-10")];
        const firstFlow = makeFlow("flow-10", "corr-10", ["a", "b"]);

        runTwoPhaseLogFetchOrchestrationMock.mockResolvedValueOnce({
            processed: fullFlowLogs,
            userFlows: [firstFlow],
            selectedFlow: firstFlow,
            selectedLog: fullFlowLogs[1],
            effectiveMaxRows: 100,
        });
        getLogsForFlowMock.mockReturnValue([fullFlowLogs[1], fullFlowLogs[2]]);

        await useLogStore.getState().fetchLogs({
            applicationId: "app-id",
            apiKey: "api-key",
            maxRows: 100,
            timespan: "PT2H",
        });

        const state = useLogStore.getState();
        expect(state.selectedFlow).toEqual(firstFlow);
        expect(state.selectedLog).toEqual(fullFlowLogs[1]);
    });

    it("handles empty orchestration result", async () => {
        runTwoPhaseLogFetchOrchestrationMock.mockResolvedValueOnce({
            processed: [],
            userFlows: [],
            selectedFlow: null,
            selectedLog: null,
            effectiveMaxRows: 100,
        });

        await useLogStore.getState().fetchLogs({
            applicationId: "app-id",
            apiKey: "api-key",
            maxRows: 100,
            timespan: "PT1H",
        });

        expect(runTwoPhaseLogFetchOrchestrationMock).toHaveBeenCalledTimes(1);
        expect(useLogStore.getState().logs).toEqual([]);
    });

    it("preserves setSelectedLog trace bootstrap while setSelectedLogOnly is trace-stable", () => {
        const logA = makeLog("a", "corr-1");
        const logB = makeLog("b", "corr-1");
        const flow = makeFlow("flow-1", "corr-1", ["a", "b"]);

        useLogStore.setState({
            logs: [logA, logB],
            userFlows: [flow],
            selectedFlow: null,
            traceSteps: [],
            activeStepIndex: null,
        });

        getLogsForFlowMock.mockReturnValue([logA, logB]);

        useLogStore.getState().setSelectedLog(logA);

        const afterSelectedLog = useLogStore.getState();
        expect(afterSelectedLog.selectedLog).toEqual(logA);
        expect(afterSelectedLog.selectedFlow).toEqual(flow);
        expect(afterSelectedLog.traceSteps.length).toBeGreaterThan(0);
        expect(afterSelectedLog.activeStepIndex).toBe(0);

        const stableTraceSnapshot = {
            traceSteps: afterSelectedLog.traceSteps,
            executionMap: afterSelectedLog.executionMap,
            activeStepIndex: afterSelectedLog.activeStepIndex,
            selectedFlow: afterSelectedLog.selectedFlow,
            correlationId: afterSelectedLog.correlationId,
        };

        parseTraceMock.mockClear();
        logsToTraceInputMock.mockClear();

        useLogStore.getState().setSelectedLogOnly(logB);

        const afterSelectedLogOnly = useLogStore.getState();
        expect(afterSelectedLogOnly.selectedLog).toEqual(logB);
        expect(afterSelectedLogOnly.traceSteps).toEqual(stableTraceSnapshot.traceSteps);
        expect(afterSelectedLogOnly.executionMap).toEqual(stableTraceSnapshot.executionMap);
        expect(afterSelectedLogOnly.activeStepIndex).toEqual(stableTraceSnapshot.activeStepIndex);
        expect(afterSelectedLogOnly.selectedFlow).toEqual(stableTraceSnapshot.selectedFlow);
        expect(afterSelectedLogOnly.correlationId).toEqual(stableTraceSnapshot.correlationId);
        expect(parseTraceMock).not.toHaveBeenCalled();
        expect(logsToTraceInputMock).not.toHaveBeenCalled();
    });

    it("uses correlation fallback in setSelectedLog when selected log is not present in any user flow", () => {
        const logA = makeLog("a", "corr-1");
        const logB = makeLog("b", "corr-1");
        const logC = makeLog("c", "corr-2");
        const unrelatedFlow = makeFlow("flow-2", "corr-2", ["c"]);

        useLogStore.setState({
            logs: [logA, logB, logC],
            userFlows: [unrelatedFlow],
            selectedFlow: unrelatedFlow,
            selectedLog: null,
            traceSteps: [],
            correlationId: "",
        });

        useLogStore.getState().setSelectedLog(logA);

        const state = useLogStore.getState();
        expect(state.selectedLog).toEqual(logA);
        expect(state.selectedFlow).toEqual(unrelatedFlow);
        expect(logsToTraceInputMock).toHaveBeenCalledWith([logA, logB]);
        expect(state.correlationId).toBe("corr-1");
    });

    it("applies selectFlow(null) semantics: clears trace/selection and preserves userFlows/searchText", () => {
        const logA = makeLog("a", "corr-1");
        const logB = makeLog("b", "corr-1");
        const flow = makeFlow("flow-1", "corr-1", ["a", "b"]);

        useLogStore.setState({
            logs: [logA, logB],
            userFlows: [flow],
            selectedFlow: flow,
            selectedLog: logA,
            searchText: "persist me",
            traceSteps: [{ nodeId: "existing-step", sequenceNumber: 1 }],
            activeStepIndex: 0,
            isTraceModeActive: true,
            correlationId: "corr-1",
            mainJourneyId: "B2C_1A_TEST",
            traceErrors: ["old"],
        });

        useLogStore.getState().selectFlow(null);

        const state = useLogStore.getState();
        expect(state.selectedFlow).toBeNull();
        expect(state.selectedLog).toBeNull();
        expect(state.traceSteps).toEqual([]);
        expect(state.activeStepIndex).toBeNull();
        expect(state.isTraceModeActive).toBe(false);
        expect(state.correlationId).toBe("");
        expect(state.mainJourneyId).toBe("");
        expect(state.traceErrors).toEqual([]);
        expect(state.userFlows).toEqual([flow]);
        expect(state.searchText).toBe("persist me");
    });

    it("enforces fetch lifecycle transitions: reset on start, loading exit on success/failure", async () => {
        const deferred = createDeferred<{
            processed: LogRecord[];
            userFlows: UserFlow[];
            selectedFlow: UserFlow | null;
            selectedLog: LogRecord | null;
            effectiveMaxRows: number;
        }>();

        useLogStore.setState({
            searchText: "sticky-search",
            error: "previous error",
            traceErrors: ["old trace error"],
            isTraceModeActive: true,
            activeStepIndex: 2,
            selectedFlow: makeFlow("old-flow", "old-corr", ["x"]),
        });

        runTwoPhaseLogFetchOrchestrationMock.mockReturnValueOnce(deferred.promise);

        const fetchPromise = useLogStore.getState().fetchLogs({
            applicationId: "app-id",
            apiKey: "api-key",
            maxRows: 100,
            timespan: "PT1H",
        });

        const stateDuringFetch = useLogStore.getState();
        expect(stateDuringFetch.isLoading).toBe(true);
        expect(stateDuringFetch.error).toBeNull();
        expect(stateDuringFetch.traceErrors).toEqual([]);
        expect(stateDuringFetch.isTraceModeActive).toBe(false);
        expect(stateDuringFetch.activeStepIndex).toBeNull();
        expect(stateDuringFetch.selectedFlow).toBeNull();
        expect(stateDuringFetch.searchText).toBe("sticky-search");

        deferred.resolve({
            processed: [],
            userFlows: [],
            selectedFlow: null,
            selectedLog: null,
            effectiveMaxRows: 100,
        });
        await fetchPromise;

        expect(useLogStore.getState().isLoading).toBe(false);

        runTwoPhaseLogFetchOrchestrationMock.mockRejectedValueOnce(new Error("network down"));

        await useLogStore.getState().fetchLogs({
            applicationId: "app-id",
            apiKey: "api-key",
            maxRows: 100,
            timespan: "PT1H",
        });

        const afterFailure = useLogStore.getState();
        expect(afterFailure.isLoading).toBe(false);
        expect(afterFailure.error).toBe("network down");
    });
});