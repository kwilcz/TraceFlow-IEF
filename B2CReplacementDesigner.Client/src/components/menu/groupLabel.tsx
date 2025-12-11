import React from "react";
import { EllipsisIcon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface GroupLabelProps {
    label: string | undefined;
    isOpen: boolean | undefined;
}

/**
 * GroupLabel Component
 *
 * This component renders the label for a group of menu items.
 * It behaves differently based on whether the sidebar is open or closed.
 *
 * @param {string | undefined} label - The label text for the group
 * @param {boolean | undefined} isOpen - Whether the sidebar is open or closed
 */
export function GroupLabel({ label, isOpen }: GroupLabelProps) {
    // If there's no label, don't render anything
    if (!label) return null;

    // When the sidebar is open or in an undefined state, show the full label
    if (isOpen || isOpen === undefined) {
        return <p className="group-label open">{label}</p>;
    }

    // When the sidebar is closed, show an ellipsis icon with a tooltip
    if (!isOpen) {
        return (
            <TooltipProvider>
                <Tooltip delayDuration={100}>
                    <TooltipTrigger className="group-label closed">
                        <EllipsisIcon className="group-label-icon" />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p>{label}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // Fallback: render an empty paragraph for spacing
    return <p className="pb-2"></p>;
}