import React from "react";
import type { Node } from "@xyflow/react";
import { InfoItem, RawDataSection, Separator } from "../shared";
import { DetailsCard } from "../details-card";

const GenericNodeDetails: React.FC<{ node: Node; className?: string }> = ({ node, className }) => {
    const data = node.data as Record<string, unknown>;

    return (
        <DetailsCard className={className}>
            <DetailsCard.Section title="Node Information">
                <div className="space-y-2">
                    <InfoItem label="Type" value={node.type || "Unknown"} />
                    <InfoItem label="ID" value={node.id} />
                </div>
            </DetailsCard.Section>

            <Separator />
            <RawDataSection data={data} />
        </DetailsCard>
    );
};

export { GenericNodeDetails };
