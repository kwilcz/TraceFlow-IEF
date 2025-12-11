import React from "react";
import type { DisplayControl } from "@/types/technical-profile";
import type { TechnicalProfileEntity } from "@/types/trust-framework-entities";
import { DisplayClaimsSection } from "@/components/nodeTypes/node-claim-components";
import { DetailsCard } from "../details-card";
import { InfoItem, Separator } from "../shared";
import { InheritanceDetails } from "./inheritance-details";
import { DisplayControlsSection } from "./display-controls-section";
import { ClaimsSection } from "./claims-section";
import { TransformationsSection } from "./transformations-section";

const TechnicalProfileDetails: React.FC<{ profile: TechnicalProfileEntity; className?: string }> = ({ profile, className }) => {
    const inputClaims = profile?.inputClaims || [];
    const outputClaims = profile?.outputClaims || [];
    const persistedClaims = profile?.persistedClaims || [];
    const displayClaims = profile.displayClaims || [];
    const metadataItems = profile?.metadata || [];
    const displayControls: DisplayControl[] = [];
    const inputTransformations = profile.inputClaimsTransformations;
    const outputTransformations = profile.outputClaimsTransformations;

    return (
        <DetailsCard className={className}>
            <DetailsCard.Section title="Technical Profile">
                <InfoItem label="ID" value={profile.id} />
                <InfoItem label="Display Name" value={profile.displayName} />
                <InfoItem label="Provider" value={profile.providerName} />
                {profile.sourceFile && <InfoItem label="Source File" value={profile.sourceFile} />}
            </DetailsCard.Section>

            {profile.inheritanceChain && profile.inheritanceChain.length > 1 && (
                <>
                    <Separator />
                    <InheritanceDetails inheritanceChain={profile.inheritanceChain} profile={profile} />
                </>
            )}

            {displayClaims.length > 0 && (
                <>
                    <Separator />
                    <DisplayClaimsSection displayClaims={displayClaims} mode="detailed" />
                </>
            )}

            {metadataItems.length > 0 && (
                <>
                    <Separator />
                    <DetailsCard.Section title="Metadata">
                        {metadataItems.map((item, index) => (
                            <InfoItem label={item.key} value={item.value} key={`${item.key}-${index}`} />
                        ))}
                    </DetailsCard.Section>
                </>
            )}

            {displayControls.length > 0 && (
                <>
                    <Separator />
                    <DisplayControlsSection displayControls={displayControls} />
                </>
            )}

            {inputClaims.length > 0 && (
                <>
                    <Separator />
                    <ClaimsSection title="Input Claims" claims={inputClaims} color="blue" />
                </>
            )}

            {inputTransformations.length > 0 && (
                <>
                    <Separator />
                    <TransformationsSection title="Input Transformations" transformations={inputTransformations} color="violet" />
                </>
            )}

            {outputClaims.length > 0 && (
                <>
                    <Separator />
                    <ClaimsSection title="Output Claims" claims={outputClaims} color="green" />
                </>
            )}

            {persistedClaims.length > 0 && (
                <>
                    <Separator />
                    <ClaimsSection title="Persisted Claims" claims={persistedClaims} color="cyan" />
                </>
            )}

            {outputTransformations.length > 0 && (
                <>
                    <Separator />
                    <TransformationsSection title="Output Transformations" transformations={outputTransformations} color="amber" />
                </>
            )}
        </DetailsCard>
    );
};

export { TechnicalProfileDetails };
