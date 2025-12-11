import React from "react";
import { cn } from "@/lib/utils";
import { DetailsCard } from "../details-card";
import { ClickableReference } from "../shared";

const TransformationsSection: React.FC<{
    title: string;
    transformations: Array<string | { id: string }>;
    color: "violet" | "amber";
    className?: string;
}> = ({ title, transformations, color, className }) => {
    const colorMap = {
        violet: "bg-violet-900/20 border-violet-500/30 text-violet-300",
        amber: "bg-amber-900/20 border-amber-500/30 text-amber-300",
    } as const;

    return (
        <DetailsCard.Section title={`${title} (${transformations.length})`} className={className}>
            <div className={cn("rounded-lg p-2 border", colorMap[color])}>
                <div className="max-h-64 overflow-y-auto pr-2">
                    <div className="space-y-1">
                        {transformations.map((transform, idx) => (
                            <ClickableReference
                                key={idx}
                                value={typeof transform === "string" ? transform : transform.id}
                                type="transformation"
                                color={color}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </DetailsCard.Section>
    );
};

export { TransformationsSection };
