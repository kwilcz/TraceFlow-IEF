import React, { useMemo } from "react";
import type { Node } from "@xyflow/react";
import type { ClaimReference, OrchestrationStepWithTechnicalProfile } from "@/types/technical-profile";
import { usePolicyStore } from "@/stores/policy-store";
import type { TechnicalProfileEntity } from "@/types/trust-framework-entities";
import { getEntity } from "@/types/trust-framework-entities";
import { DetailsCard } from "../details-card";
import { InfoItem, Separator } from "../shared";
import { TechnicalProfileDetails } from "../entity-views";
import { ClaimsList } from "@/components/nodeTypes/claim-components";

interface GetClaimsNodeData {
    label?: string;
    stepOrder?: string | number;
    orchestrationStep?: OrchestrationStepWithTechnicalProfile;
    relyingPartyInputClaims?: ClaimReference[];
}

const GetClaimsDetails: React.FC<{ node: Node; className?: string }> = ({ node, className }) => {
    const data = node.data as GetClaimsNodeData;
    const entities = usePolicyStore((state) => state.entities);
    const primaryProfile = data.orchestrationStep?.technicalProfiles?.[0];
    const primaryProfileEntity: TechnicalProfileEntity | undefined = (primaryProfile?.id && entities)
        ? getEntity(entities, 'TechnicalProfile', primaryProfile.id) as TechnicalProfileEntity | undefined
        : undefined;

    const sourceClaims = useMemo(() => {
        if (primaryProfile?.inputClaims?.length) {
            return primaryProfile.inputClaims;
        }
        return data.relyingPartyInputClaims ?? [];
    }, [data.relyingPartyInputClaims, primaryProfile?.inputClaims]);

    const tokenClaimMappings = useMemo(() => {
        return sourceClaims.map((claim) => ({
            claim,
            paramName: extractQueryParamName(claim.defaultValue) ?? claim.partnerClaimType,
        }));
    }, [sourceClaims]);

    const isUsingRelyingParty = !primaryProfile?.inputClaims?.length && Boolean(data.relyingPartyInputClaims?.length);

    const issuerReference = data.orchestrationStep?.cpimIssuerTechnicalProfileReferenceId || primaryProfile?.id;

    return (
        <DetailsCard className={className}>
            <DetailsCard.Section title="Node Information">
                <InfoItem label="Node Type" value="Get Claims" />
                <InfoItem label="Label" value={data.label || primaryProfile?.displayName || node.id} />
                <InfoItem label="Step Order" value={data.stepOrder || data.orchestrationStep?.order || "N/A"} />
                <InfoItem label="Issuer Profile" value={issuerReference || "N/A"} />
                <InfoItem
                    label="Claim Source"
                    value={isUsingRelyingParty ? "Relying Party PolicyProfile" : "Technical Profile"}
                />
            </DetailsCard.Section>

            {tokenClaimMappings.length > 0 && (
                <DetailsCard.Section title="Input Claims from id_token_hint">
                    <ClaimsList claims={tokenClaimMappings.map((mapping) => mapping.claim)} color="cyan" />

                    {isUsingRelyingParty && (
                        <p className="text-[11px] text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1">
                            Claims are sourced from the PolicyProfile defined in the Relying Party.
                        </p>
                    )}
                </DetailsCard.Section>
            )}
            {primaryProfileEntity ? (
                <>
                    <Separator />
                    <TechnicalProfileDetails profile={primaryProfileEntity} />
                </>
            ) : primaryProfile ? (
                <>
                    <Separator />
                    <DetailsCard.Section title="Technical Profile">
                        <div className="space-y-2">
                            <InfoItem label="ID" value={primaryProfile.id} />
                            {primaryProfile.displayName && (
                                <InfoItem label="Display Name" value={primaryProfile.displayName} />
                            )}
                            {primaryProfile.protocol?.name && (
                                <InfoItem label="Protocol" value={primaryProfile.protocol.name} />
                            )}
                        </div>
                    </DetailsCard.Section>
                </>
            ) : null}
        </DetailsCard>
    );
};

function extractQueryParamName(defaultValue?: string): string | undefined {
    if (!defaultValue) return undefined;

    const braceMatch = defaultValue.match(/\{\s*(?:QueryString)\s*:\s*([^}]+)\}/i);
    if (braceMatch?.[1]) {
        return braceMatch[1].trim();
    }

    const prefixMatch = defaultValue.match(/^(?:QueryString)\s*:\s*(.+)$/i);
    if (prefixMatch?.[1]) {
        return prefixMatch[1].trim();
    }

    return undefined;
}

export { GetClaimsDetails };
