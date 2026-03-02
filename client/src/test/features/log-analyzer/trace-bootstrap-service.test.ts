import { describe, expect, it } from "vitest";
import { enrichUserFlow } from "@/features/log-analyzer/services/trace-bootstrap-service";
import type { TraceState } from "@/features/log-analyzer/model/trace-state";
import type { UserFlow } from "@/types/trace";
import type { FlowNode, FlowNodeContext, StepFlowData } from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";

function makeFlow(overrides?: Partial<UserFlow>): UserFlow {
    return {
        id: "flow-1",
        correlationId: "corr-1",
        policyId: "B2C_1A_Test",
        startTime: new Date("2026-02-27T10:00:00.000Z"),
        endTime: new Date("2026-02-27T10:05:00.000Z"),
        stepCount: 0,
        completed: false,
        hasErrors: false,
        cancelled: false,
        subJourneys: [],
        logIds: ["log-1"],
        userEmail: "existing@example.com",
        userObjectId: "oid-1",
        ...overrides,
    };
}

function makeMinimalContext(claimsSnapshot: Record<string, string> = {}): FlowNodeContext {
    return {
        timestamp: new Date("2026-02-27T10:00:00.000Z"),
        sequenceNumber: 0,
        logId: "log-1",
        eventType: "API",
        statebagSnapshot: {},
        claimsSnapshot,
    };
}

function makeStepNode(sequenceNumber: number, claimsSnapshot: Record<string, string>): FlowNode {
    return {
        id: `step-root-${sequenceNumber + 1}`,
        name: `Step ${sequenceNumber + 1}`,
        type: FlowNodeType.Step,
        triggeredAtStep: sequenceNumber + 1,
        lastStep: sequenceNumber + 1,
        children: [],
        data: {
            type: FlowNodeType.Step,
            stepOrder: sequenceNumber + 1,
            currentJourneyName: "B2C_1A_Test",
            result: "Success",
            errors: [],
            selectableOptions: [],
        } satisfies StepFlowData,
        context: makeMinimalContext(claimsSnapshot),
    };
}

function makeFlowTree(steps: FlowNode[]): FlowNode {
    return {
        id: "root",
        name: "B2C_1A_Test",
        type: FlowNodeType.Root,
        triggeredAtStep: 0,
        lastStep: 0,
        children: steps,
        data: { type: FlowNodeType.Root, policyId: "B2C_1A_Test" },
        context: makeMinimalContext(),
    };
}

describe("enrichUserFlow email resolution", () => {
    it("uses the most recent non-null email by scanning trace steps from the end", () => {
        const flow = makeFlow({ userEmail: "existing@example.com" });
        const tracePatch: Partial<TraceState> = {
            flowTree: makeFlowTree([
                makeStepNode(0, { signInName: "Null" }),
                makeStepNode(1, { signInName: "latest@example.com" }),
            ]),
            finalClaims: { signInName: "Null" },
        };

        const enriched = enrichUserFlow(flow, tracePatch);

        expect(enriched.userEmail).toBe("latest@example.com");
    });

    it("falls back to finalClaims when trace steps do not have a valid email", () => {
        const flow = makeFlow({ userEmail: undefined });
        const tracePatch: Partial<TraceState> = {
            flowTree: makeFlowTree([
                makeStepNode(0, { signInName: "Null" }),
            ]),
            finalClaims: { email: "final@example.com" },
        };

        const enriched = enrichUserFlow(flow, tracePatch);

        expect(enriched.userEmail).toBe("final@example.com");
    });

    it("preserves existing flow email when no valid claim value exists", () => {
        const flow = makeFlow({ userEmail: "existing@example.com" });
        const tracePatch: Partial<TraceState> = {
            flowTree: makeFlowTree([
                makeStepNode(0, { signInName: "Null", email: "  " }),
            ]),
            finalClaims: { signInName: "Null", email: "" },
        };

        const enriched = enrichUserFlow(flow, tracePatch);

        expect(enriched.userEmail).toBe("existing@example.com");
    });
});
