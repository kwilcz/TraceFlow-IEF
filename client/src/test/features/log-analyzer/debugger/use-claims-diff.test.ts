import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useClaimsDiff } from "@/features/log-analyzer/debugger/use-claims-diff";
import type { Selection } from "@/features/log-analyzer/debugger/types";
import type { TraceStep } from "@/types/trace";

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

/** Flush all pending microtasks so the Promise.resolve() inside the hook settles. */
async function flushMicrotasks(): Promise<void> {
    await act(async () => {
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 0);
        });
    });
}

// ============================================================================
// Tests
// ============================================================================

describe("useClaimsDiff", () => {
    describe("diff computation", () => {
        it("detects added, modified, removed, and unchanged claims", async () => {
            const steps: TraceStep[] = [
                makeStep(0, { a: "1", b: "2", c: "3" }),
                makeStep(1, { a: "1", b: "CHANGED", d: "new" }),
            ];
            const selection: Selection = { type: "step", stepIndex: 1 };

            const { result } = renderHook(() => useClaimsDiff(selection, steps));
            await flushMicrotasks();

            expect(result.current.isComputing).toBe(false);

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

        it("returns sorted rows by key", async () => {
            const steps: TraceStep[] = [
                makeStep(0, {}),
                makeStep(1, { z: "1", a: "2", m: "3" }),
            ];
            const selection: Selection = { type: "step", stepIndex: 1 };

            const { result } = renderHook(() => useClaimsDiff(selection, steps));
            await flushMicrotasks();

            const keys = result.current.rows.map((r: { key: string }) => r.key);
            expect(keys).toEqual(["a", "m", "z"]);
        });

        it("treats step 0 as all-added (no predecessor)", async () => {
            const steps: TraceStep[] = [
                makeStep(0, { x: "val" }),
            ];
            const selection: Selection = { type: "step", stepIndex: 0 };

            const { result } = renderHook(() => useClaimsDiff(selection, steps));
            await flushMicrotasks();

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
        it("returns empty result when selection is null", async () => {
            const steps: TraceStep[] = [makeStep(0, { a: "1" })];

            const { result } = renderHook(() => useClaimsDiff(null, steps));
            await flushMicrotasks();

            expect(result.current.diff).toBeNull();
            expect(result.current.rows).toEqual([]);
            expect(result.current.isComputing).toBe(false);
        });
    });

    describe("cancellation", () => {
        it("does not apply stale result after selection changes", async () => {
            const steps: TraceStep[] = [
                makeStep(0, { a: "1" }),
                makeStep(1, { a: "2" }),
                makeStep(2, { a: "3" }),
            ];

            const { result, rerender } = renderHook(
                ({ sel }: { sel: Selection | null }) => useClaimsDiff(sel, steps),
                { initialProps: { sel: { type: "step" as const, stepIndex: 1 } } },
            );

            // Immediately change selection before the first microtask settles
            rerender({ sel: { type: "step" as const, stepIndex: 2 } });
            await flushMicrotasks();

            // Should reflect the latest selection (step 2), not step 1
            expect(result.current.isComputing).toBe(false);
            expect(result.current.rows.find((r: { key: string }) => r.key === "a")?.newValue).toBe("3");
        });
    });

    describe("raw diff object", () => {
        it("exposes the ClaimsDiff object", async () => {
            const steps: TraceStep[] = [
                makeStep(0, { keep: "v" }),
                makeStep(1, { keep: "v", added: "new" }),
            ];
            const selection: Selection = { type: "step", stepIndex: 1 };

            const { result } = renderHook(() => useClaimsDiff(selection, steps));
            await flushMicrotasks();

            expect(result.current.diff).not.toBeNull();
            expect(result.current.diff!.added).toEqual({ added: "new" });
            expect(result.current.diff!.modified).toEqual({});
            expect(result.current.diff!.removed).toEqual([]);
        });
    });
});
