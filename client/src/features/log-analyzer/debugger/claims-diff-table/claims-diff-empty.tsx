import { ListMagnifyingGlass } from "@phosphor-icons/react";

// ============================================================================
// Claims Diff Empty States
// ============================================================================

interface ClaimsDiffEmptyProps {
    hasSelection: boolean;
}

export function ClaimsDiffEmpty({ hasSelection }: ClaimsDiffEmptyProps) {
    if (!hasSelection) {
        return (
            <div className="flex items-center justify-center h-full py-8 text-muted-foreground">
                <p className="text-xs text-center">Select a step to view claims diff</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full py-8 gap-2 text-muted-foreground">
            <ListMagnifyingGlass className="size-8 opacity-40" />
            <p className="text-xs text-center">No claims at this step</p>
        </div>
    );
}
