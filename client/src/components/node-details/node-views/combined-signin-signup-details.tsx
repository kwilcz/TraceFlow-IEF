import React from "react";
import type { Node } from "@xyflow/react";
import { InfoItem, RawDataSection, Separator } from "../shared";
import { DetailsCard } from "../details-card";

type CombinedNodeData = {
    label?: string;
    stepOrder?: string | number;
    details?: unknown;
};

const CombinedSignInSignUpDetails: React.FC<{ node: Node; className?: string }> = ({ node, className }) => {
    const data = node.data as CombinedNodeData;

    return (
        <DetailsCard className={className}>
            <DetailsCard.Section title="Combined SignIn & SignUp">
                <div className="space-y-2">
                    <InfoItem label="Label" value={data.label || "N/A"} />
                    {data.stepOrder && <InfoItem label="Step Order" value={String(data.stepOrder)} />}
                </div>
            </DetailsCard.Section>

            {data.details ? (
                <>
                    <Separator />
                    <RawDataSection data={data.details} />
                </>
            ) : null}
        </DetailsCard>
    );
};

export { CombinedSignInSignUpDetails };
