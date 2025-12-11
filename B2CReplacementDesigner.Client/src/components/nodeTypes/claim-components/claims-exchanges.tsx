import React from "react";
import { ClickableReference } from "../../node-details";
import { cn } from "@/lib/utils";

interface ClaimsExchangesListProps {
    exchanges: Array<{
        id: string;
        technicalProfileReferenceId: string;
    }>;
    className?: string;
    rowClassName?: string;
    arrowClassName?: string;
}

export const ClaimsExchangesList: React.FC<ClaimsExchangesListProps> = ({
    exchanges,
    className,
    rowClassName,
    arrowClassName,
}) => {
    if (exchanges.length === 0) return null;

    return (
        <div className={cn("space-y-1", className)}>
            {exchanges.map((exchange, idx) => (
                <div key={idx} className={cn("flex items-center gap-2", rowClassName)}>
                    <ClickableReference
                        value={exchange.id}
                        type="claimsExchange"
                        color="green"
                        title={`Exchange: ${exchange.id}`}
                    />
                    <span className={cn("text-slate-400 text-[10px]", arrowClassName)}>→</span>
                    <ClickableReference
                        value={exchange.technicalProfileReferenceId}
                        type="technicalProfile"
                        color="blue"
                        title={`Technical Profile: ${exchange.technicalProfileReferenceId}`}
                    />
                </div>
            ))}
        </div>
    );
};
