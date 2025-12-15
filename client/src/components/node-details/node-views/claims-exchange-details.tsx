import React from "react";
import type { Node } from "@xyflow/react";
import { usePolicyStore } from "@/stores/policy-store";
import { getEntity, TechnicalProfileEntity } from "@/types/trust-framework-entities";
import { TechnicalProfileDetails } from "../entity-views";
import { ClickableReference, InfoItem, Separator } from "../shared";
import { DetailsCard } from "../details-card";

type ClaimsExchangeNodeData = {
    label?: string;
    stepOrder?: string | number;
    claimsExchanges?: string[];
    details?: { stepOrder?: string | number } & Record<string, unknown>;
};

const ClaimsExchangeDetails: React.FC<{ node: Node; className?: string }> = ({ node, className }) => {
    const data = node.data as ClaimsExchangeNodeData;
    const entities = usePolicyStore((state) => state.entities);
    const primaryProfileId = data.claimsExchanges?.[0];
    const primaryProfile = (primaryProfileId && entities)
        ? getEntity(entities, 'TechnicalProfile', primaryProfileId) as TechnicalProfileEntity | undefined
        : undefined;

    return (
        <DetailsCard className={className}>
            <DetailsCard.Section title="Node Information">
                <div className="space-y-2">
                    <InfoItem label="Node Type" value="Claims Exchange" />
                    <InfoItem label="Label" value={data.label || "N/A"} />
                    <InfoItem label="Step Order" value={data.stepOrder || data.details?.stepOrder || "N/A"} />
                </div>
            </DetailsCard.Section>

            {primaryProfile && (
                <>
                    <Separator />
                    <TechnicalProfileDetails profile={primaryProfile} />
                </>
            )}

            {Array.isArray(data.claimsExchanges) && data.claimsExchanges.length > 0 && (
                <>
                    <Separator />
                    <DetailsCard.Section title="Claims Exchanges">
                        <div className="space-y-1">
                            {data.claimsExchanges.map((ce: string, idx: number) => (
                                <ClickableReference key={idx} value={ce} type="claimsExchange" color="cyan" />
                            ))}
                        </div>
                    </DetailsCard.Section>
                </>
            )}
        </DetailsCard>
    );
};

export { ClaimsExchangeDetails };
