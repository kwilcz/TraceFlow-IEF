"use client";

import React, { useMemo, useState } from "react";
import { useLogStore } from "@/stores/log-store";
import { computeClaimsDiff, type TraceStep } from "@/types/trace";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    ChevronRight,
    ChevronDown,
    Activity,
    Layers,
    Database,
    GitBranch,
    Play,
    Workflow,
    Zap,
    Settings2,
    ExternalLink,
    Server,
    Clock,
    Search,
    ChevronLeft,
    ArrowRight,
    Eye,
    CheckCircle2,
    XCircle,
    SkipForward,
    AlertTriangle,
    Copy,
    Check,
    Hash,
    FolderTree,
    List,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    StepPanel,
    TechnicalProfilePanel,
    ClaimsTransformationPanel,
    HrdPanel,
    DisplayControlPanel,
} from "./panels";
import { toast } from "sonner";

// ============================================================================
// Shared Components with Theme-Safe Styling
// ============================================================================

/**
 * Status icon component with consistent sizing.
 */
const StepStatusIcon: React.FC<{
    result: TraceStep["result"];
    size?: "sm" | "md" | "lg";
}> = ({ result, size = "md" }) => {
    const sizeClasses = {
        sm: "w-3.5 h-3.5",
        md: "w-4 h-4",
        lg: "w-5 h-5",
    };
    const cls = sizeClasses[size];

    switch (result) {
        case "Success":
            return <CheckCircle2 className={cn(cls, "text-emerald-600 dark:text-emerald-400")} />;
        case "Error":
            return <XCircle className={cn(cls, "text-red-600 dark:text-red-400")} />;
        case "Skipped":
            return <SkipForward className={cn(cls, "text-amber-600 dark:text-amber-400")} />;
        case "PendingInput":
            return <Clock className={cn(cls, "text-blue-600 dark:text-blue-400")} />;
        default:
            return <Clock className={cn(cls, "text-muted-foreground")} />;
    }
};

/**
 * Status badge with theme-safe colors.
 */
const StepStatusBadge: React.FC<{ result: TraceStep["result"] }> = ({ result }) => {
    const variants: Record<TraceStep["result"], string> = {
        Success: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
        Error: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
        Skipped: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
        PendingInput: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700",
    };

    return (
        <Badge variant="outline" className={cn("text-xs gap-1", variants[result])}>
            <StepStatusIcon result={result} size="sm" />
            {result}
        </Badge>
    );
};

/**
 * Duration badge with warning colors for slow steps.
 */
const DurationBadge: React.FC<{ durationMs?: number }> = ({ durationMs }) => {
    if (durationMs === undefined) return null;

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    };

    const isWarning = durationMs > 5000;
    const isError = durationMs > 15000;

    return (
        <Badge
            variant="outline"
            className={cn(
                "text-xs font-mono gap-1",
                isError && "text-red-600 border-red-400 dark:text-red-400 dark:border-red-600",
                isWarning && !isError && "text-amber-600 border-amber-400 dark:text-amber-400 dark:border-amber-600",
                !isWarning && "text-muted-foreground border-border"
            )}
        >
            <Clock className="w-3 h-3" />
            {formatDuration(durationMs)}
        </Badge>
    );
};

/**
 * Copy button with feedback.
 */
