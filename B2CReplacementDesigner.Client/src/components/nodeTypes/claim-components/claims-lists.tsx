import React from "react";
import { cn } from "@/lib/utils";
import { Claim, DisplayControl, MAX_VISIBLE_CLAIMS } from "./types";
import { ClaimItem, DisplayControlItem } from "./claim-item";
import { DisplayClaimReference } from "@/types/technical-profile";
import { ReferenceList } from "./reference-list";

interface ClaimsListProps {
    claims: Claim[];
    color: "blue" | "green" | "cyan" | "amber";
    onClaimClick?: (claimId: string) => void;
    className?: string;
    toggleClassName?: string;
    maxVisible?: number;
}

const TOGGLE_COLOR_MAP: Record<ClaimsListProps["color"], string> = {
    blue: "text-blue-400 bg-blue-800/40",
    green: "text-green-400 bg-green-800/40",
    cyan: "text-cyan-400 bg-cyan-800/40",
    amber: "text-amber-400 bg-amber-800/40",
};

export const ClaimsList: React.FC<ClaimsListProps> = ({
    claims,
    color,
    onClaimClick,
    className,
    toggleClassName,
    maxVisible = MAX_VISIBLE_CLAIMS,
}) => {
    if (claims.length === 0) return null;

    return (
        <ReferenceList items={claims} className={className} maxVisible={maxVisible}>
            {(visibleClaims) => (
                <>
                    {visibleClaims.map((claim, idx) => (
                        <ClaimItem key={`${claim.claimTypeReferenceId ?? idx}-${idx}`} claim={claim} color={color} onClick={onClaimClick} />
                    ))}
                    <ReferenceList.Toggle
                        className={cn(TOGGLE_COLOR_MAP[color], toggleClassName)}
                        titleCollapsed={`Show all ${claims.length} claims`}
                        titleExpanded="Show fewer claims"
                    />
                </>
            )}
        </ReferenceList>
    );
};

interface DisplayClaimsListProps {
    claims: DisplayClaimReference[];
    onClaimClick?: (claimId: string) => void;
    className?: string;
    toggleClassName?: string;
    maxVisible?: number;
}

export const DisplayClaimsList: React.FC<DisplayClaimsListProps> = ({
    claims,
    onClaimClick,
    className,
    toggleClassName,
    maxVisible = MAX_VISIBLE_CLAIMS,
}) => {
    if (claims.length === 0) return null;

    return (
        <ReferenceList items={claims} className={className} maxVisible={maxVisible}>
            {(visibleEntities) => (
                <>
                    {visibleEntities.map((claim, idx) => {
                        if (claim.claimTypeReferenceId) {
                            return <ClaimItem key={`claim-${idx}`} claim={claim} color="amber" onClick={onClaimClick} />;
                        }

                        if (claim.displayControlReferenceId) {
                            return (
                                <DisplayControlItem
                                    key={`display-${idx}`}
                                    control={{ id: claim.displayControlReferenceId } as DisplayControl}
                                    color="purple"
                                    showLabel={true}
                                    onClick={onClaimClick}
                                />
                            );
                        }

                        return null;
                    })}
                    <ReferenceList.Toggle
                        className={cn("text-amber-400 bg-amber-800/40", toggleClassName)}
                        titleCollapsed={`Show all ${claims.length} claims`}
                        titleExpanded="Show fewer claims"
                    />
                </>
            )}
        </ReferenceList>
    );
};

interface DisplayClaimsSectionProps {
    displayClaims: Claim[];
    mode?: "compact" | "detailed";
    onClaimClick?: (claimId: string) => void;
    className?: string;
    titleClassName?: string;
    contentClassName?: string;
}

export const DisplayClaimsSection: React.FC<DisplayClaimsSectionProps> = ({
    displayClaims,
    mode = "detailed",
    onClaimClick,
    className,
    titleClassName,
    contentClassName,
}) => {
    if (displayClaims.length === 0) return null;
    if (mode === "compact") {
        return <DisplayClaimsList claims={displayClaims} onClaimClick={onClaimClick} />;
    }

    return (
        <div className={className}>
            <h3 className={cn("text-sm font-semibold text-muted-foreground mb-2", titleClassName)}>
                Display Claims ({displayClaims.length})
            </h3>
            <div className={cn("bg-amber-900/20 rounded-lg p-2 border border-amber-500/30", contentClassName)}>
                <div className="max-h-64 overflow-y-auto pr-2">
                    <div className="space-y-1">
                        {displayClaims.map((claim, idx) => (
                            <ClaimItem key={`display-${idx}`} claim={claim} color="amber" onClick={onClaimClick} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export type { Claim } from "./types";
