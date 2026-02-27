import { logsToTraceInput, parseTrace } from "@/lib/trace";
import type { LogRecord } from "@/types/logs";
import type { UserFlow } from "@/types/trace";
import type { TraceState } from "@/features/log-analyzer/model/trace-state";
import { initialTraceState } from "@/features/log-analyzer/model/trace-state";

export function generateTraceStateFromLogs(logs: LogRecord[]): Partial<TraceState> {
    if (logs.length === 0) {
        return {
            flowTree: null,
            traceSteps: initialTraceState.traceSteps,
            executionMap: initialTraceState.executionMap,
            activeStepIndex: initialTraceState.activeStepIndex,
            isTraceModeActive: initialTraceState.isTraceModeActive,
            mainJourneyId: initialTraceState.mainJourneyId,
            correlationId: initialTraceState.correlationId,
            finalStatebag: initialTraceState.finalStatebag,
            finalClaims: initialTraceState.finalClaims,
            traceErrors: ["No logs available to generate trace"],
            sessions: [],
        };
    }

    const traceInput = logsToTraceInput(logs);
    const result = parseTrace(traceInput);
    const correlationId = logs[0]?.correlationId ?? "";

    return {
        flowTree: result.flowTree,
        traceSteps: result.traceSteps,
        executionMap: result.executionMap,
        mainJourneyId: result.mainJourneyId,
        correlationId,
        finalStatebag: result.finalStatebag,
        finalClaims: result.finalClaims,
        traceErrors: result.errors,
        activeStepIndex: result.traceSteps.length > 0 ? 0 : null,
        isTraceModeActive: result.traceSteps.length > 0,
        sessions: result.sessions,
    };
}

/**
 * Enriches a UserFlow with metadata derived from trace parsing.
 * All metadata comes from interpreter-produced traceSteps and finalClaims.
 */
export function enrichUserFlow(flow: UserFlow, tracePatch: Partial<TraceState>): UserFlow {
    const steps = tracePatch.traceSteps ?? [];
    const claims = tracePatch.finalClaims ?? {};
    const latestEmail = resolveLatestEmail(steps, claims, flow.userEmail);

    return {
        ...flow,
        stepCount: steps.length,
        completed: steps.some(s => s.actionHandler === "SendClaims"),
        hasErrors: steps.some(s => s.result === "Error"),
        cancelled: steps.some(s => s.interactionResult === "Cancelled"),
        subJourneys: [...new Set(steps.filter(s => s.subJourneyId).map(s => s.subJourneyId!))],
        userEmail: latestEmail,
        userObjectId: claims.objectId ?? flow.userObjectId,
    };
}

function resolveLatestEmail(
    steps: NonNullable<TraceState["traceSteps"]>,
    finalClaims: Record<string, string>,
    fallback?: string,
): string | undefined {
    for (let index = steps.length - 1; index >= 0; index--) {
        const stepClaims = steps[index].claimsSnapshot ?? {};
        const signInName = normalizeClaimValue(stepClaims.signInName);
        if (signInName) {
            return signInName;
        }

        const email = normalizeClaimValue(stepClaims.email);
        if (email) {
            return email;
        }
    }

    const finalSignInName = normalizeClaimValue(finalClaims.signInName);
    if (finalSignInName) {
        return finalSignInName;
    }

    const finalEmail = normalizeClaimValue(finalClaims.email);
    if (finalEmail) {
        return finalEmail;
    }

    return fallback;
}

function normalizeClaimValue(value: string | undefined): string | undefined {
    if (!value) {
        return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === "null") {
        return undefined;
    }

    return trimmed;
}