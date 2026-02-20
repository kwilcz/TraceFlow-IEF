import {
    CheckCircleIcon,
    EyeIcon,
    FlowArrowIcon,
    FolderIcon,
    HashIcon,
    LightningIcon,
    MonitorPlayIcon,
    TreeStructureIcon,
} from "@phosphor-icons/react";
import type { TraceStep } from "@/types/trace";
import type { TreeNodeType } from "../types";
import { StepStatusIcon } from "../shared/step-status";

// ============================================================================
// Tree Node Icon
// ============================================================================

interface TreeNodeIconProps {
    type: TreeNodeType;
    result?: TraceStep["result"];
}

/**
 * Pure mapping component — returns the correct Phosphor icon for a tree node type.
 */
export function TreeNodeIcon({ type, result }: TreeNodeIconProps) {
    switch (type) {
        case "userjourney":
            return <FolderIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" weight="duotone" />;
        case "subjourney":
            return <TreeStructureIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
        case "step":
            return result ? (
                <StepStatusIcon result={result} size="sm" />
            ) : (
                <HashIcon className="w-4 h-4 text-muted-foreground" />
            );
        case "technicalProfile":
            return <FlowArrowIcon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />;
        case "dcTechnicalProfile":
            return <FlowArrowIcon className="w-3.5 h-3.5 text-violet-500 dark:text-violet-300" />;
        case "transformation":
            return <LightningIcon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
        case "dcTransformation":
            return <LightningIcon className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-300" />;
        case "hrd":
            return <EyeIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
        case "selectedOption":
            return <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
        case "displayControl":
            return <MonitorPlayIcon className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />;
        default:
            return <HashIcon className="w-3.5 h-3.5 text-muted-foreground" />;
    }
}
