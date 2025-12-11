import React, { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { useSidebarNavigation } from "@/hooks/use-sidebar-navigation";
import { usePolicyStore } from "@/stores/policy-store";
import { cn } from "@/lib/utils";
import { getEntity } from "@/types/trust-framework-entities";

interface ClickableReferenceProps {
    value: string;
    type: "claim" | "technicalProfile" | "transformation" | "claimsExchange" | "displayControl";
    label?: string;
    color?: "blue" | "green" | "cyan" | "violet" | "amber" | "purple" | "slate";
    required?: boolean;
    title?: string;
    onClick?: () => void;
    className?: string;
}

const colorClasses: Record<NonNullable<ClickableReferenceProps["color"]>, string> = {
    blue: "bg-blue-800/40 hover:bg-blue-700/60 text-blue-200 group-hover:text-blue-100",
    green: "bg-green-800/40 hover:bg-green-700/60 text-green-200 group-hover:text-green-100",
    cyan: "bg-cyan-800/40 hover:bg-cyan-700/60 text-cyan-200 group-hover:text-cyan-100",
    violet: "bg-violet-800/40 hover:bg-violet-700/60 text-violet-200 group-hover:text-violet-100",
    amber: "bg-amber-800/40 hover:bg-amber-700/60 text-amber-200 group-hover:text-amber-100",
    purple: "bg-purple-800/40 hover:bg-purple-700/60 text-purple-200 group-hover:text-purple-100",
    slate: "bg-slate-800/40 hover:bg-slate-700/60 text-slate-200 group-hover:text-slate-100",
};

const chevronColorClasses: Record<NonNullable<ClickableReferenceProps["color"]>, string> = {
    blue: "text-blue-500 group-hover:text-blue-300",
    green: "text-green-500 group-hover:text-green-300",
    cyan: "text-cyan-500 group-hover:text-cyan-300",
    violet: "text-violet-500 group-hover:text-violet-300",
    amber: "text-amber-500 group-hover:text-amber-300",
    purple: "text-purple-500 group-hover:text-purple-300",
    slate: "text-slate-500 group-hover:text-slate-300",
};

const ClickableReference: React.FC<ClickableReferenceProps> = ({
    value,
    type,
    label,
    color = "slate",
    required = false,
    title,
    onClick,
    className,
}) => {
    const { navigateToEntity } = useSidebarNavigation();
    const entities = usePolicyStore((state) => state.entities);

    const handleClick = () => {
        if (onClick) {
            onClick();
            return;
        }

        if (!entities) {
            return;
        }

        switch (type) {
            case "claim": {
                const entity = getEntity(entities, 'ClaimType', value);
                if (entity) {
                    navigateToEntity(entity, value);
                }
                break;
            }
            case "technicalProfile": {
                const entity = getEntity(entities, 'TechnicalProfile', value);
                if (entity) {
                    navigateToEntity(entity, value);
                }
                break;
            }
            case "transformation": {
                const entity = getEntity(entities, 'ClaimsTransformation', value);
                if (entity) {
                    navigateToEntity(entity, value);
                }
                break;
            }
            case "displayControl": {
                const entity = getEntity(entities, 'DisplayControl', value);
                if (entity) {
                    navigateToEntity(entity, value);
                }
                break;
            }
            case "claimsExchange": {
                const entity = getEntity(entities, 'TechnicalProfile', value);
                if (entity) {
                    navigateToEntity(entity, value);
                }
                break;
            }
            default:
                console.log(`Navigate to ${type}:`, value);
        }
    };

    return (
        <button
            onClick={handleClick}
            title={title}
            className={cn(`flex items-center text-xs font-mono justify-between w-full text-left px-2 py-1 rounded transition-colors group min-w-0 ${colorClasses[color]}`, className)}
        >
            <span className="truncate min-w-0 pr-2">
                {required && <span className="text-red-500">*</span>}
                {label && <span className="text-foreground">{label}: </span>}
                {value}
            </span>
            <ChevronRight className={`w-3 h-3 transition-colors flex-shrink-0 ${chevronColorClasses[color]}`} />
        </button>
    );
};

const InfoItem: React.FC<{ label: string; value: string | number | ReactNode }> = ({ label, value }) => (
    <div className="flex items-start justify-between gap-2 min-w-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="flex-1 text-sm text-foreground font-mono break-all text-right">{value}</span>
    </div>
);

const RawDataSection: React.FC<{ data: unknown }> = ({ data }) => (
    <div className="min-w-0">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Raw Data</h3>
        <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden">
            <div className="max-h-96 overflow-auto">
                <pre className="p-3 text-xs text-slate-300 font-mono whitespace-pre min-w-max">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        </div>
    </div>
);

const Separator: React.FC = () => <div className="border-t border-border" />;

export { ClickableReference, InfoItem, RawDataSection, Separator };
