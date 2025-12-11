"use client";

import React from "react";
import { Eye, Layers, Settings2, CheckCircle2, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DetailsPanel } from "../details-panel";
import type { TraceStep } from "@/types/trace";

interface StepStatusBadgeProps {
    result: TraceStep["result"];
}

const StepStatusBadge: React.FC<StepStatusBadgeProps> = ({ result }) => {
    const styles = {
        Success: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
        Error: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
        Skipped: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700",
        PendingInput: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700",
    };
    return (
        <Badge variant="outline" className={cn("text-xs gap-1", styles[result])}>
            {result}
        </Badge>
    );
};

interface HrdDetailsPanelProps {
    step: TraceStep;
}

export const HrdDetailsPanel: React.FC<HrdDetailsPanelProps> = ({ step }) => {
    return (
        <DetailsPanel variant="hrd">
            <DetailsPanel.Header>
                <DetailsPanel.HeaderContent>
                    <DetailsPanel.TitleRow>
                        <DetailsPanel.Title icon={<Eye className="w-5 h-5 text-amber-600 dark:text-amber-400" />}>
                            Home Realm Discovery
                        </DetailsPanel.Title>
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-400 dark:text-amber-400">
                            Interactive
                        </Badge>
                    </DetailsPanel.TitleRow>
                    <p className="text-sm text-muted-foreground mt-1">
                        User was presented with identity provider selection
                    </p>
                </DetailsPanel.HeaderContent>
            </DetailsPanel.Header>

            <DetailsPanel.Content>
                {/* Step Context */}
                <DetailsPanel.Section title="Step Context">
                    <DetailsPanel.SectionBox>
                        <DetailsPanel.Row>
                            <DetailsPanel.Label>Step:</DetailsPanel.Label>
                            <DetailsPanel.Value className="font-medium">Step {step.stepOrder}</DetailsPanel.Value>
                        </DetailsPanel.Row>
                        <DetailsPanel.Row>
                            <DetailsPanel.Label>Result:</DetailsPanel.Label>
                            <StepStatusBadge result={step.result} />
                        </DetailsPanel.Row>
                        <DetailsPanel.Row>
                            <DetailsPanel.Label>Event Type:</DetailsPanel.Label>
                            <Badge variant="outline" className="text-xs">{step.eventType}</Badge>
                        </DetailsPanel.Row>
                    </DetailsPanel.SectionBox>
                </DetailsPanel.Section>

                {/* Available Options */}
                {step.selectableOptions.length > 0 && (
                    <DetailsPanel.Section 
                        title={`Available Identity Providers (${step.selectableOptions.length})`}
                        icon={<Layers className="w-3 h-3" />}
                    >
                        <DetailsPanel.ItemList className="space-y-1.5">
                            {step.selectableOptions.map((option) => (
                                <div
                                    key={option}
                                    className={cn(
                                        "flex items-center justify-between p-2.5 rounded-md border",
                                        option === step.selectedOption
                                            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                                            : "bg-muted border-border"
                                    )}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {option === step.selectedOption ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                        ) : (
                                            <Workflow className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        )}
                                        <span className={cn(
                                            "font-mono text-sm break-all",
                                            option === step.selectedOption && "font-medium text-emerald-700 dark:text-emerald-300"
                                        )}>
                                            {option}
                                        </span>
                                        {option === step.selectedOption && (
                                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-400 dark:text-emerald-400 flex-shrink-0 ml-auto">
                                                SELECTED
                                            </Badge>
                                        )}
                                    </div>
                                    <DetailsPanel.CopyButton value={option} label="TP ID" />
                                </div>
                            ))}
                        </DetailsPanel.ItemList>
                    </DetailsPanel.Section>
                )}

                {/* Selected Option Details */}
                {step.selectedOption && (
                    <DetailsPanel.Section 
                        title="User Selection"
                        icon={<CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    >
                        <DetailsPanel.SectionBox variant="emerald">
                            <DetailsPanel.Label>Selected Identity Provider</DetailsPanel.Label>
                            <DetailsPanel.Value mono breakAll className="block mt-1 text-emerald-700 dark:text-emerald-300">
                                {step.selectedOption}
                            </DetailsPanel.Value>
                        </DetailsPanel.SectionBox>
                    </DetailsPanel.Section>
                )}

                {/* UI Settings */}
                {step.uiSettings && (
                    <DetailsPanel.Section 
                        title="UI Configuration"
                        icon={<Settings2 className="w-3 h-3" />}
                    >
                        <div className="space-y-2">
                            {step.uiSettings.pageType && (
                                <DetailsPanel.SectionBox>
                                    <DetailsPanel.Label>Page Type</DetailsPanel.Label>
                                    <DetailsPanel.Value className="block mt-1 font-medium">
                                        {step.uiSettings.pageType}
                                    </DetailsPanel.Value>
                                </DetailsPanel.SectionBox>
                            )}
                            {step.uiSettings.contentDefinition && (
                                <DetailsPanel.SectionBox>
                                    <DetailsPanel.Label>Content Definition</DetailsPanel.Label>
                                    <DetailsPanel.Value mono className="block mt-1 text-muted-foreground">
                                        {step.uiSettings.contentDefinition}
                                    </DetailsPanel.Value>
                                </DetailsPanel.SectionBox>
                            )}
                            {step.uiSettings.language && (
                                <DetailsPanel.SectionBox>
                                    <DetailsPanel.Label>Language</DetailsPanel.Label>
                                    <DetailsPanel.Value className="block mt-1 font-medium">
                                        {step.uiSettings.language}
                                    </DetailsPanel.Value>
                                </DetailsPanel.SectionBox>
                            )}
                        </div>
                    </DetailsPanel.Section>
                )}
            </DetailsPanel.Content>
        </DetailsPanel>
    );
};

export default HrdDetailsPanel;
