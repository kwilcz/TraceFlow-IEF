import type { LogRecord } from "@/types/logs";
import type { TraceExecutionMap, TraceStep, UserFlow } from "@/types/trace";

export interface TraceState {
    traceSteps: TraceStep[];
    executionMap: TraceExecutionMap;
    activeStepIndex: number | null;
    isTraceModeActive: boolean;
    mainJourneyId: string;
    correlationId: string;
    finalStatebag: Record<string, string>;
    finalClaims: Record<string, string>;
    traceErrors: string[];
    userFlows: UserFlow[];
    selectedFlow: UserFlow | null;
    searchText: string;
}

export interface TraceActions {
    generateTrace: () => void;
    setActiveStep: (index: number | null) => void;
    toggleTraceMode: (active: boolean) => void;
    previousStep: () => void;
    nextStep: () => void;
    clearTrace: () => void;
    selectFlow: (flow: UserFlow | null) => void;
    setSearchText: (text: string) => void;
    setSelectedLogOnly: (log: LogRecord | null) => void;
}

export const initialTraceState: TraceState = {
    traceSteps: [],
    executionMap: {},
    activeStepIndex: null,
    isTraceModeActive: false,
    mainJourneyId: "",
    correlationId: "",
    finalStatebag: {},
    finalClaims: {},
    traceErrors: [],
    userFlows: [],
    selectedFlow: null,
    searchText: "",
};