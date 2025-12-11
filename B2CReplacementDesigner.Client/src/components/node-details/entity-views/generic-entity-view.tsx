import React from "react";
import type { AnyTrustFrameworkEntity } from "@/types/trust-framework-entities";
import { DetailsCard } from "../details-card";
import { InfoItem, RawDataSection, Separator } from "../shared";

const GenericEntityView: React.FC<{ entity: AnyTrustFrameworkEntity; className?: string }> = ({ entity, className }) => (
    <DetailsCard className={className}>
        <DetailsCard.Section title={entity.entityType}>
            <div className="space-y-2">
                <InfoItem label="ID" value={entity.id} />
                <InfoItem label="Source File" value={entity.sourceFile} />
                <InfoItem label="Source Policy" value={entity.sourcePolicyId} />
            </div>
        </DetailsCard.Section>
        <Separator />
        <RawDataSection data={entity} />
    </DetailsCard>
);

export { GenericEntityView };
