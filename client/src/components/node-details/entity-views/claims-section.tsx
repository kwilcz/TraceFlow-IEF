import React from "react";
import { cn } from "@/lib/utils";
import type { Claim } from "@/components/nodeTypes/node-claim-components";
import { DetailsCard } from "../details-card";
import { ClaimItem } from "@/components/nodeTypes/node-claim-components";

const ClaimsSection: React.FC<{
    title: string;
    claims: Claim[];
    color: "blue" | "green" | "cyan";
    className?: string;
}> = ({ title, claims, color, className }) => {
    const colorMap = {
        blue: "bg-blue-900/20 border-blue-500/30 text-blue-300",
        green: "bg-green-900/20 border-green-500/30 text-green-300",
        cyan: "bg-cyan-900/20 border-cyan-500/30 text-cyan-300",
    } as const;

    return (
        <DetailsCard.Section title={`${title} (${claims.length})`} className={className}>
            <div className={cn("rounded-lg p-2 border", colorMap[color])}>
                <div className="max-h-64 overflow-y-auto pr-2">
                    <div className="space-y-1">
                        {claims.map((claim, idx) => (
                            <ClaimItem key={idx} claim={claim} color={color} />
                        ))}
                    </div>
                </div>
            </div>
        </DetailsCard.Section>
    );
};

export { ClaimsSection };
