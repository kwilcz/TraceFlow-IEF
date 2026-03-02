import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { useClaimsDiff } from "@/features/log-analyzer/debugger/use-claims-diff";
import type { Selection } from "@/features/log-analyzer/debugger/types";
import type { FlowNode, FlowNodeContext } from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";
import type { StepFlowData, TechnicalProfileFlowData, ClaimsTransformationFlowData } from "@/types/flow-node";

afterEach(cleanup);

// ============================================================================
// Helpers
// ============================================================================

function makeFlowNodeContext(claimsSnapshot: Record<string, string> = {}): FlowNodeContext {
    return {
        timestamp: new Date(),
        sequenceNumber: 0,
        logId: "test-log",
        eventType: "AUTH",
        statebagSnapshot: {},
        claimsSnapshot,
    };
}

/** Minimal Step FlowNode factory — only the fields the hook reads. */
function makeStepNode(
    stepIndex: number,
    claimsSnapshot: Record<string, string>,
    children: FlowNode[] = [],
): FlowNode {
    return {
        id: `step-${stepIndex}`,
        name: `Step ${stepIndex}`,
        type: FlowNodeType.Step,
        triggeredAtStep: stepIndex,
        lastStep: stepIndex,
        children,
        data: {
            type: FlowNodeType.Step,
            stepOrder: stepIndex,
            journeyContextId: "journey-1",
            currentJourneyName: "TestJourney",
            graphNodeId: `node-${stepIndex}`,
            result: "Success",
            isInteractiveStep: false,
            isFinalStep: false,
            isVerificationStep: false,
            technicalProfileNames: [],
            claimsTransformationNames: [],
            displayControlNames: [],
            errors: [],
            selectableOptions: [],
        } as StepFlowData,
        context: makeFlowNodeContext(claimsSnapshot),
    };
}

function makeTpNode(
    tpId: string,
    claimsSnapshot?: Record<string, string>,
    children: FlowNode[] = [],
): FlowNode {
    return {
        id: `tp-${tpId}`,
        name: tpId,
        type: FlowNodeType.TechnicalProfile,
        triggeredAtStep: 0,
        lastStep: 0,
        children,
        data: {
            type: FlowNodeType.TechnicalProfile,
            technicalProfileId: tpId,
            providerType: "TestProvider",
            claimsSnapshot,
        } as TechnicalProfileFlowData,
        context: makeFlowNodeContext(claimsSnapshot ?? {}),
    };
}

function makeCtNode(ctId: string): FlowNode {
    return {
        id: `ct-${ctId}`,
        name: ctId,
        type: FlowNodeType.ClaimsTransformation,
        triggeredAtStep: 0,
        lastStep: 0,
        children: [],
        data: {
            type: FlowNodeType.ClaimsTransformation,
            transformationId: ctId,
            inputClaims: [],
            inputParameters: [],
            outputClaims: [],
        } as ClaimsTransformationFlowData,
        context: makeFlowNodeContext(),
    };
}

/** Wraps step nodes in a root FlowNode for use with useClaimsDiff. */
function makeFlowTree(...steps: FlowNode[]): FlowNode {
    return {
        id: "root",
        name: "Root",
        type: FlowNodeType.Root,
        triggeredAtStep: 0,
        lastStep: 0,
        children: steps,
        data: { type: FlowNodeType.Root, policyId: "test-policy" },
        context: makeFlowNodeContext(),
    };
}

// ============================================================================
// Tests
// ============================================================================

