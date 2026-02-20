import { useEffect, useState } from "react";
import { computeClaimsDiff, type ClaimsDiff, type TraceStep } from "@/types/trace";
import type { Selection } from "./types";

// ============================================================================
// Types
// ============================================================================

export type ClaimRowStatus = "added" | "modified" | "removed" | "unchanged";

export interface ClaimDiffRow {
    key: string;
    status: ClaimRowStatus;
    oldValue: string | null;
    newValue: string | null;
}

export interface ClaimsDiffResult {
    /** Raw diff object from computeClaimsDiff. */
    diff: ClaimsDiff | null;
    /** Flat, sorted array of rows for table rendering. */
    rows: ClaimDiffRow[];
    /** True while the async computation is in-flight. */
    isComputing: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function buildRows(
    diff: ClaimsDiff,
    before: Record<string, string>,
    after: Record<string, string>,
): ClaimDiffRow[] {
    const rows: ClaimDiffRow[] = [];

    // Added
    for (const [key, value] of Object.entries(diff.added)) {
        rows.push({ key, status: "added", oldValue: null, newValue: value });
    }

    // Modified
    for (const [key, { oldValue, newValue }] of Object.entries(diff.modified)) {
        rows.push({ key, status: "modified", oldValue, newValue });
    }

    // Removed
    for (const key of diff.removed) {
        rows.push({ key, status: "removed", oldValue: before[key] ?? null, newValue: null });
    }

    // Unchanged — keys present in both snapshots that aren't added/modified/removed
    const changedKeys = new Set([
        ...Object.keys(diff.added),
        ...Object.keys(diff.modified),
        ...diff.removed,
    ]);

    for (const [key, value] of Object.entries(after)) {
        if (!changedKeys.has(key)) {
            rows.push({ key, status: "unchanged", oldValue: before[key] ?? null, newValue: value });
        }
    }

    // Sort alphabetically by key for stable ordering
    rows.sort((a, b) => a.key.localeCompare(b.key));
    return rows;
}

// ============================================================================
// Hook
// ============================================================================

const EMPTY_SNAPSHOT: Record<string, string> = {};

/**
 * Computes a claims diff between the selected step and its predecessor.
 *
 * Uses an AbortController pattern so that rapid selection changes cancel any
 * in-flight computation, preventing stale results from overwriting newer ones.
 *
 * The underlying `computeClaimsDiff` is fast and synchronous (<2 ms), so the
 * async pattern is primarily future-proofing for heavier computations.
 */
export function useClaimsDiff(
    selection: Selection | null,
    traceSteps: TraceStep[],
): ClaimsDiffResult {
    const [result, setResult] = useState<ClaimsDiffResult>({
        diff: null,
        rows: [],
        isComputing: false,
    });

    // Extract stepIndex to avoid re-computing on same-step selection changes
    // (e.g., selecting a TP within the same step)
    const stepIndex = selection?.stepIndex ?? -1;

    useEffect(() => {
        // No selection or invalid index → empty result
        if (stepIndex < 0) {
            setResult({ diff: null, rows: [], isComputing: false });
            return;
        }

        const currentStep = traceSteps[stepIndex];

        // Guard: invalid index
        if (!currentStep) {
            setResult({ diff: null, rows: [], isComputing: false });
            return;
        }

        const controller = new AbortController();
        const { signal } = controller;

        // Mark as computing
        setResult((prev) => ({ ...prev, isComputing: true }));

        // Simulate async boundary (microtask) for cancellation semantics
        void Promise.resolve().then(() => {
            if (signal.aborted) return;

            const after = currentStep.claimsSnapshot ?? EMPTY_SNAPSHOT;
            const before =
                stepIndex > 0
                    ? (traceSteps[stepIndex - 1]?.claimsSnapshot ?? EMPTY_SNAPSHOT)
                    : EMPTY_SNAPSHOT;

            const diff = computeClaimsDiff(before, after);
            const rows = buildRows(diff, before, after);

            if (signal.aborted) return;

            setResult({ diff, rows, isComputing: false });
        });

        return () => {
            controller.abort();
        };
    }, [stepIndex, traceSteps]);

    return result;
}
