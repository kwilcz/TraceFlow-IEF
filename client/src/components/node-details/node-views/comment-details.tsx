import React from "react";
import type { Node } from "@xyflow/react";
import { InfoItem } from "../shared";
import { DetailsCard } from "../details-card";

type CommentNodeData = {
    label?: string;
    comment?: string | number;
};

const CommentDetails: React.FC<{ node: Node; className?: string }> = ({ node, className }) => {
    const data = node.data as CommentNodeData;

    return (
        <DetailsCard className={className}>
            <DetailsCard.Section title="Comment Node">
                <div className="space-y-2">
                    <InfoItem label="Label" value={data.label || "N/A"} />
                    {data.comment && (
                        <div className="bg-yellow-900/20 rounded-lg p-3 border border-yellow-500/30">
                            <p className="text-sm text-yellow-200 whitespace-pre-wrap">{String(data.comment)}</p>
                        </div>
                    )}
                </div>
            </DetailsCard.Section>
        </DetailsCard>
    );
};

export { CommentDetails };