describe("useClaimsDiff", () => {
    describe("diff computation", () => {
        it("detects added, modified, removed, and unchanged claims", () => {
            const flowTree = makeFlowTree(
                makeStepNode(0, { a: "1", b: "2", c: "3" }),
                makeStepNode(1, { a: "1", b: "CHANGED", d: "new" }),
            );
            const selection: Selection = { type: "step", nodeId: "step-1" };

            const { result } = renderHook(() => useClaimsDiff(selection, flowTree));

            const rowsByKey = Object.fromEntries(
                result.current.rows.map((r: { key: string; status: string; oldValue: string | null; newValue: string | null }) => [r.key, r]),
            );

            // "a" unchanged
            expect(rowsByKey["a"]).toEqual({
                key: "a",
                status: "unchanged",
                oldValue: "1",
                newValue: "1",
            });

            // "b" modified
            expect(rowsByKey["b"]).toEqual({
                key: "b",
                status: "modified",
                oldValue: "2",
                newValue: "CHANGED",
            });

            // "c" removed
            expect(rowsByKey["c"]).toEqual({
                key: "c",
                status: "removed",
                oldValue: "3",
                newValue: null,
            });

            // "d" added
            expect(rowsByKey["d"]).toEqual({
                key: "d",
                status: "added",
                oldValue: null,
                newValue: "new",
            });
        });

        it("sorts rows by status priority (Added → Modified → Removed → Unchanged) then alphabetically", () => {
            const flowTree = makeFlowTree(
                makeStepNode(0, { keep: "v", zebra: "old", beta: "old" }),
                makeStepNode(1, { keep: "v", zebra: "new", alpha: "new" }),
            );
            const selection: Selection = { type: "step", nodeId: "step-1" };

            const { result } = renderHook(() => useClaimsDiff(selection, flowTree));

            const keys = result.current.rows.map((r: { key: string }) => r.key);
            // alpha=added, zebra=modified, beta=removed, keep=unchanged
            expect(keys).toEqual(["alpha", "zebra", "beta", "keep"]);
        });

        it("treats step 0 as all-added (no predecessor)", () => {
            const flowTree = makeFlowTree(
                makeStepNode(0, { x: "val" }),
            );
            const selection: Selection = { type: "step", nodeId: "step-0" };

            const { result } = renderHook(() => useClaimsDiff(selection, flowTree));

            expect(result.current.rows).toHaveLength(1);
            expect(result.current.rows[0]).toEqual({
                key: "x",
                status: "added",
                oldValue: null,
                newValue: "val",
            });
        });
    });

    describe("null selection", () => {
        it("returns empty result when selection is null", () => {
            const flowTree = makeFlowTree(makeStepNode(0, { a: "1" }));

            const { result } = renderHook(() => useClaimsDiff(null, flowTree));

            expect(result.current.diff).toBeNull();
            expect(result.current.rows).toEqual([]);
        });
    });

    describe("selection changes", () => {
        it("returns correct result after selection changes", () => {
            const flowTree = makeFlowTree(
                makeStepNode(0, { a: "1" }),
                makeStepNode(1, { a: "2" }),
                makeStepNode(2, { a: "3" }),
            );

            const { result, rerender } = renderHook(
                ({ sel }: { sel: Selection | null }) => useClaimsDiff(sel, flowTree),
                { initialProps: { sel: { type: "step" as const, nodeId: "step-1" } } },
            );

            // Rerender with new selection
            rerender({ sel: { type: "step" as const, nodeId: "step-2" } });

            // Should reflect the latest selection (step 2)
            expect(result.current.rows.find((r: { key: string }) => r.key === "a")?.newValue).toBe("3");
        });
    });

    describe("raw diff object", () => {
        it("exposes the ClaimsDiff object", () => {
            const flowTree = makeFlowTree(
                makeStepNode(0, { keep: "v" }),
                makeStepNode(1, { keep: "v", added: "new" }),
            );
            const selection: Selection = { type: "step", nodeId: "step-1" };

            const { result } = renderHook(() => useClaimsDiff(selection, flowTree));

            expect(result.current.diff).not.toBeNull();
            expect(result.current.diff!.added).toEqual({ added: "new" });
            expect(result.current.diff!.modified).toEqual({});
            expect(result.current.diff!.removed).toEqual([]);
        });
    });

    describe("status priority sort order", () => {
        it("groups all-added keys from step 0 alphabetically", () => {
            const flowTree = makeFlowTree(
                makeStepNode(0, { z: "1", a: "2", m: "3" }),
            );
            const selection: Selection = { type: "step", nodeId: "step-0" };

            const { result } = renderHook(() => useClaimsDiff(selection, flowTree));

            // All added — sorted A-Z within the "added" group
            const keys = result.current.rows.map((r: { key: string }) => r.key);
            expect(keys).toEqual(["a", "m", "z"]);
        });
    });

    // ========================================================================
    // Per-TP Claims Diff
    // ========================================================================

    describe("technicalProfile selection", () => {
        it("TP[0] diffs against previous step snapshot", () => {
            const flowTree = makeFlowTree(
                makeStepNode(0, { a: "1" }),
                makeStepNode(1, { a: "1", b: "2" }, [
                    makeTpNode("tp-read", { a: "1", b: "2" }),
                ]),
            );
            const selection: Selection = {
                type: "technicalProfile",
                nodeId: "step-1",
                itemId: "tp-read",
            };

            const { result } = renderHook(() => useClaimsDiff(selection, flowTree));

            const rowsByKey = Object.fromEntries(
                result.current.rows.map((r: { key: string; status: string }) => [r.key, r]),
            );
            expect(rowsByKey["a"]?.status).toBe("unchanged");
            expect(rowsByKey["b"]?.status).toBe("added");
        });

        it("TP[1] diffs against TP[0] snapshot", () => {
            const flowTree = makeFlowTree(
                makeStepNode(0, { a: "1" }),
                makeStepNode(1, { a: "1", b: "2", c: "3" }, [
                    makeTpNode("tp-read", { a: "1", b: "2" }),
                    makeTpNode("tp-write", { a: "1", b: "2", c: "3" }),
                ]),
            );
            const selection: Selection = {
                type: "technicalProfile",
                nodeId: "step-1",
                itemId: "tp-write",
            };

            const { result } = renderHook(() => useClaimsDiff(selection, flowTree));

            const rowsByKey = Object.fromEntries(
                result.current.rows.map((r: { key: string; status: string }) => [r.key, r]),
            );
            // "c" was added by tp-write (not present in tp-read's snapshot)
            expect(rowsByKey["c"]?.status).toBe("added");
            // "a" and "b" are unchanged relative to tp-read
            expect(rowsByKey["a"]?.status).toBe("unchanged");
            expect(rowsByKey["b"]?.status).toBe("unchanged");
        });

        it("falls back to step-level diff when TP has no snapshot", () => {
            const flowTree = makeFlowTree(
                makeStepNode(0, { a: "1" }),
                makeStepNode(1, { a: "1", b: "new" }, [
                    makeTpNode("tp-no-snap"), // no claimsSnapshot
                ]),
            );
            const selection: Selection = {
                type: "technicalProfile",
                nodeId: "step-1",
                itemId: "tp-no-snap",
            };

            const { result } = renderHook(() => useClaimsDiff(selection, flowTree));

            // Should fall back to step-level: step1 vs step0
            const rowsByKey = Object.fromEntries(
                result.current.rows.map((r: { key: string; status: string }) => [r.key, r]),
            );
            expect(rowsByKey["b"]?.status).toBe("added");
        });

        it("falls back to step-level diff when TP id not found", () => {
            const flowTree = makeFlowTree(
                makeStepNode(0, { a: "1" }),
                makeStepNode(1, { a: "1", b: "new" }, [
                    makeTpNode("tp-read", { a: "1", b: "new" }),
                ]),
            );
            const selection: Selection = {
                type: "technicalProfile",
                nodeId: "step-1",
                itemId: "tp-nonexistent",
            };

            const { result } = renderHook(() => useClaimsDiff(selection, flowTree));

            // Falls back to step-level diff
            const rowsByKey = Object.fromEntries(
                result.current.rows.map((r: { key: string; status: string }) => [r.key, r]),
            );
            expect(rowsByKey["b"]?.status).toBe("added");
        });
    });

    describe("transformation selection", () => {
        it("finds parent TP and uses its snapshot for diff", () => {
            const flowTree = makeFlowTree(
                makeStepNode(0, { a: "1" }),
                makeStepNode(1, { a: "1", b: "2" }, [
                    makeTpNode("tp-read", { a: "1", b: "2" }, [
                        makeCtNode("ct-concat"),
                    ]),
                ]),
            );
            const selection: Selection = {
                type: "transformation",
                nodeId: "step-1",
                itemId: "ct-concat",
            };

            const { result } = renderHook(() => useClaimsDiff(selection, flowTree));

            const rowsByKey = Object.fromEntries(
                result.current.rows.map((r: { key: string; status: string }) => [r.key, r]),
            );
            expect(rowsByKey["b"]?.status).toBe("added");
            expect(rowsByKey["a"]?.status).toBe("unchanged");
        });
    });
});
