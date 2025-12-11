"use client";

import React from "react";
import { Zap, ArrowRight, Settings2, CheckCircle2 } from "lucide-react";
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

interface ClaimsTransformationDetailsPanelProps {
    step: TraceStep;
    ctId: string;
}

export const ClaimsTransformationDetailsPanel: React.FC<ClaimsTransformationDetailsPanelProps> = ({ step, ctId }) => {
    const ctDetail = step.claimsTransformationDetails?.find(ct => ct.id === ctId);

    return (
        <DetailsPanel variant="transformation">
            <DetailsPanel.Header>
                <DetailsPanel.HeaderContent>
                    <DetailsPanel.TitleRow>
                        <DetailsPanel.Title icon={<Zap className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}>
                            Claims Transformation
                        </DetailsPanel.Title>
                    </DetailsPanel.TitleRow>
                    <DetailsPanel.Subtitle>{ctId}</DetailsPanel.Subtitle>
                </DetailsPanel.HeaderContent>
                <DetailsPanel.HeaderActions>
                    <DetailsPanel.CopyButton value={ctId} label="CT ID" />
                </DetailsPanel.HeaderActions>
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
                    </DetailsPanel.SectionBox>
                </DetailsPanel.Section>

                {ctDetail ? (
                    <>
                        {/* Input Claims */}
                        {ctDetail.inputClaims.length > 0 && (
                            <DetailsPanel.Section 
                                title="Input Claims" 
                                icon={<ArrowRight className="w-3 h-3" />}
                            >
                                <DetailsPanel.ItemList className="space-y-1.5">
                                    {ctDetail.inputClaims.map((claim, idx) => (
                                        <DetailsPanel.Item key={idx} variant="blue">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-blue-700 dark:text-blue-300 text-sm">
                                                    {claim.claimType}
                                                </span>
                                                <DetailsPanel.CopyButton value={claim.value} label={claim.claimType} />
                                            </div>
                                            <p className="font-mono text-xs text-muted-foreground mt-1 break-all">
                                                {claim.value || "(empty)"}
                                            </p>
                                        </DetailsPanel.Item>
                                    ))}
                                </DetailsPanel.ItemList>
                            </DetailsPanel.Section>
                        )}

                        {/* Input Parameters */}
                        {ctDetail.inputParameters.length > 0 && (
                            <DetailsPanel.Section 
                                title="Input Parameters" 
                                icon={<Settings2 className="w-3 h-3" />}
                            >
                                <DetailsPanel.ItemList className="space-y-1.5">
                                    {ctDetail.inputParameters.map((param, idx) => (
                                        <DetailsPanel.SectionBox key={idx}>
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-foreground text-sm">{param.id}</span>
                                                <DetailsPanel.CopyButton value={param.value} label={param.id} />
                                            </div>
                                            <p className="font-mono text-xs text-muted-foreground mt-1 break-all">
                                                {param.value}
                                            </p>
                                        </DetailsPanel.SectionBox>
                                    ))}
                                </DetailsPanel.ItemList>
                            </DetailsPanel.Section>
                        )}

                        {/* Output Claims */}
                        {ctDetail.outputClaims.length > 0 && (
                            <DetailsPanel.Section 
                                title="Output Claims" 
                                icon={<CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                            >
                                <DetailsPanel.ItemList className="space-y-1.5">
                                    {ctDetail.outputClaims.map((claim, idx) => (
                                        <DetailsPanel.Item key={idx} variant="emerald">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-emerald-700 dark:text-emerald-300 text-sm">
                                                    {claim.claimType}
                                                </span>
                                                <DetailsPanel.CopyButton value={claim.value} label={claim.claimType} />
                                            </div>
                                            <p className="font-mono text-xs text-muted-foreground mt-1 break-all">
                                                {claim.value || "(empty)"}
                                            </p>
                                        </DetailsPanel.Item>
                                    ))}
                                </DetailsPanel.ItemList>
                            </DetailsPanel.Section>
                        )}
                    </>
                ) : (
                    <div className="p-4 bg-muted rounded-md text-center">
                        <p className="text-sm text-muted-foreground">
                            No detailed transformation data available.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            This transformation was invoked but detailed claim values were not captured.
                        </p>
                    </div>
                )}
            </DetailsPanel.Content>
        </DetailsPanel>
    );
};

export default ClaimsTransformationDetailsPanel;
