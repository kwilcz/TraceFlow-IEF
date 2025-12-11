"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { TraceStep, DisplayControlAction } from "@/types/trace";
import { DetailsPanel } from "../details-panel";
import { Activity, Check, ArrowRight, FileCode, LucideIcon, Layers } from "lucide-react";

interface DisplayControlPanelProps {
    step: TraceStep;
    displayControlId: string;
    action?: string;
}

/**
 * Gets the icon for the action type.
 */
function getActionIcon(action: string): LucideIcon {
    const normalizedAction = action.toLowerCase();
    if (normalizedAction.includes("verify")) return Check;
    if (normalizedAction.includes("send")) return ArrowRight;
    if (normalizedAction.includes("get")) return Activity;
    return FileCode;
}

/**
 * Gets the badge variant for result code.
 */
function getResultBadgeVariant(resultCode?: string): "default" | "destructive" | "secondary" | "outline" {
    if (!resultCode) return "secondary";
    if (resultCode === "200" || resultCode.startsWith("2")) return "default";
    if (resultCode.startsWith("4") || resultCode.startsWith("5")) return "destructive";
    return "outline";
}

/**
 * Finds the display control action by ID and action.
 */
function findDisplayControlAction(
    step: TraceStep, 
    displayControlId: string, 
    action?: string
): DisplayControlAction | undefined {
    return step.displayControlActions.find((dc) => {
        if (dc.displayControlId !== displayControlId) return false;
        if (action && dc.action !== action) return false;
        return true;
    });
}

/**
 * DisplayControlPanel - Shows details about a display control action.
 * 
 * Focuses on:
 * - Display control ID and action
 * - Result code status
 * - Technical profiles invoked by the action
 * - Claims transformations count
 * - Step context
 */
export function DisplayControlPanel({ step, displayControlId, action }: DisplayControlPanelProps) {
    const dcAction = findDisplayControlAction(step, displayControlId, action);
    
    if (!dcAction) {
        return (
            <DetailsPanel variant="displayControl">
                <DetailsPanel.Header>
                    <DetailsPanel.TitleRow>
                        <DetailsPanel.Title icon={<Activity className="w-5 h-5" />}>Display Control</DetailsPanel.Title>
                    </DetailsPanel.TitleRow>
                    <DetailsPanel.Subtitle>{displayControlId}</DetailsPanel.Subtitle>
                </DetailsPanel.Header>
                <DetailsPanel.Content>
                    <DetailsPanel.Empty>Display control action not found</DetailsPanel.Empty>
                </DetailsPanel.Content>
            </DetailsPanel>
        );
    }

    const ActionIcon = dcAction.action ? getActionIcon(dcAction.action) : Activity;

    return (
        <DetailsPanel variant="displayControl">
            <DetailsPanel.Header>
                <DetailsPanel.TitleRow>
                    <DetailsPanel.Title icon={<ActionIcon className="w-5 h-5" />}>
                        {dcAction.displayControlId}
                    </DetailsPanel.Title>
                    {dcAction.resultCode && (
                        <Badge variant={getResultBadgeVariant(dcAction.resultCode)}>
                            {dcAction.resultCode}
                        </Badge>
                    )}
                </DetailsPanel.TitleRow>
                {dcAction.action && (
                    <DetailsPanel.Subtitle>
                        Action: {dcAction.action}
                    </DetailsPanel.Subtitle>
                )}
                {step.uiSettings?.pageType && (
                    <DetailsPanel.BadgeGroup className="mt-2">
                        <Badge variant="outline">{step.uiSettings.pageType}</Badge>
                        {step.uiSettings.contentDefinition && (
                            <Badge variant="secondary">{step.uiSettings.contentDefinition}</Badge>
                        )}
                    </DetailsPanel.BadgeGroup>
                )}
            </DetailsPanel.Header>

            <DetailsPanel.Content>
                {/* Technical Profiles Section */}
                {dcAction.technicalProfiles && dcAction.technicalProfiles.length > 0 && (
                    <DetailsPanel.Section title="Technical Profiles">
                        <p className="text-xs text-muted-foreground mb-2">
                            TPs invoked by this display control action
                        </p>
                        <DetailsPanel.ItemList>
                            {dcAction.technicalProfiles.map((tp, index) => (
                                <DetailsPanel.Item key={`${tp.technicalProfileId}-${index}`}>
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                        <span className="font-mono text-xs">{tp.technicalProfileId}</span>
                                        {tp.claimsTransformations && (
                                            <Badge variant="secondary" className="text-xs ml-auto">
                                                {tp.claimsTransformations.length} CT(s)
                                            </Badge>
                                        )}
                                    </div>
                                </DetailsPanel.Item>
                            ))}
                        </DetailsPanel.ItemList>
                    </DetailsPanel.Section>
                )}

                {/* Legacy single TP fallback */}
                {!dcAction.technicalProfiles && dcAction.technicalProfileId && (
                    <DetailsPanel.Section title="Technical Profile">
                        <DetailsPanel.Row>
                            <DetailsPanel.Label>Profile ID</DetailsPanel.Label>
                            <DetailsPanel.Value mono>
                                {dcAction.technicalProfileId}
                            </DetailsPanel.Value>
                        </DetailsPanel.Row>
                    </DetailsPanel.Section>
                )}

                {/* Step Context */}
                <DetailsPanel.Section title="Step Context">
                    <DetailsPanel.Row>
                        <DetailsPanel.Label>Sequence</DetailsPanel.Label>
                        <DetailsPanel.Value>{step.sequenceNumber}</DetailsPanel.Value>
                    </DetailsPanel.Row>
                    <DetailsPanel.Row>
                        <DetailsPanel.Label>Orchestration Step</DetailsPanel.Label>
                        <DetailsPanel.Value>{step.stepOrder}</DetailsPanel.Value>
                    </DetailsPanel.Row>
                    {step.technicalProfiles.length > 0 && (
                        <DetailsPanel.Row>
                            <DetailsPanel.Label>Main TP</DetailsPanel.Label>
                            <DetailsPanel.Value mono>
                                {step.technicalProfiles[0]}
                            </DetailsPanel.Value>
                        </DetailsPanel.Row>
                    )}
                    {step.duration !== undefined && (
                        <DetailsPanel.Row>
                            <DetailsPanel.Label>Duration</DetailsPanel.Label>
                            <DetailsPanel.Value>{step.duration}ms</DetailsPanel.Value>
                        </DetailsPanel.Row>
                    )}
                </DetailsPanel.Section>
            </DetailsPanel.Content>
        </DetailsPanel>
    );
}
