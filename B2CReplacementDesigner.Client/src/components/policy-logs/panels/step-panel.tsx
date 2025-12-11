"use client";

import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Clock,
    Database,
    ExternalLink,
    Eye,
    Layers,
    Play,
    Server,
    Settings2,
    Workflow,
    XCircle,
    Zap,
} from "lucide-react";
import { DetailsPanel } from "../details-panel";
import { TraceStep, computeClaimsDiff } from "@/types/trace";
import { cn } from "@/lib/utils";

/**
 * Display duration in a human-readable format with color coding.
 */
const DurationBadge: React.FC<{ durationMs?: number }> = ({ durationMs }) => {
    if (durationMs === undefined) return null;
    
    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const getColor = (ms: number) => {
        if (ms < 100) return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30";
        if (ms < 500) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30";
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30";
    };

    return (
        <Badge variant="outline" className={cn("text-xs font-mono", getColor(durationMs))}>
            <Clock className="w-3 h-3 mr-1" />
            {formatDuration(durationMs)}
        </Badge>
    );
};

/**
 * Status badge for step results.
 */
const StepStatusBadge: React.FC<{ result: string | undefined }> = ({ result }) => {
    const getStatusStyles = (res: string | undefined) => {
        switch (res) {
            case "Success":
                return "text-green-700 border-green-500 bg-green-50 dark:text-green-400 dark:bg-green-900/30";
            case "Failure":
                return "text-red-700 border-red-500 bg-red-50 dark:text-red-400 dark:bg-red-900/30";
            default:
                return "text-muted-foreground";
        }
    };

    return (
        <Badge variant="outline" className={cn("text-xs", getStatusStyles(result))}>
            {result || "Unknown"}
        </Badge>
    );
};

/**
 * Error details section.
 */
const ErrorDetails: React.FC<{ message: string; hResult?: string }> = ({ message, hResult }) => (
    <div className="space-y-1">
        <p className="text-sm text-red-600 dark:text-red-400 break-words">{message}</p>
        {hResult && (
            <p className="text-xs text-muted-foreground font-mono">HRESULT: {hResult}</p>
        )}
    </div>
);

/**
 * A single claim/statebag row with optional diff highlighting.
 */
const ClaimRow: React.FC<{
    name: string;
    value: string;
    diffType?: "added" | "modified" | "removed";
    oldValue?: string;
}> = ({ name, value, diffType, oldValue }) => {
    const bgClass = diffType === "added"
        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        : diffType === "modified"
            ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
            : diffType === "removed"
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                : "bg-muted/30 border-transparent";

    return (
        <div className={cn("p-2 rounded-md border", bgClass)}>
            <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground break-all">
                    {name}
                </span>
                <DetailsPanel.CopyButton value={value} label="value" />
            </div>
            <div className="text-sm break-all mt-0.5">
                {diffType === "modified" && oldValue && (
                    <span className="text-muted-foreground line-through mr-2">{oldValue}</span>
                )}
                <span className={diffType === "removed" ? "line-through" : ""}>{value}</span>
            </div>
        </div>
    );
};

export interface StepPanelProps {
    step: TraceStep;
    previousStep: TraceStep | null;
}

/**
 * Step overview panel - shows claims, components, and statebag for the selected step.
 */
