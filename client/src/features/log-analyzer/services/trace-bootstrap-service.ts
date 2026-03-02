import { logsToTraceInput, parseTrace } from "@/lib/trace";
import type { LogRecord } from "@/types/logs";
import type { UserFlow } from "@/types/trace";
import type { FlowNode } from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";
import type { StepFlowData } from "@/types/flow-node";
import { collectStepNodes, isStepFinal } from "@/lib/trace/domain/flow-node-utils";
import type { TraceState } from "@/features/log-analyzer/model/trace-state";
import { initialTraceState } from "@/features/log-analyzer/model/trace-state";

export function generateTraceStateFromLogs(logs: LogRecord[]): Partial<TraceState> {
    if (logs.length === 0) {
        return {
            flowTree: null,
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

    const stepCount = result.flowTree ? collectStepNodes(result.flowTree).length : 0;

    return {
        flowTree: result.flowTree,
        executionMap: result.executionMap,
        mainJourneyId: result.mainJourneyId,
        correlationId,
        finalStatebag: result.finalStatebag,
        finalClaims: result.finalClaims,
        traceErrors: result.errors,
        activeStepIndex: stepCount > 0 ? 0 : null,
        isTraceModeActive: stepCount > 0,
        sessions: result.sessions,
    };
}

/**
 * Enriches a UserFlow with metadata derived from the FlowNode tree.
 * All metadata comes from the interpreter-produced FlowNode tree and finalClaims.
 */
export function enrichUserFlow(flow: UserFlow, tracePatch: Partial<TraceState>): UserFlow {
    const flowTree = tracePatch.flowTree ?? null;
    const claims = tracePatch.finalClaims ?? {};
    const steps = flowTree ? collectStepNodes(flowTree) : [];
    const latestEmail = resolveLatestEmailFromTree(steps, claims, flow.userEmail);

    return {
        ...flow,
        stepCount: steps.length,
        completed: steps.some(s => isStepFinal(s.data as StepFlowData)),
        hasErrors: steps.some(s => (s.data as StepFlowData).result === "Error"),
        cancelled: steps.some(s => {
            // A step is considered "cancelled" when the user abandoned an interactive step
            // resulting in an Error or specific result pattern
            const data = s.data as StepFlowData;
            return data.errors.some(e => e.message.includes("cancel")) ||
                (data.result === "Error" && s.children.some(c =>
                    c.type === FlowNodeType.DisplayControl || c.type === FlowNodeType.HomeRealmDiscovery
                ));
        }),
        subJourneys: [...new Set(
            flowTree
                ? collectSubJourneyIds(flowTree)
                : []
        )],
        userEmail: latestEmail,
        userObjectId: claims.objectId ?? flow.userObjectId,
    };
}

/**
 * Collects SubJourney IDs from the FlowNode tree.
 */
function collectSubJourneyIds(flowTree: FlowNode): string[] {
    const ids: string[] = [];
    const stack = [flowTree];
    while (stack.length > 0) {
        const node = stack.pop()!;
        if (node.type === FlowNodeType.SubJourney) {
            ids.push((node.data as import("@/types/flow-node").SubJourneyFlowData).journeyId);
        }
        stack.push(...node.children);
    }
    return ids;
}

function resolveLatestEmailFromTree(
    steps: FlowNode[],
    finalClaims: Record<string, string>,
    fallback?: string,
): string | undefined {
    for (let index = steps.length - 1; index >= 0; index--) {
        const stepClaims = steps[index].context.claimsSnapshot ?? {};
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