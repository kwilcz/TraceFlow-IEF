"use client";

import React, { useMemo, useState } from "react";
import { useLogStore } from "@/stores/log-store";
import { TraceStep, computeClaimsDiff } from "@/types/trace";
import { cn } from "@/lib/utils";
import { getStatebagLabel, hasStatebagLabel } from "@/lib/statebag-labels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Database,
    Clock,
    Stack as Layers,
    CaretLeft,
    CaretRight,
    Copy,
    Check,
    Warning as AlertTriangle,
    FlowArrow as Workflow,
    Lightning as Zap,
    GearSix as Settings2,
    Info,
    ArrowRight,
} from "@phosphor-icons/react";
import { toast } from "sonner";

/**
 * Displays the statebag and claims at a specific trace step.
 * Supports "Time Travel" debugging by showing the exact state at any step.
 */
export const StatebagInspector: React.FC = () => {
    const {
        traceSteps,
        activeStepIndex,
        isTraceModeActive,
        setActiveStep,
        previousStep,
        nextStep,
    } = useLogStore();

    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const activeStep = useMemo(() => {
        if (activeStepIndex === null || !traceSteps[activeStepIndex]) {
            return null;
        }
        return traceSteps[activeStepIndex];
    }, [traceSteps, activeStepIndex]);

    const previousStepData = useMemo(() => {
        if (activeStepIndex === null || activeStepIndex === 0) {
            return null;
        }
        return traceSteps[activeStepIndex - 1];
    }, [traceSteps, activeStepIndex]);

    const claimsDiff = useMemo(() => {
        if (!activeStep || !previousStepData) {
            return null;
        }
        return computeClaimsDiff(previousStepData.claimsSnapshot, activeStep.claimsSnapshot);
    }, [activeStep, previousStepData]);

    const statebagDiff = useMemo(() => {
        if (!activeStep || !previousStepData) {
            return null;
        }
        return computeClaimsDiff(previousStepData.statebagSnapshot, activeStep.statebagSnapshot);
    }, [activeStep, previousStepData]);

    const handleCopy = async (key: string, value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedKey(key);
            toast.success(`Copied ${key} to clipboard`);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch {
            toast.error("Failed to copy to clipboard");
        }
    };

    if (!isTraceModeActive) {
        return null;
    }

    if (!activeStep) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        Statebag Inspector
                    </CardTitle>
                    <CardDescription>
                        Select a step in the trace timeline to inspect its state.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-blue-400" />
                            Step {activeStep.sequenceNumber + 1}: {activeStep.graphNodeId.split("-").pop()}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3" />
                            {activeStep.timestamp.toLocaleString()}
                            <span className="text-slate-500">•</span>
                            <span className={cn(
                                activeStep.result === "Success" && "text-green-400",
                                activeStep.result === "Error" && "text-red-400",
                                activeStep.result === "Skipped" && "text-yellow-400",
                                activeStep.result === "PendingInput" && "text-blue-400"
                            )}>
                                {activeStep.result}
                            </span>
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={previousStep}
                            disabled={activeStepIndex === 0}
                        >
                            <CaretLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-slate-400 min-w-[60px] text-center">
                            {activeStepIndex! + 1} / {traceSteps.length}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={nextStep}
                            disabled={activeStepIndex === traceSteps.length - 1}
                        >
                            <CaretRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Error message if present */}
                {activeStep.errorMessage && (
                    <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 p-3 rounded-md mb-4">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{activeStep.errorMessage}</span>
                    </div>
                )}

                {/* Invoked Components Summary */}
                <div className="mb-4 space-y-2">
                    {activeStep.technicalProfiles.length > 0 && (
                        <div className="flex items-start gap-2">
                            <Workflow className="w-4 h-4 text-purple-400 mt-1" />
                            <div>
                                <span className="text-xs text-slate-400">Technical Profiles:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {activeStep.technicalProfiles.map((tp) => (
                                        <Badge key={tp} variant="outline" className="text-xs text-purple-300 border-purple-500/50">
                                            {tp}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeStep.claimsTransformations.length > 0 && (
                        <div className="flex items-start gap-2">
                            <Zap className="w-4 h-4 text-cyan-400 mt-1" />
                            <div>
                                <span className="text-xs text-slate-400">Claims Transformations:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {activeStep.claimsTransformations.map((ct) => (
                                        <Badge key={ct} variant="outline" className="text-xs text-cyan-300 border-cyan-500/50">
                                            {ct}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeStep.displayControls.length > 0 && (
                        <div className="flex items-start gap-2">
                            <Settings2 className="w-4 h-4 text-orange-400 mt-1" />
                            <div>
                                <span className="text-xs text-slate-400">Display Controls:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {activeStep.displayControls.map((dc) => (
                                        <Badge key={dc} variant="outline" className="text-xs text-orange-300 border-orange-500/50">
                                            {dc}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <Tabs defaultValue="claims" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="claims">
                            <Layers className="w-4 h-4 mr-1" />
                            Claims ({Object.keys(activeStep.claimsSnapshot).length})
                        </TabsTrigger>
                        <TabsTrigger value="statebag">
                            <Database className="w-4 h-4 mr-1" />
                            Statebag ({Object.keys(activeStep.statebagSnapshot).length})
                        </TabsTrigger>
                        <TabsTrigger value="changes">
                            Changes
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="claims" className="mt-4">
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-2">
                                {Object.entries(activeStep.claimsSnapshot).length === 0 ? (
                                    <p className="text-sm text-slate-500">No claims at this step</p>
                                ) : (
                                    Object.entries(activeStep.claimsSnapshot).map(([key, value]) => (
                                        <ClaimEntry
                                            key={key}
                                            name={key}
                                            value={value}
                                            isNew={claimsDiff?.added[key] !== undefined}
                                            isModified={claimsDiff?.modified[key] !== undefined}
                                            onCopy={() => handleCopy(key, value)}
                                            isCopied={copiedKey === key}
                                        />
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="statebag" className="mt-4">
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-2">
                                {Object.entries(activeStep.statebagSnapshot).length === 0 ? (
                                    <p className="text-sm text-slate-500">No statebag entries at this step</p>
                                ) : (
                                    Object.entries(activeStep.statebagSnapshot).map(([key, value]) => (
                                        <ClaimEntry
                                            key={key}
                                            name={key}
                                            value={value}
                                            isNew={statebagDiff?.added[key] !== undefined}
                                            isModified={statebagDiff?.modified[key] !== undefined}
                                            onCopy={() => handleCopy(key, value)}
                                            isCopied={copiedKey === key}
                                        />
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="changes" className="mt-4">
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-4">
                                {/* Claims Changes */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Claims Changes</h4>
                                    {claimsDiff ? (
                                        <div className="space-y-2">
                                            {Object.entries(claimsDiff.added).map(([key, value]) => (
                                                <div key={key} className="text-xs">
                                                    <span className="text-green-400">+ {key}:</span>
                                                    <span className="text-green-300 font-mono ml-2">{value}</span>
                                                </div>
                                            ))}
                                            {Object.entries(claimsDiff.modified).map(([key, { oldValue, newValue }]) => (
                                                <div key={key} className="text-xs">
                                                    <span className="text-yellow-400">~ {key}:</span>
                                                    <div className="ml-4">
                                                        <span className="text-red-300 line-through font-mono">{oldValue}</span>
                                                        <span className="text-slate-500 mx-2">→</span>
                                                        <span className="text-green-300 font-mono">{newValue}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {claimsDiff.removed.map((key) => (
                                                <div key={key} className="text-xs text-red-400">
                                                    - {key}
                                                </div>
                                            ))}
                                            {Object.keys(claimsDiff.added).length === 0 &&
                                                Object.keys(claimsDiff.modified).length === 0 &&
                                                claimsDiff.removed.length === 0 && (
                                                    <p className="text-sm text-slate-500">No claim changes</p>
                                                )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">First step - no previous state</p>
                                    )}
                                </div>

                                {/* Statebag Changes */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Statebag Changes</h4>
                                    {statebagDiff ? (
                                        <div className="space-y-2">
                                            {Object.entries(statebagDiff.added).map(([key, value]) => (
                                                <div key={key} className="text-xs">
                                                    <span className="text-green-400">+ {key}:</span>
                                                    <span className="text-green-300 font-mono ml-2">{value}</span>
                                                </div>
                                            ))}
                                            {Object.entries(statebagDiff.modified).map(([key, { oldValue, newValue }]) => (
                                                <div key={key} className="text-xs">
                                                    <span className="text-yellow-400">~ {key}:</span>
                                                    <div className="ml-4">
                                                        <span className="text-red-300 line-through font-mono">{oldValue}</span>
                                                        <span className="text-slate-500 mx-2">→</span>
                                                        <span className="text-green-300 font-mono">{newValue}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {statebagDiff.removed.map((key) => (
                                                <div key={key} className="text-xs text-red-400">
                                                    - {key}
                                                </div>
                                            ))}
                                            {Object.keys(statebagDiff.added).length === 0 &&
                                                Object.keys(statebagDiff.modified).length === 0 &&
                                                statebagDiff.removed.length === 0 && (
                                                    <p className="text-sm text-slate-500">No statebag changes</p>
                                                )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">First step - no previous state</p>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

/**
 * Individual claim/statebag entry display with friendly labels.
 */
interface ClaimEntryProps {
    name: string;
    value: string;
    isNew?: boolean;
    isModified?: boolean;
    onCopy: () => void;
    isCopied: boolean;
    showFriendlyLabel?: boolean;
}

const ClaimEntry: React.FC<ClaimEntryProps> = React.memo(
    ({ name, value, isNew, isModified, onCopy, isCopied, showFriendlyLabel = false }) => {
        const friendlyLabel = showFriendlyLabel ? getStatebagLabel(name) : name;
        const hasLabel = showFriendlyLabel && hasStatebagLabel(name);

        return (
            <div
                className={cn(
                    "flex items-start justify-between gap-2 p-2.5 rounded-md text-sm",
                    "bg-slate-900/60 border border-slate-700/50",
                    "hover:bg-slate-800/60 transition-colors",
                    isNew && "border-l-2 border-l-emerald-500 bg-emerald-950/20",
                    isModified && "border-l-2 border-l-amber-500 bg-amber-950/20"
                )}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span 
                                        className={cn(
                                            "font-medium text-slate-200 truncate cursor-help",
                                            hasLabel && "underline decoration-dotted underline-offset-2"
                                        )}
                                        title={friendlyLabel}
                                    >
                                        {friendlyLabel}
                                    </span>
                                </TooltipTrigger>
                                {hasLabel && (
                                    <TooltipContent side="top" className="max-w-xs">
                                        <div className="text-xs">
                                            <span className="text-slate-400">Original key:</span>{" "}
                                            <code className="text-sky-300">{name}</code>
                                        </div>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                        {isNew && (
                            <Badge variant="outline" className="text-[10px] text-emerald-300 border-emerald-500/50 bg-emerald-950/30">
                                NEW
                            </Badge>
                        )}
                        {isModified && (
                            <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/50 bg-amber-950/30">
                                CHANGED
                            </Badge>
                        )}
                    </div>
                    <div className="font-mono text-xs text-slate-400 break-all mt-1">{value}</div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCopy}
                    className="flex-shrink-0 h-6 w-6 p-0 hover:bg-slate-700"
                >
                    {isCopied ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                        <Copy className="w-3 h-3 text-slate-500" />
                    )}
                </Button>
            </div>
        );
    }
);
ClaimEntry.displayName = "ClaimEntry";

export default StatebagInspector;
