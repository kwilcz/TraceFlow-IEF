import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { DatabaseIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLogStore } from "@/stores/log-store";
import { computeClaimsDiff } from "@/types/trace";
import { useDebuggerContext } from "./debugger-context";
import { ClaimRow } from "./shared/claim-row";

// ============================================================================
// Statebag Panel
// ============================================================================

interface StatebagEntry {
    name: string;
    value: string;
    diffType?: "added" | "modified" | "removed";
    oldValue?: string;
}

/**
 * Right-hand sidebar of the debugger workspace.
 *
 * Displays the claims statebag at the currently selected step, with diff
 * highlighting against the previous step's snapshot.
 *
 * Theme-safe: uses only semantic Tailwind tokens (`text-foreground`,
 * `text-muted-foreground`, `bg-muted`, `border-border`) plus explicit
 * light/dark pairs for colored diff accents.
 */
export function StatebagPanel() {
    const { selection } = useDebuggerContext();
    const traceSteps = useLogStore(useShallow((s) => s.traceSteps));

    const activeStep = selection ? traceSteps[selection.stepIndex] : undefined;
    const previousStep =
        selection && selection.stepIndex > 0 ? traceSteps[selection.stepIndex - 1] : undefined;

    // Compute diff between previous and current statebag snapshots
    const diff = useMemo(() => {
        if (!activeStep) return { added: {}, modified: {}, removed: [] as string[] };
        const prevSnapshot = previousStep?.statebagSnapshot ?? {};
        return computeClaimsDiff(prevSnapshot, activeStep.statebagSnapshot);
    }, [activeStep, previousStep?.statebagSnapshot]);

    // Build sorted list of all entries with diff type
    const entries = useMemo(() => {
        if (!activeStep) return [];
        const result: StatebagEntry[] = [];

        // Added claims
        for (const [name, value] of Object.entries(diff.added)) {
            result.push({ name, value, diffType: "added" });
        }

        // Modified claims
        for (const [name, { oldValue, newValue }] of Object.entries(diff.modified)) {
            result.push({ name, value: newValue, diffType: "modified", oldValue });
        }

        // Unchanged claims (in current snapshot but not added/modified)
        for (const [name, value] of Object.entries(activeStep.statebagSnapshot)) {
            if (!diff.added[name] && !diff.modified[name]) {
                result.push({ name, value });
            }
        }

        // Removed claims
        for (const name of diff.removed) {
            const oldValue = previousStep?.statebagSnapshot[name] ?? "";
            result.push({ name, value: oldValue, diffType: "removed" });
        }

        return result;
    }, [diff, activeStep, previousStep?.statebagSnapshot]);

    if (!selection || !activeStep) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground p-4">
                <p className="text-xs text-center">Select a step to view statebag</p>
            </div>
        );
    }

    const changedCount =
        Object.keys(diff.added).length + Object.keys(diff.modified).length + diff.removed.length;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
                <DatabaseIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Statebag
                </h3>
                <Badge variant="outline" className="text-[10px] ml-auto">
                    Step {activeStep.stepOrder}
                </Badge>
                {changedCount > 0 && (
                    <Badge
                        variant="outline"
                        className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-400"
                    >
                        {changedCount} changed
                    </Badge>
                )}
            </div>

            {/* Claims list */}
            <ScrollArea className="flex-1">
                <div className="p-3 space-y-1.5">
                    {entries.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                            No claims at this step
                        </p>
                    )}
                    {entries.map((entry) => (
                        <ClaimRow
                            key={entry.name}
                            name={entry.name}
                            value={entry.value}
                            diffType={entry.diffType}
                            oldValue={entry.oldValue}
                        />
                    ))}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground shrink-0">
                <span>{entries.length} claims</span>
            </div>
        </div>
    );
}