const CopyButton: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            toast.success(label ? `Copied ${label}` : "Copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy");
        }
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-6 w-6 p-0 hover:bg-accent"
                    >
                        {copied ? (
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <Copy className="w-3 h-3 text-muted-foreground" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Copy {label || "to clipboard"}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

/**
 * Error details display - shows as a field row rather than an alert.
 * Used for step-level errors with HResult codes.
 */
const ErrorDetails: React.FC<{ message: string; hResult?: string }> = ({ message, hResult }) => (
    <div className="space-y-1.5">
        <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Message</span>
            <span className="text-sm text-red-700 dark:text-red-400 break-words">{message}</span>
        </div>
        {hResult && (
            <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">HResult</span>
                <code className="text-sm font-mono text-red-700 dark:text-red-400">0x{hResult}</code>
            </div>
        )}
    </div>
);

/**
 * Simple error message for parsing/system errors.
 */
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
    <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
);

// ============================================================================
// Tree View Components
// ============================================================================

/**
 * Selection state for tree items.
 */
interface Selection {
    type: "step" | "technicalProfile" | "transformation" | "hrd" | "displayControl";
    stepIndex: number;
    itemId?: string; // For TP, CT, or selected option
    metadata?: Record<string, unknown>; // For displayControl specific data
}

/**
 * Tree structure for organizing trace data.
 */
interface TreeNode {
    id: string;
    label: string;
    type: "subjourney" | "step" | "technicalProfile" | "transformation" | "hrd" | "selectedOption" | "displayControl" | "dcTechnicalProfile" | "dcTransformation";
    children?: TreeNode[];
    step?: TraceStep;
    stepIndex?: number;
    metadata?: {
        result?: TraceStep["result"];
        isInteractive?: boolean;
        isHrdStep?: boolean;
        duration?: number;
        tpCount?: number;
        ctCount?: number;
        isHrdSelection?: boolean;
        selectedOption?: string;
        selectableOptions?: string[];
        // Display control specific
        displayControlId?: string;
        action?: string;
        technicalProfileId?: string;
        resultCode?: string;
        // For DC nested items
        parentDisplayControlId?: string;
        // For TP nested CTs
        parentTechnicalProfileId?: string;
    };
}

/**
 * Builds tree structure from trace steps.
 */
function buildTreeStructure(traceSteps: TraceStep[]): TreeNode[] {
    // Group by SubJourney
    const subJourneyMap = new Map<string, TraceStep[]>();
    
    for (const step of traceSteps) {
        const journeyId = step.journeyContextId || "MainJourney";
        if (!subJourneyMap.has(journeyId)) {
            subJourneyMap.set(journeyId, []);
        }
        subJourneyMap.get(journeyId)!.push(step);
    }

    const tree: TreeNode[] = [];
    const entries = Array.from(subJourneyMap.entries());

    for (const [journeyId, steps] of entries) {
        // Check if this is the main journey or a subjourney
        const isMainJourney = journeyId === "MainJourney" || steps.every(s => !s.subJourneyId);
        
        if (entries.length === 1 && isMainJourney) {
            // Single journey - don't wrap in journey node, just show steps directly
            for (const step of steps) {
                tree.push(buildStepNode(step, step.sequenceNumber));
            }
        } else {
            // Multiple journeys or explicit subjourney - wrap in journey node
            const journeyNode: TreeNode = {
                id: `journey-${journeyId}`,
                label: journeyId, // Show full journey ID
                type: "subjourney",
                metadata: {
                    tpCount: steps.reduce((sum, s) => sum + s.technicalProfiles.length, 0),
                    result: steps.some(s => s.result === "Error") ? "Error" : "Success",
                },
                children: steps.map(s => buildStepNode(s, s.sequenceNumber)),
            };
            tree.push(journeyNode);
        }
    }

    return tree;
}

/**
 * Builds a tree node for a single step.
 * For interactive steps with HRD, shows:
 * 1. HRD selection node (orange, shows available options)
 * 2. Selected option node (the TP that was chosen)
 * For regular steps, shows TPs and CTs as children.
 * For DisplayControl actions, shows nested TPs and CTs under each DC action.
 * If there's a main SelfAsserted TP, DCs are nested under it.
 */
function buildStepNode(step: TraceStep, stepIndex: number): TreeNode {
    const children: TreeNode[] = [];
    // Only show HRD node for actual HomeRealmDiscovery steps, not self-asserted or other interactive steps
    const isHrdStep = step.isInteractiveStep && 
        step.selectableOptions.length > 1 && 
        step.actionHandler?.includes("HomeRealmDiscovery");
    const hasHrdSelection = isHrdStep;

    if (hasHrdSelection) {
        // Add HRD selection node (the interactive choice point)
        // Include selectedOption in metadata so it can be highlighted within the HRD badge
        // (instead of showing as a separate child node)
        children.push({
            id: `hrd-${step.sequenceNumber}`,
            label: "HomeRealmDiscovery",
            type: "hrd",
            stepIndex,
            metadata: {
                isHrdSelection: true,
                selectableOptions: step.selectableOptions,
                selectedOption: step.selectedOption,
                isInteractive: true,
            },
        });
    }

    // Collect TPs that are shown under DisplayControl actions (to avoid duplicating them)
    const displayControlTpIds = new Set<string>();
    const displayControlCtIds = new Set<string>();

    // Find the "main" SelfAsserted TP for this step (if any)
    // This is the TP that contains DisplayControls
    const mainSelfAssertedTp = step.technicalProfileDetails?.find(
        (tp) => tp.providerType === "SelfAssertedAttributeProvider"
    );

    // Build DC nodes
    const dcNodes: TreeNode[] = [];
    for (const dcAction of step.displayControlActions) {
        const dcLabel = dcAction.action 
            ? `${dcAction.displayControlId} → ${dcAction.action}` 
            : dcAction.displayControlId;
        
        const dcChildren: TreeNode[] = [];
        
        // Add nested technical profiles under this DC action
        if (dcAction.technicalProfiles && dcAction.technicalProfiles.length > 0) {
            for (const tp of dcAction.technicalProfiles) {
                displayControlTpIds.add(tp.technicalProfileId);
                
                const tpChildren: TreeNode[] = [];
                
                // Add nested claims transformations under this TP
                if (tp.claimsTransformations && tp.claimsTransformations.length > 0) {
                    for (const ct of tp.claimsTransformations) {
                        displayControlCtIds.add(ct.id);
                        tpChildren.push({
                            id: `dc-ct-${step.sequenceNumber}-${dcAction.displayControlId}-${dcAction.action}-${tp.technicalProfileId}-${ct.id}`,
                            label: ct.id,
                            type: "dcTransformation",
                            stepIndex,
                            metadata: {
                                parentDisplayControlId: dcAction.displayControlId,
                            },
                        });
                    }
                }
                
                dcChildren.push({
                    id: `dc-tp-${step.sequenceNumber}-${dcAction.displayControlId}-${dcAction.action}-${tp.technicalProfileId}`,
                    label: tp.technicalProfileId,
                    type: "dcTechnicalProfile",
                    stepIndex,
                    children: tpChildren.length > 0 ? tpChildren : undefined,
                    metadata: {
                        parentDisplayControlId: dcAction.displayControlId,
                    },
                });
            }
        } else if (dcAction.technicalProfileId) {
            // Fallback to legacy single technicalProfileId
            displayControlTpIds.add(dcAction.technicalProfileId);
            dcChildren.push({
                id: `dc-tp-${step.sequenceNumber}-${dcAction.displayControlId}-${dcAction.action}-${dcAction.technicalProfileId}`,
                label: dcAction.technicalProfileId,
                type: "dcTechnicalProfile",
                stepIndex,
                metadata: {
                    parentDisplayControlId: dcAction.displayControlId,
                },
            });
        }

        dcNodes.push({
            id: `dc-${step.sequenceNumber}-${dcAction.displayControlId}-${dcAction.action}`,
            label: dcLabel,
            type: "displayControl",
            stepIndex,
            children: dcChildren.length > 0 ? dcChildren : undefined,
            metadata: {
                displayControlId: dcAction.displayControlId,
                action: dcAction.action,
                technicalProfileId: dcAction.technicalProfileId,
                resultCode: dcAction.resultCode,
            },
        });
    }

    // Build a map of TP -> CTs from technicalProfileDetails
    const tpToCts = new Map<string, string[]>();
    const ctsWithParentTp = new Set<string>();
    if (step.technicalProfileDetails) {
        for (const tpDetail of step.technicalProfileDetails) {
            if (tpDetail.claimsTransformations && tpDetail.claimsTransformations.length > 0) {
                const ctIds = tpDetail.claimsTransformations.map((ct) => ct.id);
                tpToCts.set(tpDetail.id, ctIds);
                for (const ctId of ctIds) {
                    ctsWithParentTp.add(ctId);
                }
            }
        }
    }

    // Collect validation TPs to show them nested under main TP
    const validationTpIds = new Set(step.validationTechnicalProfiles || []);

    // Determine the "primary" TP for this step (for nesting orphan CTs)
    // If there's only one TP (excluding validation TPs), orphan CTs should nest under it
    const visibleTps = step.technicalProfiles.filter(tp => 
        !(hasHrdSelection && tp === step.selectedOption) &&
        !displayControlTpIds.has(tp) &&
        !validationTpIds.has(tp)
    );
    const hasSinglePrimaryTp = visibleTps.length === 1;
    const singlePrimaryTpId = hasSinglePrimaryTp ? visibleTps[0] : null;

    // Calculate orphan CTs (not under DC or already assigned to a TP)
    const orphanCts = step.claimsTransformations.filter(ct => 
        !displayControlCtIds.has(ct) && !ctsWithParentTp.has(ct)
    );

    // Add technical profiles as children
    // If there's a main SelfAsserted TP, nest DCs and validation TPs under it
    for (const tp of step.technicalProfiles) {
        // Skip if this TP is already shown as the selected option or under a DisplayControl
        if (hasHrdSelection && tp === step.selectedOption) continue;
        if (displayControlTpIds.has(tp)) continue;
        
        // Skip validation TPs - they'll be nested under the main TP
        if (validationTpIds.has(tp)) continue;
        
        // Check if this is the main SelfAsserted TP
        const isMainSelfAsserted = mainSelfAssertedTp && mainSelfAssertedTp.id === tp;
        
        // Check if this TP has nested CTs
        const nestedCts = tpToCts.get(tp);
        const tpChildren: TreeNode[] = [];
        
        // If this is the main SelfAsserted TP, nest DCs under it
        if (isMainSelfAsserted && dcNodes.length > 0) {
            tpChildren.push(...dcNodes);
        }
        
        // If this is the main SelfAsserted TP, nest validation TPs under it
        if (isMainSelfAsserted && step.validationTechnicalProfiles && step.validationTechnicalProfiles.length > 0) {
            for (const vtpId of step.validationTechnicalProfiles) {
                // Get nested CTs for this validation TP
                const vtpNestedCts = tpToCts.get(vtpId);
                const vtpChildren: TreeNode[] = [];
                
                if (vtpNestedCts && vtpNestedCts.length > 0) {
                    for (const ctId of vtpNestedCts) {
                        vtpChildren.push({
                            id: `vtp-ct-${step.sequenceNumber}-${vtpId}-${ctId}`,
                            label: ctId,
                            type: "transformation",
                            stepIndex,
                            metadata: {
                                parentTechnicalProfileId: vtpId,
                            },
                        });
                    }
                }
                
                tpChildren.push({
                    id: `vtp-${step.sequenceNumber}-${vtpId}`,
                    label: vtpId,
                    type: "technicalProfile", // Show as regular TP, not special validation node
                    stepIndex,
                    children: vtpChildren.length > 0 ? vtpChildren : undefined,
                });
            }
        }
        
        // Add nested CTs
        if (nestedCts && nestedCts.length > 0) {
            for (const ctId of nestedCts) {
                tpChildren.push({
                    id: `tp-ct-${step.sequenceNumber}-${tp}-${ctId}`,
                    label: ctId,
                    type: "transformation",
                    stepIndex,
                    metadata: {
                        parentTechnicalProfileId: tp,
                    },
                });
            }
        }

        // If this is the single primary TP, also nest orphan CTs under it
        // This handles OpenIdConnect and similar flows where CTs don't have explicit TP context
        if (tp === singlePrimaryTpId && orphanCts.length > 0) {
            for (const ctId of orphanCts) {
                tpChildren.push({
                    id: `tp-ct-${step.sequenceNumber}-${tp}-${ctId}`,
                    label: ctId,
                    type: "transformation",
                    stepIndex,
                    metadata: {
                        parentTechnicalProfileId: tp,
                    },
                });
            }
        }
        
        children.push({
            id: `tp-${step.sequenceNumber}-${tp}`,
            label: tp,
            type: "technicalProfile",
            stepIndex,
            children: tpChildren.length > 0 ? tpChildren : undefined,
        });
    }

    // Add DC nodes at step level if there's no main SelfAsserted TP to nest them under
    if (!mainSelfAssertedTp && dcNodes.length > 0) {
        children.push(...dcNodes);
    }
    
    // Add validation TPs at step level if there's no main SelfAsserted TP
    if (!mainSelfAssertedTp && step.validationTechnicalProfiles && step.validationTechnicalProfiles.length > 0) {
        for (const vtpId of step.validationTechnicalProfiles) {
            // Skip if already shown under DC
            if (displayControlTpIds.has(vtpId)) continue;
            
            children.push({
                id: `vtp-${step.sequenceNumber}-${vtpId}`,
                label: vtpId,
                type: "technicalProfile",
                stepIndex,
            });
        }
    }

    // Add claims transformations as children (but not if already shown under DisplayControl, 
    // under a TP from technicalProfileDetails, or nested under the single primary TP)
    for (const ct of step.claimsTransformations) {
        if (displayControlCtIds.has(ct)) continue;
        if (ctsWithParentTp.has(ct)) continue;
        // Skip if we already nested orphan CTs under the single primary TP
        if (singlePrimaryTpId && orphanCts.includes(ct)) continue;
        
        children.push({
            id: `ct-${step.sequenceNumber}-${ct}`,
            label: ct,
            type: "transformation",
            stepIndex,
        });
    }

    return {
        id: `step-${step.sequenceNumber}`,
        label: `Step ${step.stepOrder}`,
        type: "step",
        step,
        stepIndex,
        metadata: {
            result: step.result,
            isInteractive: step.isInteractiveStep,
            isHrdStep,
            duration: step.duration,
            tpCount: step.technicalProfiles.length,
            ctCount: step.claimsTransformations.length,
            selectableOptions: step.selectableOptions,
            selectedOption: step.selectedOption,
        },
        children: children.length > 0 ? children : undefined,
    };
}

/**
 * Tree node component with collapsible children.
 * - Clicking chevron toggles expand/collapse
 * - Clicking item selects it (for steps, TPs, CTs, and HRD)
 */
const TreeNodeComponent: React.FC<{
    node: TreeNode;
    depth: number;
    selection: Selection | null;
    onSelect: (selection: Selection) => void;
    expandedNodes: Set<string>;
    toggleExpanded: (nodeId: string) => void;
}> = ({ node, depth, selection, onSelect, expandedNodes, toggleExpanded }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    
    // Determine if this node is selected
    const isSelected = useMemo(() => {
        if (!selection) return false;
        if (node.type === "step") {
            return selection.type === "step" && selection.stepIndex === node.stepIndex;
        }
        if (node.type === "technicalProfile" || node.type === "selectedOption" || node.type === "dcTechnicalProfile") {
            return selection.type === "technicalProfile" && 
                   selection.stepIndex === node.stepIndex && 
                   selection.itemId === node.label;
        }
        if (node.type === "transformation" || node.type === "dcTransformation") {
            return selection.type === "transformation" && 
                   selection.stepIndex === node.stepIndex && 
                   selection.itemId === node.label;
        }
        if (node.type === "hrd") {
            return selection.type === "hrd" && selection.stepIndex === node.stepIndex;
        }
        if (node.type === "displayControl") {
            return selection.type === "displayControl" && 
                   selection.stepIndex === node.stepIndex && 
                   selection.metadata?.displayControlId === node.metadata?.displayControlId &&
                   selection.metadata?.action === node.metadata?.action;
        }
        return false;
    }, [selection, node]);

    const handleChevronClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasChildren) {
            toggleExpanded(node.id);
        }
    };

    const handleItemClick = () => {
        if (node.type === "step" && node.stepIndex !== undefined) {
            if (isSelected) {
                // Step is already selected: toggle expand/collapse
                if (hasChildren) {
                    toggleExpanded(node.id);
                }
            } else {
                // Step is NOT selected: select it and show details panel
                onSelect({ type: "step", stepIndex: node.stepIndex });
            }
        } else if ((node.type === "technicalProfile" || node.type === "selectedOption" || node.type === "dcTechnicalProfile") && node.stepIndex !== undefined) {
            onSelect({ type: "technicalProfile", stepIndex: node.stepIndex, itemId: node.label });
        } else if ((node.type === "transformation" || node.type === "dcTransformation") && node.stepIndex !== undefined) {
            onSelect({ type: "transformation", stepIndex: node.stepIndex, itemId: node.label });
        } else if (node.type === "hrd" && node.stepIndex !== undefined) {
            onSelect({ type: "hrd", stepIndex: node.stepIndex });
        } else if (node.type === "displayControl" && node.stepIndex !== undefined) {
            onSelect({ 
                type: "displayControl", 
                stepIndex: node.stepIndex,
                metadata: {
                    displayControlId: node.metadata?.displayControlId,
                    action: node.metadata?.action,
                }
            });
            if (hasChildren && !isExpanded) {
                toggleExpanded(node.id);
            }
        } else if (node.type === "subjourney" && hasChildren) {
            // For subjourneys, just toggle expand
            toggleExpanded(node.id);
        }
    };

    const getIcon = () => {
        switch (node.type) {
            case "subjourney":
                return <GitBranch className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
            case "step":
                return node.metadata?.result ? (
                    <StepStatusIcon result={node.metadata.result} size="sm" />
                ) : (
                    <Hash className="w-4 h-4 text-muted-foreground" />
                );
            case "technicalProfile":
                return <Workflow className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />;
            case "dcTechnicalProfile":
                return <Workflow className="w-3.5 h-3.5 text-violet-500 dark:text-violet-300" />;
            case "transformation":
                return <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
            case "dcTransformation":
                return <Zap className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-300" />;
            case "hrd":
                return <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
            case "selectedOption":
                return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
            case "displayControl":
                return <Settings2 className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />;
            default:
                return <Hash className="w-4 h-4 text-muted-foreground" />;
        }
    };

    // Get node-specific styling
    const getNodeStyles = () => {
        switch (node.type) {
            case "hrd":
                return "text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-900/20";
            case "selectedOption":
                return "text-emerald-700 dark:text-emerald-300";
            case "technicalProfile":
                return "text-violet-700 dark:text-violet-300";
            case "dcTechnicalProfile":
                return "text-violet-600 dark:text-violet-400";
            case "transformation":
                return "text-cyan-700 dark:text-cyan-300";
            case "dcTransformation":
                return "text-cyan-600 dark:text-cyan-400";
            case "displayControl":
                return "text-orange-700 dark:text-orange-300";
            default:
                return "";
        }
    };

    return (
        <div>
            <div
                onClick={handleItemClick}
                className={cn(
                    "flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors text-sm",
                    "hover:bg-accent/50",
                    isSelected && "bg-primary/10 ring-1 ring-primary",
                    getNodeStyles()
                )}
                style={{ paddingLeft: `${8 + depth * 16}px` }}
            >
                {/* Expand/collapse chevron - separate click handler */}
                {hasChildren ? (
                    <button
                        onClick={handleChevronClick}
                        className="w-4 h-4 flex items-center justify-center flex-shrink-0 hover:bg-accent rounded"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                    </button>
                ) : (
                    <span className="w-4 h-4 flex-shrink-0" />
                )}

                {/* Icon */}
                {getIcon()}

                {/* Label - show full text */}
                <span className={cn(
                    "flex-1 min-w-0",
                    node.type === "subjourney" && "font-medium truncate",
                    node.type === "step" && "font-medium text-foreground",
                    (node.type === "technicalProfile" || node.type === "transformation" || node.type === "selectedOption" || node.type === "displayControl" || node.type === "dcTechnicalProfile" || node.type === "dcTransformation") && "text-xs break-all",
                    node.type === "hrd" && "font-medium text-xs"
                )}
                title={node.label}
                >
                    {node.label}
                </span>

                {/* Display control action badge */}
                {node.type === "displayControl" && node.metadata?.resultCode && (
                    <Badge 
                        variant="outline" 
                        className={cn(
                            "text-[10px] px-1 py-0",
                            node.metadata.resultCode === "200" 
                                ? "text-green-600 border-green-400" 
                                : "text-red-600 border-red-400"
                        )}
                    >
                        {node.metadata.resultCode}
                    </Badge>
                )}

                {/* Metadata badges */}
                {node.type === "step" && node.metadata?.isHrdStep && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-400 dark:text-amber-400 dark:border-amber-600">
                        HRD
                    </Badge>
                )}
                {node.type === "step" && node.metadata?.result === "Error" && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 text-red-600 border-red-400 dark:text-red-400 dark:border-red-600">
                        ERR
                    </Badge>
                )}
                {node.type === "hrd" && node.metadata?.selectableOptions && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-400 dark:text-amber-400 dark:border-amber-600">
                        {node.metadata.selectableOptions.length} options
                    </Badge>
                )}
                {node.type === "subjourney" && node.children && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {node.children.length}
                    </Badge>
                )}
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
                <div>
                    {node.children!.map((child) => (
                        <TreeNodeComponent
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            selection={selection}
                            onSelect={onSelect}
                            expandedNodes={expandedNodes}
                            toggleExpanded={toggleExpanded}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * Tree sidebar with hierarchical navigation.
 */
const TreeSidebar: React.FC<{
    traceSteps: TraceStep[];
    selection: Selection | null;
    onSelect: (selection: Selection) => void;
    filter: string;
    onFilterChange: (value: string) => void;
}> = ({ traceSteps, selection, onSelect, filter, onFilterChange }) => {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
        // Expand all step nodes by default
        const expanded = new Set<string>();
        traceSteps.forEach((_, idx) => expanded.add(`step-${idx}`));
        return expanded;
    });
    const [viewMode, setViewMode] = useState<"tree" | "flat">("tree");

    const treeData = useMemo(() => buildTreeStructure(traceSteps), [traceSteps]);

    // Filter tree nodes
    const filteredSteps = useMemo(() => {
        if (!filter) return traceSteps;
        const lowerFilter = filter.toLowerCase();
        return traceSteps.filter(
            (step) =>
                step.technicalProfiles.some((tp) => tp.toLowerCase().includes(lowerFilter)) ||
                step.claimsTransformations.some((ct) => ct.toLowerCase().includes(lowerFilter)) ||
                step.graphNodeId.toLowerCase().includes(lowerFilter) ||
                `step ${step.stepOrder}`.toLowerCase().includes(lowerFilter)
        );
    }, [traceSteps, filter]);

    const toggleExpanded = (nodeId: string) => {
        setExpandedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    const expandAll = () => {
        const allIds = new Set<string>();
        const addIds = (nodes: TreeNode[]) => {
            for (const node of nodes) {
                allIds.add(node.id);
                if (node.children) addIds(node.children);
            }
        };
        addIds(treeData);
        setExpandedNodes(allIds);
    };

    const collapseAll = () => {
        setExpandedNodes(new Set());
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header with view toggle */}
            <div className="p-2 border-b flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Journey Tree
                </span>
                <div className="flex items-center gap-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={viewMode === "tree" ? "secondary" : "ghost"}
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => setViewMode("tree")}
                                >
                                    <FolderTree className="w-3.5 h-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Tree View</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={viewMode === "flat" ? "secondary" : "ghost"}
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => setViewMode("flat")}
                                >
                                    <List className="w-3.5 h-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Flat List</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Search */}
            <div className="p-2 border-b">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Filter..."
                        value={filter}
                        onChange={(e) => onFilterChange(e.target.value)}
                        className="pl-8 h-8 text-sm"
                    />
                </div>
            </div>

            {/* Expand/Collapse buttons */}
            {viewMode === "tree" && !filter && (
                <div className="px-2 py-1 border-b flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={expandAll}>
                        Expand All
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={collapseAll}>
                        Collapse All
                    </Button>
                </div>
            )}

            {/* Tree content */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {viewMode === "tree" && !filter ? (
                        // Tree view
                        treeData.map((node) => (
                            <TreeNodeComponent
                                key={node.id}
                                node={node}
                                depth={0}
                                selection={selection}
                                onSelect={onSelect}
                                expandedNodes={expandedNodes}
                                toggleExpanded={toggleExpanded}
                            />
                        ))
                    ) : (
                        // Flat/filtered view
                        filteredSteps.map((step) => (
                            <div
                                key={step.sequenceNumber}
                                onClick={() => onSelect({ type: "step", stepIndex: step.sequenceNumber })}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm",
                                    "hover:bg-accent/50",
                                    selection?.type === "step" && selection.stepIndex === step.sequenceNumber && "bg-primary/10 ring-1 ring-primary"
                                )}
                            >
                                <StepStatusIcon result={step.result} size="sm" />
                                <span className="font-mono text-xs text-muted-foreground w-5">
                                    {step.sequenceNumber + 1}
                                </span>
                                <span className="flex-1 truncate font-medium">
                                    Step {step.stepOrder}
                                </span>
                                {step.isInteractiveStep && (
                                    <Play className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                )}
                            </div>
                        ))
                    )}

                    {filter && filteredSteps.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No steps match "{filter}"
                        </p>
                    )}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-2 border-t text-xs text-muted-foreground">
                {filter ? (
                    <span>{filteredSteps.length} of {traceSteps.length} steps</span>
                ) : (
                    <span>{traceSteps.length} steps total</span>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// Details Panel Components
// ============================================================================

/**
 * Claim/statebag row with diff highlighting.
 */
const ClaimRow: React.FC<{
    name: string;
    value: string;
    diffType?: "added" | "modified" | "removed";
    oldValue?: string;
}> = ({ name, value, diffType, oldValue }) => (
    <div
        className={cn(
            "flex items-start justify-between gap-2 p-2.5 rounded-md text-sm border",
            "bg-card",
            diffType === "added" && "border-l-2 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
            diffType === "modified" && "border-l-2 border-l-amber-500 bg-amber-50 dark:bg-amber-900/20",
            diffType === "removed" && "border-l-2 border-l-red-500 bg-red-50 dark:bg-red-900/20 opacity-60"
        )}
    >
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground">{name}</span>
                {diffType && (
                    <Badge
                        variant="outline"
                        className={cn(
                            "text-[10px]",
                            diffType === "added" && "text-emerald-700 border-emerald-500 dark:text-emerald-400",
                            diffType === "modified" && "text-amber-700 border-amber-500 dark:text-amber-400",
                            diffType === "removed" && "text-red-700 border-red-500 dark:text-red-400"
                        )}
                    >
                        {diffType.toUpperCase()}
                    </Badge>
                )}
            </div>
            {diffType === "modified" && oldValue && (
                <div className="flex items-center gap-1 mt-1 text-xs">
                    <span className="text-red-600 dark:text-red-400 line-through font-mono truncate">
                        {oldValue}
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                </div>
            )}
            <div
                className={cn(
                    "font-mono text-xs break-all mt-1",
                    diffType === "removed" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                )}
            >
                {value}
            </div>
        </div>
        <CopyButton value={value} label={name} />
    </div>
);

// ============================================================================
// Main Component
// ============================================================================

/**
 * Split Tree View Trace Timeline
 * 
 * A hierarchical tree view with:
 * - SubJourneys as top-level groups (when present)
 * - Orchestration steps nested under journeys
 * - Technical profiles and transformations nested under steps
 * - Full details panel for selected step, TP, or CT
 */
export const TraceTimeline: React.FC = () => {
    const { traceSteps, activeStepIndex, isTraceModeActive, setActiveStep, correlationId, traceErrors, logs, setSelectedLogOnly } = useLogStore();
    const [filter, setFilter] = useState("");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selection, setSelection] = useState<Selection | null>(null);

    // Sync selection with activeStepIndex from store (only for external changes)
    // This is a ref to track whether we initiated the change ourselves
    const isInternalChange = React.useRef(false);
    
    React.useEffect(() => {
        // Skip if we just made an internal selection change
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }
        // Only sync if there's no selection yet, or if activeStepIndex changed externally
        if (activeStepIndex !== null && (!selection || selection.stepIndex !== activeStepIndex)) {
            setSelection({ type: "step", stepIndex: activeStepIndex });
        }
    }, [activeStepIndex]);

    const selectedStep = useMemo(() => {
        if (!selection) return null;
        return traceSteps[selection.stepIndex] ?? null;
    }, [traceSteps, selection]);

    const previousStep = useMemo(() => {
        if (!selection || selection.stepIndex === 0) return null;
        return traceSteps[selection.stepIndex - 1];
    }, [traceSteps, selection]);

    const handleSelect = (newSelection: Selection) => {
        isInternalChange.current = true;
        setSelection(newSelection);
        // Update store's activeStepIndex when selecting a step (or parent step of TP/CT)
        setActiveStep(newSelection.stepIndex);
        
        // Sync the log viewer to the corresponding log for this step
        // Use setSelectedLogOnly to avoid regenerating trace
        const step = traceSteps[newSelection.stepIndex];
        if (step?.logId) {
            const matchingLog = logs.find((l) => l.id === step.logId);
            if (matchingLog) {
                setSelectedLogOnly(matchingLog);
            }
        }
    };

    // If no logs, show nothing
    if (logs.length === 0) {
        return null;
    }

    // If not in trace mode or no steps, show error/loading state
    if (!isTraceModeActive || traceSteps.length === 0) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Workflow className="w-5 h-5 text-primary" />
                                User Journey Trace
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                {traceErrors.length > 0
                                    ? "Unable to generate trace from logs"
                                    : "Analyzing log data..."}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                {traceErrors.length > 0 && (
                    <CardContent>
                        <div className="space-y-2">
                            {traceErrors.map((error, i) => (
                                <ErrorMessage key={i} message={error} />
                            ))}
                        </div>
                    </CardContent>
                )}
            </Card>
        );
    }

    const totalDuration = traceSteps.reduce((sum, step) => sum + (step.duration ?? 0), 0);
    const errorCount = traceSteps.filter((s) => s.result === "Error").length;

    const renderDetailsPanel = () => {
        if (!selection || !selectedStep) {
            return (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>Select a step to view details</p>
                </div>
            );
        }

        switch (selection.type) {
            case "step":
                return <StepPanel step={selectedStep} previousStep={previousStep} />;
            case "technicalProfile":
                return selection.itemId ? (
                    <TechnicalProfilePanel step={selectedStep} tpId={selection.itemId} />
                ) : null;
            case "transformation":
                return selection.itemId ? (
                    <ClaimsTransformationPanel step={selectedStep} ctId={selection.itemId} />
                ) : null;
            case "hrd":
                return <HrdPanel step={selectedStep} />;
            case "displayControl": {
                const dcId = selection.metadata?.displayControlId;
                if (typeof dcId === "string" && dcId) {
                    return (
                        <DisplayControlPanel 
                            step={selectedStep} 
                            displayControlId={dcId}
                            action={selection.metadata?.action as string | undefined}
                        />
                    );
                }
                return null;
            }
            default:
                return null;
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">User Journey Trace</CardTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {traceSteps.length} steps • {Math.round(totalDuration / 1000)}s total
                                {errorCount > 0 && (
                                    <span className="text-red-600 dark:text-red-400 ml-2">
                                        • {errorCount} error{errorCount > 1 ? "s" : ""}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Correlation ID */}
                        {correlationId && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md border">
                                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs font-mono text-muted-foreground max-w-[200px] truncate">
                                    {correlationId}
                                </span>
                                <CopyButton value={correlationId} label="Correlation ID" />
                            </div>
                        )}
                        {/* Navigation */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelect({ type: "step", stepIndex: Math.max(0, (selection?.stepIndex ?? 0) - 1) })}
                            disabled={!selection || selection.stepIndex === 0}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                            {(selection?.stepIndex ?? 0) + 1} / {traceSteps.length}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelect({ type: "step", stepIndex: Math.min(traceSteps.length - 1, (selection?.stepIndex ?? 0) + 1) })}
                            disabled={!selection || selection.stepIndex === traceSteps.length - 1}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="flex h-[550px]">
                    {/* Left sidebar */}
                    <div
                        className={cn(
                            "border-r transition-all duration-200",
                            sidebarCollapsed ? "w-12" : "w-80"
                        )}
                    >
                        {sidebarCollapsed ? (
                            <div className="flex flex-col items-center py-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSidebarCollapsed(false)}
                                    className="mb-2"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                                <ScrollArea className="flex-1">
                                    <div className="space-y-1 px-1">
                                        {traceSteps.map((step, idx) => (
                                            <TooltipProvider key={step.sequenceNumber}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            onClick={() => handleSelect({ type: "step", stepIndex: idx })}
                                                            className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all",
                                                                "hover:bg-accent",
                                                                selection?.stepIndex === idx && "bg-primary/10 ring-1 ring-primary"
                                                            )}
                                                        >
                                                            <StepStatusIcon result={step.result} size="sm" />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right">
                                                        Step {step.stepOrder}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                <div className="flex items-center justify-end p-2 border-b">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSidebarCollapsed(true)}
                                        className="h-6 w-6 p-0"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                </div>
                                <TreeSidebar
                                    traceSteps={traceSteps}
                                    selection={selection}
                                    onSelect={handleSelect}
                                    filter={filter}
                                    onFilterChange={setFilter}
                                />
                            </div>
                        )}
                    </div>

                    {/* Right details panel */}
                    <div className="flex-1 min-w-0">
                        {renderDetailsPanel()}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default TraceTimeline;
