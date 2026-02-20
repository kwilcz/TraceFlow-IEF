import { useEffect, useRef } from "react";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TreeNode } from "../types";
import { DurationBadge } from "../shared/duration-badge";
import { TreeNodeIcon } from "./tree-node-icon";

// ============================================================================
// Tree Node Row
// ============================================================================

interface TreeNodeRowProps {
    node: TreeNode;
    depth: number;
    isSelected: boolean;
    isExpanded: boolean;
    onSelect: () => void;
    onToggleExpand: () => void;
    /** Render props for recursion — avoids circular dependency. */
    renderChildren: (children: TreeNode[], depth: number) => React.ReactNode;
}

// -------------- Label style mapping per node type ---------------------------

const labelStyles: Record<string, string> = {
    step: "font-medium text-sm text-foreground",
    userjourney: "font-medium text-sm text-foreground truncate",
    subjourney: "font-medium text-sm text-foreground truncate",
    hrd: "text-xs font-medium text-amber-700 dark:text-amber-300",
    selectedOption: "text-xs text-emerald-700 dark:text-emerald-300",
    technicalProfile: "text-xs break-all text-violet-700 dark:text-violet-300",
    dcTechnicalProfile: "text-xs break-all text-violet-600 dark:text-violet-400",
    transformation: "text-xs break-all text-cyan-700 dark:text-cyan-300",
    dcTransformation: "text-xs break-all text-cyan-600 dark:text-cyan-400",
    displayControl: "text-xs text-orange-700 dark:text-orange-300",
};

// -------------- Click handler with per-type semantics -----------------------

function handleRowClick(
    node: TreeNode,
    isSelected: boolean,
    isExpanded: boolean,
    onSelect: () => void,
    onToggleExpand: () => void,
) {
    switch (node.type) {
        case "userjourney":
        case "subjourney":
            onToggleExpand();
            break;
        case "step":
            onSelect();
            if (isSelected) onToggleExpand();
            break;
        case "displayControl":
            onSelect();
            if (!isExpanded) onToggleExpand();
            break;
        default:
            onSelect();
            break;
    }
}

// -------------- Badges ------------------------------------------------------

function NodeBadges({ node }: { node: TreeNode }) {
    const { type, metadata } = node;

    return (
        <>
            {type === "hrd" && (
                <>
                    <Badge variant="outline" className="text-[10px]">
                        HRD
                    </Badge>
                    {(metadata?.selectableOptions?.length ?? 0) > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                            {metadata!.selectableOptions!.length}
                        </Badge>
                    )}
                </>
            )}

            {type === "step" && metadata?.result === "Error" && (
                <Badge variant="destructive" className="text-[10px]">
                    ERR
                </Badge>
            )}

            {type === "displayControl" && metadata?.resultCode && (
                <Badge variant="outline" className="text-[10px]">
                    {metadata.resultCode}
                </Badge>
            )}

            {type === "step" && metadata?.duration !== undefined && (
                <DurationBadge durationMs={metadata.duration} />
            )}
        </>
    );
}

// -------------- TreeNodeRow -------------------------------------------------

export function TreeNodeRow({
    node,
    depth,
    isSelected,
    isExpanded,
    onSelect,
    onToggleExpand,
    renderChildren,
}: TreeNodeRowProps) {
    const rowRef = useRef<HTMLDivElement>(null);
    const hasChildren = (node.children?.length ?? 0) > 0;

    // Auto-scroll when selected
    useEffect(() => {
        if (isSelected) {
            rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }, [isSelected]);

    return (
        <>
            <div
                ref={rowRef}
                className={cn(
                    "flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
                    "hover:bg-accent/50",
                    isSelected && "bg-primary/10 ring-1 ring-primary",
                )}
                style={{ paddingLeft: `${8 + depth * 16}px` }}
                onClick={() => handleRowClick(node, isSelected, isExpanded, onSelect, onToggleExpand)}
            >
                {/* Chevron */}
                {hasChildren ? (
                    <button
                        type="button"
                        className="p-0 h-auto w-auto shrink-0"
                        tabIndex={-1}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand();
                        }}
                    >
                        {isExpanded ? (
                            <CaretDownIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                            <CaretRightIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                    </button>
                ) : (
                    <span className="w-3.5 shrink-0" />
                )}

                {/* Icon */}
                <span className="shrink-0">
                    <TreeNodeIcon type={node.type} result={node.metadata?.result} />
                </span>

                {/* Label */}
                <span className={cn("min-w-0", labelStyles[node.type] ?? "text-xs text-foreground")}>
                    {node.label}
                </span>

                {/* Badges */}
                <span className="ml-auto flex items-center gap-1 shrink-0">
                    <NodeBadges node={node} />
                </span>
            </div>

            {/* Children (recursive) */}
            {isExpanded && hasChildren && renderChildren(node.children!, depth + 1)}
        </>
    );
}
