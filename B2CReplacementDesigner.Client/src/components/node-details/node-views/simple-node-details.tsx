import React from "react";
import type { Node } from "@xyflow/react";
import { InfoItem } from "../shared";
import { DetailsCard } from "../details-card";

type SimpleNodeData = {
    label?: string;
};

const SimpleNodeDetails: React.FC<{ node: Node; className?: string }> = ({ node, className }) => {
    const data = node.data as SimpleNodeData;

    return (
        <DetailsCard className={className}>
            <DetailsCard.Section title={`${node.type} Node`}>
                <div className="space-y-2">
                    <InfoItem label="Label" value={data.label || "N/A"} />
                </div>
            </DetailsCard.Section>
        </DetailsCard>
    );
};

export { SimpleNodeDetails };
