import React from "react";
import { Badge } from "@/components/ui/badge";
import type { InheritanceInfo, TechnicalProfileEntity } from "@/types/trust-framework-entities";
import { DetailsCard } from "../details-card";
import { ClickableReference } from "../shared";

const InheritanceDetails: React.FC<{ inheritanceChain: InheritanceInfo[]; profile: TechnicalProfileEntity; className?: string }> = ({
    inheritanceChain,
    profile,
    className,
}) => (
    <DetailsCard.Section title="Inheritance Chain" className={className}>
        <div className="space-y-1">
            {[...inheritanceChain].reverse().map((parent, idx) => {
                const isCurrent = profile.id === parent.profileId;
                const badgeClass = isCurrent
                    ? "bg-green-900/50 border-green-500 text-green-200"
                    : parent.inheritanceType === "Direct"
                    ? "bg-purple-900/50 border-purple-500 text-purple-200"
                    : "bg-indigo-900/50 border-indigo-500 text-indigo-200";
                const badgeLabel = isCurrent ? "Current" : parent.inheritanceType === "Direct" ? "Direct" : "Included";

                return (
                    <div key={idx} className="flex items-center space-x-2">
                        <Badge className={badgeClass}>{badgeLabel}</Badge>
                        <ClickableReference
                            value={parent.profileId}
                            type="technicalProfile"
                            color={isCurrent ? "green" : "purple"}
                        />
                    </div>
                );
            })}
        </div>
    </DetailsCard.Section>
);

export { InheritanceDetails };
