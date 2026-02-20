import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { useClaimsDiff } from "@/features/log-analyzer/debugger/use-claims-diff";
import type { Selection } from "@/features/log-analyzer/debugger/types";
import type { TraceStep, TechnicalProfileDetail } from "@/types/trace";

afterEach(cleanup);

// ============================================================================
// Helpers
// ============================================================================

/** Minimal TraceStep factory — only the fields the hook reads. */
function makeStep(
    index: number,
    claimsSnapshot: Record<string, string>,
): TraceStep {
    return {
        sequenceNumber: index,
        timestamp: new Date(),
        logId: `log-${index}`,
        eventType: "AUTH",
        graphNodeId: `node-${index}`,
        journeyContextId: "journey-1",
        currentJourneyName: "TestJourney",
        stepOrder: index,
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
    } as TraceStep;
}

// ============================================================================
// Tests
// ============================================================================

describe("useClaimsDiff", () => {
    describe("diff computation", () => {
        it("detects added, modified, removed, and unchanged claims", () => {
            const steps: TraceStep[] = [
                makeStep(0, { a: "1", b: "2", c: "3" }),
                makeStep(1, { a: "1", b: "CHANGED", d: "new" }),
            ];
            const selection: Selection = { type: "step", stepIndex: 1 };

            const { result } = renderHook(() => useClaimsDiff(selection, steps));

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
            const steps: TraceStep[] = [
                makeStep(0, { keep: "v", zebra: "old", beta: "old" }),
                makeStep(1, { keep: "v", zebra: "new", alpha: "new" }),
            ];
            const selection: Selection = { type: "step", stepIndex: 1 };

            const { result } = renderHook(() => useClaimsDiff(selection, steps));

            const keys = result.current.rows.map((r: { key: string }) => r.key);
            // alpha=added, zebra=modified, beta=removed, keep=unchanged
            expect(keys).toEqual(["alpha", "zebra", "beta", "keep"]);
        });

        it("treats step 0 as all-added (no predecessor)", () => {
            const steps: TraceStep[] = [
                makeStep(0, { x: "val" }),
            ];
            const selection: Selection = { type: "step", stepIndex: 0 };

            const { result } = renderHook(() => useClaimsDiff(selection, steps));

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
            const steps: TraceStep[] = [makeStep(0, { a: "1" })];

            const { result } = renderHook(() => useClaimsDiff(null, steps));

            expect(result.current.diff).toBeNull();
            expect(result.current.rows).toEqual([]);
        });
    });

    describe("selection changes", () => {
        it("returns correct result after selection changes", () => {
            const steps: TraceStep[] = [
                makeStep(0, { a: "1" }),
                makeStep(1, { a: "2" }),
                makeStep(2, { a: "3" }),
            ];

            const { result, rerender } = renderHook(
                ({ sel }: { sel: Selection | null }) => useClaimsDiff(sel, steps),
                { initialProps: { sel: { type: "step" as const, stepIndex: 1 } } },
            );

            // Rerender with new selection
            rerender({ sel: { type: "step" as const, stepIndex: 2 } });

            // Should reflect the latest selection (step 2)
            expect(result.current.rows.find((r: { key: string }) => r.key === "a")?.newValue).toBe("3");
        });
    });

    describe("raw diff object", () => {
        it("exposes the ClaimsDiff object", () => {
            const steps: TraceStep[] = [
                makeStep(0, { keep: "v" }),
                makeStep(1, { keep: "v", added: "new" }),
            ];
            const selection: Selection = { type: "step", stepIndex: 1 };

            const { result } = renderHook(() => useClaimsDiff(selection, steps));

            expect(result.current.diff).not.toBeNull();
            expect(result.current.diff!.added).toEqual({ added: "new" });
            expect(result.current.diff!.modified).toEqual({});
            expect(result.current.diff!.removed).toEqual([]);
        });
    });

    describe("status priority sort order", () => {
        it("groups all-added keys from step 0 alphabetically", () => {
            const steps: TraceStep[] = [
                makeStep(0, { z: "1", a: "2", m: "3" }),
            ];
            const selection: Selection = { type: "step", stepIndex: 0 };

            const { result } = renderHook(() => useClaimsDiff(selection, steps));

            // All added — sorted A-Z within the "added" group
            const keys = result.current.rows.map((r: { key: string }) => r.key);
            expect(keys).toEqual(["a", "m", "z"]);
        });
    });

    // ========================================================================
    // Per-TP Claims Diff
    // ========================================================================

    describe("technicalProfile selection", () => {
        function makeTpDetail(
            id: string,
            claimsSnapshot?: Record<string, string>,
        ): TechnicalProfileDetail {
            return { id, providerType: "TestProvider", claimsSnapshot };
        }

        function makeStepWithTps(
            index: number,
            claimsSnapshot: Record<string, string>,
            tpDetails: TechnicalProfileDetail[],
        ): TraceStep {
            const step = makeStep(index, claimsSnapshot);
            step.technicalProfileDetails = tpDetails;
            return step;
        }

        it("TP[0] diffs against previous step snapshot", () => {
            const steps: TraceStep[] = [
                makeStep(0, { a: "1" }),
                makeStepWithTps(1, { a: "1", b: "2" }, [
                    makeTpDetail("tp-read", { a: "1", b: "2" }),
                ]),
            ];
            const selection: Selection = {
                type: "technicalProfile",
                stepIndex: 1,
                itemId: "tp-read",
            };

            const { result } = renderHook(() => useClaimsDiff(selection, steps));

            const rowsByKey = Object.fromEntries(
                result.current.rows.map((r: { key: string; status: string }) => [r.key, r]),
            );
            expect(rowsByKey["a"]?.status).toBe("unchanged");
            expect(rowsByKey["b"]?.status).toBe("added");
        });

        it("TP[1] diffs against TP[0] snapshot", () => {
            const steps: TraceStep[] = [
                makeStep(0, { a: "1" }),
                makeStepWithTps(1, { a: "1", b: "2", c: "3" }, [
                    makeTpDetail("tp-read", { a: "1", b: "2" }),
                    makeTpDetail("tp-write", { a: "1", b: "2", c: "3" }),
                ]),
            ];
            const selection: Selection = {
                type: "technicalProfile",
                stepIndex: 1,
                itemId: "tp-write",
            };

            const { result } = renderHook(() => useClaimsDiff(selection, steps));

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
            const steps: TraceStep[] = [
                makeStep(0, { a: "1" }),
                makeStepWithTps(1, { a: "1", b: "new" }, [
                    makeTpDetail("tp-no-snap"), // no claimsSnapshot
                ]),
            ];
            const selection: Selection = {
                type: "technicalProfile",
                stepIndex: 1,
                itemId: "tp-no-snap",
            };

            const { result } = renderHook(() => useClaimsDiff(selection, steps));

            // Should fall back to step-level: step1 vs step0
            const rowsByKey = Object.fromEntries(
                result.current.rows.map((r: { key: string; status: string }) => [r.key, r]),
            );
            expect(rowsByKey["b"]?.status).toBe("added");
        });

        it("falls back to step-level diff when TP id not found", () => {
            const steps: TraceStep[] = [
                makeStep(0, { a: "1" }),
                makeStepWithTps(1, { a: "1", b: "new" }, [
                    makeTpDetail("tp-read", { a: "1", b: "new" }),
                ]),
            ];
            const selection: Selection = {
                type: "technicalProfile",
                stepIndex: 1,
                itemId: "tp-nonexistent",
            };

            const { result } = renderHook(() => useClaimsDiff(selection, steps));

            // Falls back to step-level diff
            const rowsByKey = Object.fromEntries(
                result.current.rows.map((r: { key: string; status: string }) => [r.key, r]),
            );
            expect(rowsByKey["b"]?.status).toBe("added");
        });
    });

    describe("transformation selection", () => {
        it("finds parent TP and uses its snapshot for diff", () => {
            const steps: TraceStep[] = [
                makeStep(0, { a: "1" }),
                {
                    ...makeStep(1, { a: "1", b: "2" }),
                    technicalProfileDetails: [
                        {
                            id: "tp-read",
                            providerType: "TestProvider",
                            claimsTransformations: [
                                {
                                    id: "ct-concat",
                                    inputClaims: [],
                                    inputParameters: [],
                                    outputClaims: [],
                                },
                            ],
                            claimsSnapshot: { a: "1", b: "2" },
                        },
                    ],
                } as TraceStep,
            ];
            const selection: Selection = {
                type: "transformation",
                stepIndex: 1,
                itemId: "ct-concat",
            };

            const { result } = renderHook(() => useClaimsDiff(selection, steps));

            const rowsByKey = Object.fromEntries(
                result.current.rows.map((r: { key: string; status: string }) => [r.key, r]),
            );
            expect(rowsByKey["b"]?.status).toBe("added");
            expect(rowsByKey["a"]?.status).toBe("unchanged");
        });
    });
});
