import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

// ============================================================================
// Copy Button
// ============================================================================

/**
 * Compact copy-to-clipboard button with icon-swap + tooltip feedback.
 *
 * On successful copy the icon swaps to a check mark and the tooltip reads
 * "Copied!" for 2 seconds, then reverts. No toast — the inline feedback
 * is sufficient and avoids sonner coupling.
 */
export const CopyButton: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => () => clearTimeout(timerRef.current), []);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard API unavailable — silently ignore */
        }
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-xs" onClick={handleCopy}>
                    {copied ? (
                        <CheckIcon className="text-success" />
                    ) : (
                        <CopyIcon className="text-muted-foreground" />
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
                {copied ? "Copied!" : `Copy ${label ?? "value"}`}
            </TooltipContent>
        </Tooltip>
    );
};
