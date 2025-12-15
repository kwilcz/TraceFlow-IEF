"use client";

import React, { useMemo } from "react";
import { FlowArrow as Workflow, GearSix as Settings2, Lightning as Zap, ArrowSquareOut as ExternalLink } from "@phosphor-icons/react";
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

interface TechnicalProfileDetailsPanelProps {
    step: TraceStep;
    tpId: string;
}

export const TechnicalProfileDetailsPanel: React.FC<TechnicalProfileDetailsPanelProps> = ({ step, tpId }) => {
    const tpDetail = step.technicalProfileDetails?.find(tp => tp.id === tpId);
    
    const displayControlContext = useMemo(() => {
        for (const dcAction of step.displayControlActions) {
            if (dcAction.technicalProfiles) {
                const foundTp = dcAction.technicalProfiles.find(tp => tp.technicalProfileId === tpId);
                if (foundTp) {
                    return {
                        displayControlId: dcAction.displayControlId,
                        action: dcAction.action,
                        resultCode: dcAction.resultCode,
                        claimsTransformations: foundTp.claimsTransformations,
                        claimMappings: foundTp.claimMappings,
                    };
                }
            }
            if (dcAction.technicalProfileId === tpId) {
                return {
                    displayControlId: dcAction.displayControlId,
                    action: dcAction.action,
                    resultCode: dcAction.resultCode,
                    claimMappings: dcAction.claimMappings,
                };
            }
        }
        return null;
    }, [step.displayControlActions, tpId]);

    const previousClaims = step.claimsSnapshot;

    return (
        <DetailsPanel variant="technical-profile">
            <DetailsPanel.Header>
                <DetailsPanel.HeaderContent>
                    <DetailsPanel.TitleRow>
                        <DetailsPanel.Title icon={<Workflow className="w-5 h-5 text-violet-600 dark:text-violet-400" />}>
                            Technical Profile
                        </DetailsPanel.Title>
                    </DetailsPanel.TitleRow>
                    <DetailsPanel.Subtitle>{tpId}</DetailsPanel.Subtitle>
                    {tpDetail && (
                        <DetailsPanel.BadgeGroup>
                            <Badge variant="outline" className="text-xs">{tpDetail.providerType}</Badge>
                            {tpDetail.protocolType && (
                                <Badge variant="outline" className="text-xs">{tpDetail.protocolType}</Badge>
                            )}
                        </DetailsPanel.BadgeGroup>
                    )}
                </DetailsPanel.HeaderContent>
                <DetailsPanel.HeaderActions>
                    <DetailsPanel.CopyButton value={tpId} label="TP ID" />
                </DetailsPanel.HeaderActions>
            </DetailsPanel.Header>

            <DetailsPanel.Content>
                {/* Display Control Context */}
                {displayControlContext && (
                    <DetailsPanel.Section 
                        title="Display Control Context" 
                        icon={<Settings2 className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                    >
                        <DetailsPanel.SectionBox variant="orange">
                            <DetailsPanel.Row>
                                <DetailsPanel.Label>Display Control:</DetailsPanel.Label>
                                <DetailsPanel.Value mono truncate className="text-orange-700 dark:text-orange-300">
                                    {displayControlContext.displayControlId}
                                </DetailsPanel.Value>
                            </DetailsPanel.Row>
                            {displayControlContext.action && (
                                <DetailsPanel.Row>
                                    <DetailsPanel.Label>Action:</DetailsPanel.Label>
                                    <Badge variant="outline" className="text-xs truncate">
                                        {displayControlContext.action}
                                    </Badge>
                                </DetailsPanel.Row>
                            )}
                            {displayControlContext.resultCode && (
                                <DetailsPanel.Row>
                                    <DetailsPanel.Label>Result:</DetailsPanel.Label>
                                    <Badge 
                                        variant="outline" 
                                        className={cn(
                                            "text-xs",
                                            displayControlContext.resultCode === "200" 
                                                ? "text-green-600 border-green-400" 
                                                : "text-red-600 border-red-400"
                                        )}
                                    >
                                        {displayControlContext.resultCode}
                                    </Badge>
                                </DetailsPanel.Row>
                            )}
                        </DetailsPanel.SectionBox>
                        
                        {/* Claims Transformations within DC */}
                        {displayControlContext.claimsTransformations && displayControlContext.claimsTransformations.length > 0 && (
                            <div className="mt-3">
                                <h5 className="text-xs text-muted-foreground mb-2">
                                    Claims Transformations ({displayControlContext.claimsTransformations.length})
                                </h5>
                                <DetailsPanel.ItemList>
                                    {displayControlContext.claimsTransformations.map((ct, idx) => (
                                        <DetailsPanel.Item key={idx} variant="cyan">
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-sm text-cyan-700 dark:text-cyan-300">
                                                    {ct.id}
                                                </span>
                                                <DetailsPanel.CopyButton value={ct.id} label="CT ID" />
                                            </div>
                                            {ct.inputClaims.length > 0 && (
                                                <div className="mt-2 text-xs text-muted-foreground">
                                                    <span>Inputs: </span>
                                                    {ct.inputClaims.slice(0, 3).map((ic, i) => (
                                                        <Badge key={i} variant="outline" className="text-[10px] mr-1">
                                                            {ic.claimType}
                                                        </Badge>
                                                    ))}
                                                    {ct.inputClaims.length > 3 && <span>+{ct.inputClaims.length - 3} more</span>}
                                                </div>
                                            )}
                                            {ct.outputClaims.length > 0 && (
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    <span>Outputs: </span>
                                                    {ct.outputClaims.map((oc, i) => (
                                                        <Badge key={i} variant="outline" className="text-[10px] mr-1 text-emerald-600 border-emerald-400">
                                                            {oc.claimType}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </DetailsPanel.Item>
                                    ))}
                                </DetailsPanel.ItemList>
                            </div>
                        )}
                    </DetailsPanel.Section>
                )}

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
                        {step.isInteractiveStep && (
                            <DetailsPanel.Row>
                                <DetailsPanel.Label>Type:</DetailsPanel.Label>
                                <Badge variant="outline" className="text-xs text-purple-700 border-purple-500 dark:text-purple-400">
                                    Interactive
                                </Badge>
                            </DetailsPanel.Row>
                        )}
                        {step.actionHandler && (
                            <DetailsPanel.Row>
                                <DetailsPanel.Label>Handler:</DetailsPanel.Label>
                                <DetailsPanel.Value mono breakAll className="text-xs text-right">
                                    {step.actionHandler.split('.').pop()}
                                </DetailsPanel.Value>
                            </DetailsPanel.Row>
                        )}
                    </DetailsPanel.SectionBox>
                </DetailsPanel.Section>

                {/* Provider Details */}
                {tpDetail && (
                    <DetailsPanel.Section title="Provider Details">
                        <div className="space-y-2">
                            <DetailsPanel.SectionBox>
                                <DetailsPanel.Label>Provider Type</DetailsPanel.Label>
                                <DetailsPanel.Value mono className="block mt-1">{tpDetail.providerType}</DetailsPanel.Value>
                            </DetailsPanel.SectionBox>
                            {tpDetail.protocolType && (
                                <DetailsPanel.SectionBox>
                                    <DetailsPanel.Label>Protocol</DetailsPanel.Label>
                                    <DetailsPanel.Value mono className="block mt-1">{tpDetail.protocolType}</DetailsPanel.Value>
                                </DetailsPanel.SectionBox>
                            )}
                        </div>
                    </DetailsPanel.Section>
                )}

                {/* Claims Transformations (non-DC context) */}
                {tpDetail?.claimsTransformations && tpDetail.claimsTransformations.length > 0 && !displayControlContext && (
                    <DetailsPanel.Section 
                        title={`Claims Transformations (${tpDetail.claimsTransformations.length})`}
                        icon={<Zap className="w-3 h-3 text-cyan-500" />}
                    >
                        <DetailsPanel.ItemList>
                            {tpDetail.claimsTransformations.map((ct, idx) => (
                                <DetailsPanel.Item key={idx} variant="cyan">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-sm text-cyan-700 dark:text-cyan-300">{ct.id}</span>
                                        <DetailsPanel.CopyButton value={ct.id} label="CT ID" />
                                    </div>
                                    {ct.inputClaims.length > 0 && (
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            <span>Inputs: </span>
                                            {ct.inputClaims.slice(0, 3).map((ic, i) => (
                                                <Badge key={i} variant="outline" className="text-[10px] mr-1">{ic.claimType}</Badge>
                                            ))}
                                            {ct.inputClaims.length > 3 && <span>+{ct.inputClaims.length - 3} more</span>}
                                        </div>
                                    )}
                                    {ct.outputClaims.length > 0 && (
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            <span>Outputs: </span>
                                            {ct.outputClaims.map((oc, i) => (
                                                <Badge key={i} variant="outline" className="text-[10px] mr-1 text-emerald-600 border-emerald-400">
                                                    {oc.claimType}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </DetailsPanel.Item>
                            ))}
                        </DetailsPanel.ItemList>
                    </DetailsPanel.Section>
                )}

                {/* Validation TPs */}
                {step.validationTechnicalProfiles && step.validationTechnicalProfiles.length > 0 && (
                    <DetailsPanel.Section title="Validation Technical Profiles">
                        <DetailsPanel.ItemList className="space-y-1">
                            {step.validationTechnicalProfiles.map((vtp) => (
                                <DetailsPanel.Item key={vtp} variant="amber">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-amber-700 dark:text-amber-300 font-mono break-all">{vtp}</span>
                                        <DetailsPanel.CopyButton value={vtp} label="Validation TP" />
                                    </div>
                                </DetailsPanel.Item>
                            ))}
                        </DetailsPanel.ItemList>
                    </DetailsPanel.Section>
                )}

                {/* Backend API Calls */}
                {step.backendApiCalls && step.backendApiCalls.length > 0 && (
                    <DetailsPanel.Section title="Backend API Calls">
                        <div className="space-y-2">
                            {step.backendApiCalls.map((call, idx) => (
                                <DetailsPanel.SectionBox key={idx}>
                                    {call.requestType && (
                                        <Badge variant="outline" className="text-xs mb-2">{call.requestType}</Badge>
                                    )}
                                    {call.requestUri && (
                                        <div className="font-mono text-xs text-muted-foreground break-all flex items-start gap-1">
                                            <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                            {call.requestUri}
                                        </div>
                                    )}
                                </DetailsPanel.SectionBox>
                            ))}
                        </div>
                    </DetailsPanel.Section>
                )}

                {/* Claims */}
                {Object.keys(previousClaims).length > 0 && (
                    <DetailsPanel.Section title={`Claims After This Step (${Object.keys(previousClaims).length})`}>
                        <DetailsPanel.ItemList>
                            {Object.entries(previousClaims).map(([key, value]) => (
                                <div key={key} className="p-2 bg-card border rounded-md text-xs">
                                    <span className="font-medium text-foreground">{key}</span>
                                    <p className="font-mono text-muted-foreground truncate">{value}</p>
                                </div>
                            ))}
                        </DetailsPanel.ItemList>
                    </DetailsPanel.Section>
                )}
            </DetailsPanel.Content>
        </DetailsPanel>
    );
};

export default TechnicalProfileDetailsPanel;
