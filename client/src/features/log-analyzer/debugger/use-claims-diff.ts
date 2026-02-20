import { useMemo } from "react";
import { computeClaimsDiff, type ClaimsDiff, type TraceStep } from "@/types/trace";
import type { Selection } from "./types";

// ============================================================================
// Types
// ============================================================================

export type ClaimRowStatus = "added" | "modified" | "removed" | "unchanged";

export const CLAIM_STATUSES: readonly ClaimRowStatus[] = ["added", "modified", "removed", "unchanged"] as const;

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
}

// ============================================================================
// Helpers
// ============================================================================

/** Sort priority: changes bubble to the top, unchanged sinks to the bottom. */
const STATUS_PRIORITY: Record<ClaimRowStatus, number> = {
    added: 0,
    modified: 1,
    removed: 2,
    unchanged: 3,
};

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

    // Sort by status priority first, then alphabetically by key within each group
    rows.sort((a, b) => {
        const s = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
        return s !== 0 ? s : a.key.localeCompare(b.key);
    });
    return rows;
}

/**
 * Resolves before/after snapshots for a TP selection.
 * TP[0] diffs against the previous step; TP[i] diffs against TP[i-1].
 */
function resolveTpSnapshots(
    currentStep: TraceStep,
    prevStep: TraceStep | undefined,
    itemId: string | undefined,
): { before: Record<string, string>; after: Record<string, string> } | null {
    const details = currentStep.technicalProfileDetails;
    if (!details?.length || !itemId) return null;

    const tpIndex = details.findIndex((d) => d.id === itemId);
    if (tpIndex < 0) return null;

    const tp = details[tpIndex];
    if (!tp.claimsSnapshot) return null;

    const after = tp.claimsSnapshot;
    const before =
        tpIndex > 0
            ? details[tpIndex - 1].claimsSnapshot ?? EMPTY_SNAPSHOT
            : prevStep?.claimsSnapshot ?? EMPTY_SNAPSHOT;

    return { before, after };
}

/**
 * Resolves before/after snapshots for a transformation selection.
 * Finds the parent TP containing the CT and uses that TP's snapshot.
 */
function resolveCtSnapshots(
    currentStep: TraceStep,
    prevStep: TraceStep | undefined,
    itemId: string | undefined,
): { before: Record<string, string>; after: Record<string, string> } | null {
    const details = currentStep.technicalProfileDetails;
    if (!details?.length || !itemId) return null;

    const tpIndex = details.findIndex(
        (d) => d.claimsTransformations?.some((ct) => ct.id === itemId),
    );
    if (tpIndex < 0) return null;

    const tp = details[tpIndex];
    if (!tp.claimsSnapshot) return null;

    const after = tp.claimsSnapshot;
    const before =
        tpIndex > 0
            ? details[tpIndex - 1].claimsSnapshot ?? EMPTY_SNAPSHOT
            : prevStep?.claimsSnapshot ?? EMPTY_SNAPSHOT;

    return { before, after };
}

// ============================================================================
// Hook
// ============================================================================

const EMPTY_SNAPSHOT: Record<string, string> = {};
const EMPTY_RESULT: ClaimsDiffResult = { diff: null, rows: [] };

/**
 * Computes a claims diff between the selected item and its predecessor.
 *
 * - **step / hrd / displayControl** → step-level diff (current vs previous step)
 * - **technicalProfile** → per-TP diff (TP[i] vs TP[i-1] or prev step)
 * - **transformation** → parent TP diff (same logic as TP selection)
 *
 * Pure derived computation via `useMemo` — no async, no AbortController.
 * The underlying `computeClaimsDiff` is fast and synchronous (<2 ms).
 */
export function useClaimsDiff(
    selection: Selection | null,
    traceSteps: TraceStep[],
): ClaimsDiffResult {
    const stepIndex = selection?.stepIndex ?? -1;
    const selectionType = selection?.type;
    const selectionItemId = selection?.itemId;

    // Extract the two relevant steps OUTSIDE the useMemo
    const currentStep = traceSteps[stepIndex] as TraceStep | undefined;
    const prevStep = stepIndex > 0 ? traceSteps[stepIndex - 1] : undefined;

    return useMemo(() => {
        if (!currentStep) return EMPTY_RESULT;

        let before: Record<string, string>;
        let after: Record<string, string>;

        if (selectionType === "technicalProfile") {
            const resolved = resolveTpSnapshots(currentStep, prevStep, selectionItemId);
            if (resolved) {
                before = resolved.before;
                after = resolved.after;
            } else {
                // Fall back to step-level diff
                after = currentStep.claimsSnapshot ?? EMPTY_SNAPSHOT;
                before = prevStep?.claimsSnapshot ?? EMPTY_SNAPSHOT;
            }
        } else if (selectionType === "transformation") {
            const resolved = resolveCtSnapshots(currentStep, prevStep, selectionItemId);
            if (resolved) {
                before = resolved.before;
                after = resolved.after;
            } else {
                // Fall back to step-level diff
                after = currentStep.claimsSnapshot ?? EMPTY_SNAPSHOT;
                before = prevStep?.claimsSnapshot ?? EMPTY_SNAPSHOT;
            }
        } else {
            // step, hrd, displayControl — step-level diff
            after = currentStep.claimsSnapshot ?? EMPTY_SNAPSHOT;
            before = prevStep?.claimsSnapshot ?? EMPTY_SNAPSHOT;
        }

        const diff = computeClaimsDiff(before, after);
        const rows = buildRows(diff, before, after);
        return { diff, rows };
    }, [currentStep, prevStep, selectionType, selectionItemId]);
}
