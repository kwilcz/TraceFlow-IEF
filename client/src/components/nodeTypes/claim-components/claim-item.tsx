import React from "react";
import { ClickableReference } from "@/components/node-details";
import { useSidebarNavigation } from "@/hooks/use-sidebar-navigation";
import { usePolicyStore } from "@/stores/policy-store";
import { Claim, DisplayControl } from "./types";
import { getEntity } from "@/types/trust-framework-entities";
import { cn } from "@/lib/utils";
import { ArrowRight, Plus, Minus, ArrowsClockwise as RefreshCw } from "@phosphor-icons/react";

export const ClaimItem: React.FC<{
    claim: Claim;
    color: "blue" | "green" | "cyan" | "amber";
    onClick?: (claimId: string) => void;
    className?: string;
}> = ({ claim, color, onClick: customOnClick, className }) => {
    const { navigateToEntity } = useSidebarNavigation();
    const entities = usePolicyStore((state) => state.entities);

    const claimId = claim.claimTypeReferenceId || "N/A";
    const hasDefault = claim.defaultValue && claim.alwaysUseDefaultValue;
    const text = hasDefault ? `${claimId} = ${claim.defaultValue}` : claimId;
    const isRequired = claim.required || false;

    const handleClick = () => {
        if (customOnClick) {
            customOnClick(claimId);
            return;
        }

        if (entities && claim.claimTypeReferenceId) {
            const claimEntity = getEntity(entities, 'ClaimType', claim.claimTypeReferenceId);
            if (claimEntity) {
                navigateToEntity(claimEntity, claim.claimTypeReferenceId);
            }
        }
    };

    return (
        <ClickableReference
            value={text}
            type="claim"
            color={color}
            className={className}
            required={isRequired}
            title={text}
            onClick={handleClick}
        />
    );
};

export const DisplayControlItem: React.FC<{
    control: DisplayControl;
    color?: "purple";
    showLabel?: boolean;
    onClick?: (id: string) => void;
    className?: string;
}> = ({ control, color = "purple", showLabel = false, onClick, className }) => {
    const { navigateToEntity } = useSidebarNavigation();
    const entities = usePolicyStore((state) => state.entities);

    const handleClick = () => {
        if (onClick) {
            onClick(control.id);
            return;
        }

        const entity = entities ? getEntity(entities, 'DisplayControl', control.id) : undefined;
        if (entity) {
            navigateToEntity(entity, control.id);
        }
    };

    return (
        <ClickableReference
            value={control.id}
            type="displayControl"
            color={color}
            label={showLabel ? "Display Control" : undefined}
            title={control.id}
            onClick={handleClick}
            className={className}
        />
    );
};

/**
 * Change status for trace claim display.
 */
export type ClaimChangeStatus = "added" | "modified" | "removed" | "unchanged";

/**
 * TraceClaimItem - Displays a claim with its value in trace context.
 * Supports showing change status (added/modified/removed) with appropriate styling.
 */
export const TraceClaimItem: React.FC<{
    /** The claim key/name */
    claimKey: string;
    /** The claim value */
    value: string;
    /** Optional previous value (for modified claims) */
    previousValue?: string;
    /** Change status for visual indication */
    changeStatus?: ClaimChangeStatus;
    /** Click handler */
    onClick?: (claimKey: string) => void;
    /** Additional CSS classes */
    className?: string;
    /** Whether to show the value inline or truncated */
    compact?: boolean;
}> = ({ 
    claimKey, 
    value, 
    previousValue, 
    changeStatus = "unchanged",
    onClick,
    className,
    compact = false,
}) => {
    const { navigateToEntity } = useSidebarNavigation();
    const entities = usePolicyStore((state) => state.entities);

    const handleClick = () => {
        if (onClick) {
            onClick(claimKey);
            return;
        }

        // Try to navigate to claim type entity
        if (entities) {
            const claimEntity = getEntity(entities, 'ClaimType', claimKey);
            if (claimEntity) {
                navigateToEntity(claimEntity, claimKey);
            }
        }
    };

    // Color mapping based on change status
    const statusStyles: Record<ClaimChangeStatus, { 
        container: string; 
        icon: React.ReactNode;
        keyColor: string;
        valueColor: string;
    }> = {
        added: {
            container: "bg-emerald-950/40 border-l-2 border-l-emerald-500 hover:bg-emerald-900/40",
            icon: <Plus className="w-3 h-3 text-emerald-400 flex-shrink-0" />,
            keyColor: "text-emerald-300",
            valueColor: "text-emerald-200",
        },
        modified: {
            container: "bg-amber-950/40 border-l-2 border-l-amber-500 hover:bg-amber-900/40",
            icon: <RefreshCw className="w-3 h-3 text-amber-400 flex-shrink-0" />,
            keyColor: "text-amber-300",
            valueColor: "text-amber-200",
        },
        removed: {
            container: "bg-rose-950/40 border-l-2 border-l-rose-500 hover:bg-rose-900/40",
            icon: <Minus className="w-3 h-3 text-rose-400 flex-shrink-0" />,
            keyColor: "text-rose-300",
            valueColor: "text-rose-200",
        },
        unchanged: {
            container: "bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50",
            icon: null,
            keyColor: "text-slate-400",
            valueColor: "text-slate-200",
        },
    };

    const style = statusStyles[changeStatus];

    return (
        <button
            onClick={handleClick}
            title={`${claimKey}: ${value}`}
            className={cn(
                "flex items-start gap-2 text-xs p-2 rounded transition-colors w-full text-left group",
                style.container,
                className
            )}
        >
            {style.icon}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                    <span className={cn("font-mono font-medium", style.keyColor, compact && "truncate")}>
                        {claimKey}
                    </span>
                </div>
                {changeStatus === "modified" && previousValue !== undefined ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-rose-300/70 line-through truncate" title={previousValue}>
                            {previousValue || '""'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className={cn("font-mono truncate", style.valueColor)} title={value}>
                            {value || '""'}
                        </span>
                    </div>
                ) : (
                    <span className={cn("font-mono block", style.valueColor, compact ? "truncate" : "break-all")}>
                        {value || '""'}
                    </span>
                )}
            </div>
        </button>
    );
};

export type { Claim, DisplayControl } from "./types";
