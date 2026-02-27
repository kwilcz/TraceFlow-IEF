import { describe, expect, it } from "vitest";
import { enrichUserFlow } from "@/features/log-analyzer/services/trace-bootstrap-service";
import type { TraceState } from "@/features/log-analyzer/model/trace-state";
import type { TraceStep, UserFlow } from "@/types/trace";

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

function makeStep(sequenceNumber: number, claimsSnapshot: Record<string, string>): TraceStep {
    return {
        sequenceNumber,
        timestamp: new Date("2026-02-27T10:00:00.000Z"),
        logId: `log-${sequenceNumber}`,
        eventType: "API",
        graphNodeId: `node-${sequenceNumber}`,
        journeyContextId: "B2C_1A_Test",
        currentJourneyName: "B2C_1A_Test",
        stepOrder: sequenceNumber + 1,
        result: "Success",
        statebagSnapshot: {},
        claimsSnapshot,
        technicalProfiles: [],
        selectableOptions: [],
        isInteractiveStep: false,
        claimsTransformations: [],
        claimsTransformationDetails: [],
        displayControls: [],
        displayControlActions: [],
        backendApiCalls: [],
    };
}

describe("enrichUserFlow email resolution", () => {
    it("uses the most recent non-null email by scanning trace steps from the end", () => {
        const flow = makeFlow({ userEmail: "existing@example.com" });
        const tracePatch: Partial<TraceState> = {
            traceSteps: [
                makeStep(0, { signInName: "Null" }),
                makeStep(1, { signInName: "latest@example.com" }),
            ],
            finalClaims: { signInName: "Null" },
        };

        const enriched = enrichUserFlow(flow, tracePatch);

        expect(enriched.userEmail).toBe("latest@example.com");
    });

    it("falls back to finalClaims when trace steps do not have a valid email", () => {
        const flow = makeFlow({ userEmail: undefined });
        const tracePatch: Partial<TraceState> = {
            traceSteps: [makeStep(0, { signInName: "Null" })],
            finalClaims: { email: "final@example.com" },
        };

        const enriched = enrichUserFlow(flow, tracePatch);

        expect(enriched.userEmail).toBe("final@example.com");
    });

    it("preserves existing flow email when no valid claim value exists", () => {
        const flow = makeFlow({ userEmail: "existing@example.com" });
        const tracePatch: Partial<TraceState> = {
            traceSteps: [makeStep(0, { signInName: "Null", email: "  " })],
            finalClaims: { signInName: "Null", email: "" },
        };

        const enriched = enrichUserFlow(flow, tracePatch);

        expect(enriched.userEmail).toBe("existing@example.com");
    });
});
