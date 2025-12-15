import React from "react";
import { ClickableReference } from "../../node-details";
import { cn } from "@/lib/utils";

interface ProviderSelectionsListProps {
    selections: Array<{
        targetClaimsExchangeId?: string;
        validationClaimsExchangeId?: string;
    }>;
    className?: string;
    itemClassName?: string;
}

export const ProviderSelectionsList: React.FC<ProviderSelectionsListProps> = ({
    selections,
    className,
    itemClassName,
}) => {
    if (selections.length === 0) return null;

    return (
        <div className={cn("space-y-1", className)}>
            {selections.map((selection, idx) => {
                const exchangeId = selection.targetClaimsExchangeId || selection.validationClaimsExchangeId;
                if (!exchangeId) return null;

                return (
                    <ClickableReference
                        key={idx}
                        value={exchangeId}
                        type="claimsExchange"
                        color="cyan"
                        title={exchangeId}
                        className={itemClassName}
                    />
                );
            })}
        </div>
    );
};