export function StepPanel({ step, previousStep }: StepPanelProps) {
    const claimsDiff = useMemo(() => {
        if (!previousStep) return null;
        return computeClaimsDiff(previousStep.claimsSnapshot, step.claimsSnapshot);
    }, [step, previousStep]);

    const statebagDiff = useMemo(() => {
        if (!previousStep) return null;
        return computeClaimsDiff(previousStep.statebagSnapshot, step.statebagSnapshot);
    }, [step, previousStep]);

    const mainTp = step.technicalProfiles[0];

    const formatTimestamp = (date: Date) =>
        date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });

    return (
        <DetailsPanel variant="step">
            <DetailsPanel.Header>
                <DetailsPanel.HeaderContent>
                    <DetailsPanel.TitleRow>
                        <DetailsPanel.Title icon={<Layers className="w-5 h-5" />}>
                            Step {step.stepOrder}
                        </DetailsPanel.Title>
                        <StepStatusBadge result={step.result} />
                    </DetailsPanel.TitleRow>
                    {mainTp && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                            {mainTp}
                        </p>
                    )}
                </DetailsPanel.HeaderContent>
                <DetailsPanel.HeaderActions>
                    <DurationBadge durationMs={step.duration} />
                </DetailsPanel.HeaderActions>
            </DetailsPanel.Header>

            {/* Quick info - below header but before content */}
            <div className="px-4 pb-3 border-b flex flex-wrap gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(step.timestamp)}
                </div>
                {step.isInteractiveStep && (
                    <Badge variant="outline" className="text-xs text-purple-700 border-purple-500 dark:text-purple-400">
                        <Play className="w-3 h-3 mr-1" />
                        Interactive
                    </Badge>
                )}
                {step.isFinalStep && (
                    <Badge variant="outline" className="text-xs text-green-700 border-green-500 dark:text-green-400">
                        Final Step
                    </Badge>
                )}
                {step.uiSettings?.pageType && (
                    <Badge variant="outline" className="text-xs">
                        {step.uiSettings.pageType}
                    </Badge>
                )}
                {step.uiSettings?.language && (
                    <Badge variant="outline" className="text-xs">
                        {step.uiSettings.language}
                    </Badge>
                )}
            </div>

            {/* Error details */}
            {step.errorMessage && (
                <div className="p-4 border-b">
                    <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        Error
                    </div>
                    <ErrorDetails message={step.errorMessage} hResult={step.errorHResult} />
                </div>
            )}

            {/* Tabbed content */}
            <Tabs defaultValue="claims" className="flex-1 flex flex-col min-h-0">
                <div className="border-b px-4">
                    <TabsList className="h-10 bg-transparent gap-2 p-0">
                        <TabsTrigger
                            value="claims"
                            className="data-[state=active]:bg-accent px-3"
                        >
                            <Layers className="w-4 h-4 mr-1" />
                            Claims ({Object.keys(step.claimsSnapshot).length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="components"
                            className="data-[state=active]:bg-accent px-3"
                        >
                            <Workflow className="w-4 h-4 mr-1" />
                            Components
                        </TabsTrigger>
                        <TabsTrigger
                            value="statebag"
                            className="data-[state=active]:bg-accent px-3"
                        >
                            <Database className="w-4 h-4 mr-1" />
                            Statebag
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="claims" className="flex-1 m-0 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-2">
                            {/* Changes first */}
                            {claimsDiff && (
                                <>
                                    {Object.entries(claimsDiff.added).map(([key, value]) => (
                                        <ClaimRow key={key} name={key} value={value} diffType="added" />
                                    ))}
                                    {Object.entries(claimsDiff.modified).map(([key, { oldValue, newValue }]) => (
                                        <ClaimRow key={key} name={key} value={newValue} diffType="modified" oldValue={oldValue} />
                                    ))}
                                </>
                            )}

                            {/* Unchanged */}
                            {Object.entries(step.claimsSnapshot)
                                .filter(([key]) => !claimsDiff?.added[key] && !claimsDiff?.modified[key])
                                .map(([key, value]) => (
                                    <ClaimRow key={key} name={key} value={value} />
                                ))}

                            {Object.keys(step.claimsSnapshot).length === 0 && (
                                <p className="text-sm text-muted-foreground italic text-center py-8">
                                    No claims at this step
                                </p>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="components" className="flex-1 m-0 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-6">
                            {/* Technical Profiles */}
                            {step.technicalProfiles.length > 0 && (
                                <ComponentSection
                                    title="Technical Profiles"
                                    count={step.technicalProfiles.length}
                                    icon={<Workflow className="w-3 h-3" />}
                                >
                                    <div className="space-y-1">
                                        {step.technicalProfiles.map((tp) => (
                                            <div
                                                key={tp}
                                                className="flex items-center justify-between p-2 bg-violet-50 dark:bg-violet-900/20 rounded-md border border-violet-200 dark:border-violet-800"
                                            >
                                                <span className="text-sm text-violet-700 dark:text-violet-300 truncate">
                                                    {tp}
                                                </span>
                                                <DetailsPanel.CopyButton value={tp} label="TP ID" />
                                            </div>
                                        ))}
                                    </div>
                                </ComponentSection>
                            )}

                            {/* Claims Transformations */}
                            {step.claimsTransformations.length > 0 && (
                                <ComponentSection
                                    title="Claims Transformations"
                                    count={step.claimsTransformations.length}
                                    icon={<Zap className="w-3 h-3" />}
                                >
                                    <div className="space-y-1">
                                        {step.claimsTransformations.map((ct) => (
                                            <div
                                                key={ct}
                                                className="flex items-center justify-between p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-md border border-cyan-200 dark:border-cyan-800"
                                            >
                                                <span className="text-sm text-cyan-700 dark:text-cyan-300 truncate">
                                                    {ct}
                                                </span>
                                                <DetailsPanel.CopyButton value={ct} label="CT ID" />
                                            </div>
                                        ))}
                                    </div>
                                </ComponentSection>
                            )}

                            {/* Display Controls */}
                            {(step.displayControls.length > 0 || step.displayControlActions.length > 0) && (
                                <ComponentSection
                                    title="Display Controls"
                                    count={step.displayControlActions.length > 0 ? step.displayControlActions.length : step.displayControls.length}
                                    icon={<Settings2 className="w-3 h-3" />}
                                >
                                    <div className="space-y-2">
                                        {/* Show detailed actions if available */}
                                        {step.displayControlActions.length > 0 ? (
                                            step.displayControlActions.map((dcAction, idx) => (
                                                <DisplayControlActionCard
                                                    key={`${dcAction.displayControlId}-${dcAction.action}-${idx}`}
                                                    dcAction={dcAction}
                                                />
                                            ))
                                        ) : (
                                            /* Fallback to simple display controls list */
                                            step.displayControls.map((dc) => (
                                                <div
                                                    key={dc}
                                                    className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-200 dark:border-orange-800"
                                                >
                                                    <span className="text-sm text-orange-700 dark:text-orange-300 truncate">
                                                        {dc}
                                                    </span>
                                                    <DetailsPanel.CopyButton value={dc} label="DC ID" />
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ComponentSection>
                            )}

                            {/* Selectable Options */}
                            {step.selectableOptions.length > 0 && (
                                <ComponentSection 
                                    title="Selectable Options" 
                                    icon={<Eye className="w-3 h-3" />}
                                >
                                    <div className="flex flex-wrap gap-1.5">
                                        {step.selectableOptions.map((opt) => (
                                            <Badge key={opt} variant="outline" className="text-xs">
                                                {opt}
                                            </Badge>
                                        ))}
                                    </div>
                                </ComponentSection>
                            )}

                            {/* Backend API Calls */}
                            {step.backendApiCalls && step.backendApiCalls.length > 0 && (
                                <ComponentSection 
                                    title="Backend API Calls" 
                                    icon={<Server className="w-3 h-3" />}
                                >
                                    <div className="space-y-2">
                                        {step.backendApiCalls.map((call, idx) => (
                                            <div key={idx} className="p-2 bg-muted rounded-md text-xs">
                                                {call.requestType && (
                                                    <Badge variant="outline" className="text-xs mb-1">
                                                        {call.requestType}
                                                    </Badge>
                                                )}
                                                {call.requestUri && (
                                                    <div className="font-mono text-muted-foreground truncate flex items-center gap-1">
                                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                        {call.requestUri}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </ComponentSection>
                            )}

                            {step.technicalProfiles.length === 0 &&
                                step.claimsTransformations.length === 0 &&
                                step.displayControls.length === 0 && (
                                    <p className="text-sm text-muted-foreground italic text-center py-8">
                                        No components in this step
                                    </p>
                                )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="statebag" className="flex-1 m-0 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-2">
                            {/* Changes first */}
                            {statebagDiff && (
                                <>
                                    {Object.entries(statebagDiff.added).map(([key, value]) => (
                                        <ClaimRow key={key} name={key} value={value} diffType="added" />
                                    ))}
                                    {Object.entries(statebagDiff.modified).map(([key, { oldValue, newValue }]) => (
                                        <ClaimRow key={key} name={key} value={newValue} diffType="modified" oldValue={oldValue} />
                                    ))}
                                </>
                            )}

                            {/* Unchanged */}
                            {Object.entries(step.statebagSnapshot)
                                .filter(([key]) => !statebagDiff?.added[key] && !statebagDiff?.modified[key])
                                .map(([key, value]) => (
                                    <ClaimRow key={key} name={key} value={value} />
                                ))}

                            {Object.keys(step.statebagSnapshot).length === 0 && (
                                <p className="text-sm text-muted-foreground italic text-center py-8">
                                    No statebag entries at this step
                                </p>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </DetailsPanel>
    );
}

// --- Helper components ---

interface ComponentSectionProps {
    title: string;
    count?: number;
    icon: React.ReactNode;
    children: React.ReactNode;
}

function ComponentSection({ title, count, icon, children }: ComponentSectionProps) {
    return (
        <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                {icon}
                {title} {count !== undefined && `(${count})`}
            </h4>
            {children}
        </div>
    );
}

interface DisplayControlActionCardProps {
    dcAction: {
        displayControlId: string;
        action?: string;
        resultCode?: string;
        technicalProfileId?: string;
    };
}

function DisplayControlActionCard({ dcAction }: DisplayControlActionCardProps) {
    return (
        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    {dcAction.displayControlId}
                </span>
                <div className="flex items-center gap-1">
                    {dcAction.action && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {dcAction.action}
                        </Badge>
                    )}
                    {dcAction.resultCode && (
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px] px-1 py-0",
                                dcAction.resultCode === "200"
                                    ? "text-green-600 border-green-400"
                                    : "text-red-600 border-red-400"
                            )}
                        >
                            {dcAction.resultCode}
                        </Badge>
                    )}
                    <DetailsPanel.CopyButton value={dcAction.displayControlId} label="DC ID" />
                </div>
            </div>
            {dcAction.technicalProfileId && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>TP:</span>
                    <span className="font-mono">{dcAction.technicalProfileId}</span>
                </div>
            )}
        </div>
    );
}
