import {
    CheckCircleIcon,
    EyeIcon,
    FlagCheckeredIcon,
    FlowArrowIcon,
    FolderIcon,
    HashIcon,
    LightningIcon,
    MonitorIcon,
    MonitorPlayIcon,
    ShuffleIcon,
    TreeStructureIcon,
} from "@phosphor-icons/react";
import type { StepResult } from "@/types/trace";
import type { TreeNodeMetadata, TreeNodeType } from "../types";
import { StepStatusIcon } from "../shared/step-status";

// ============================================================================
// Tree Node Icon
// ============================================================================

interface TreeNodeIconProps {
    type: TreeNodeType;
    result?: StepResult;
    metadata?: TreeNodeMetadata;
}

/**
 * Returns the correct step icon based on priority:
 * 1. HRD step → ShuffleIcon
 * 2. Final step → FlagCheckeredIcon
 * 3. Verification step → ShieldCheckIcon
 * 4. Interactive (non-HRD) → MonitorIcon
 * 5. Default (server-side) → StepStatusIcon based on result
 */
function StepTypeIcon({ result, metadata }: Pick<TreeNodeIconProps, "result" | "metadata">) {
    if (metadata?.isHrdStep) {
        return <ShuffleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" weight="duotone" />;
    }
    if (metadata?.isFinalStep) {
        return <FlagCheckeredIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" weight="duotone" />;
    }
    if (metadata?.isInteractive && !metadata?.isHrdStep) {
        return <MonitorIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" weight="duotone" />;
    }
    // Default: status-based icon for server-side steps
    return result ? (
        <StepStatusIcon result={result} size="sm" />
    ) : (
        <HashIcon className="w-4 h-4 text-muted-foreground" />
    );
}

/**
 * Pure mapping component — returns the correct Phosphor icon for a tree node type.
 */
export function TreeNodeIcon({ type, result, metadata }: TreeNodeIconProps) {
    switch (type) {
        case "userjourney":
            return <FolderIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" weight="duotone" />;
        case "subjourney":
            return <TreeStructureIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
        case "step":
            return <StepTypeIcon result={result} metadata={metadata} />;
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
