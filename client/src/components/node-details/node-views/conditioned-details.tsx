import React from "react";
import type { Node } from "@xyflow/react";
import type { ConditionedNodeData } from "@/types/nodes";
import { Claim, ClaimItem } from "@/components/nodeTypes/node-claim-components";
import { InfoItem } from "../shared";
import { DetailsCard } from "../details-card";

const ConditionedDetails: React.FC<{ node: Node; className?: string }> = ({ node, className }) => {
    const data = node.data as ConditionedNodeData;
    const claim: Claim = { claimTypeReferenceId: data.claimTypeReferenceId };

    return (
        <DetailsCard className={className}>
            <DetailsCard.Section title="Conditioned Node">
                <div className="space-y-2">
                    <InfoItem label="Full Condition" value={data.label || "N/A"} />
                    <InfoItem label="Claim" value={<ClaimItem claim={claim} color="amber" />} />
                    <InfoItem label="Operator Type" value={data.operatorType || "N/A"} />
                    {data.conditionValue != null && <InfoItem label="Condition Value" value={String(data.conditionValue)} />}
                    <InfoItem label="Action" value={data.action || "N/A"} />
                    <InfoItem label="Execute Action" value={data.executeActionsIf ? "Yes" : "No"} />
                </div>
            </DetailsCard.Section>
        </DetailsCard>
    );
};

export { ConditionedDetails };
