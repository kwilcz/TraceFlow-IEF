import React from "react";
import type { Node } from "@xyflow/react";
import { InfoItem, RawDataSection, Separator } from "../shared";
import { DetailsCard } from "../details-card";

type GroupNodeData = {
    label?: string;
    isCollapsed?: boolean;
    details?: unknown;
};

const GroupDetails: React.FC<{ node: Node; className?: string }> = ({ node, className }) => {
    const data = node.data as GroupNodeData;

    return (
        <DetailsCard className={className}>
            <DetailsCard.Section title="Group Node">
                <div className="space-y-2">
                    <InfoItem label="Label" value={data.label || "N/A"} />
                    <InfoItem label="Collapsed" value={data.isCollapsed ? "Yes" : "No"} />
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

export { GroupDetails };
