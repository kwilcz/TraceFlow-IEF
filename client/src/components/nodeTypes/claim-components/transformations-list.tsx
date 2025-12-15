import React from "react";
import { ChartBar as BarChart3 } from "@phosphor-icons/react";
import { ClickableReference } from "../../node-details";
import { useSidebarNavigation } from "@/hooks/use-sidebar-navigation";
import { usePolicyStore } from "@/stores/policy-store";
import { MAX_VISIBLE_CLAIMS } from "./types";
import { cn } from "@/lib/utils";
import { ReferenceList } from "./reference-list";
import { getEntity } from "@/types/trust-framework-entities";

type TransformColor = "violet" | "amber";

interface TransformationsListProps {
    transformations: (string | { id: string })[];
    title: string;
    color: TransformColor;
    className?: string;
    titleClassName?: string;
    listClassName?: string;
    toggleClassName?: string;
    maxVisible?: number;
}

const COLOR_CLASSES: Record<TransformColor, { container: string; title: string; toggle: string }> = {
    violet: {
        container: "bg-violet-900/20",
        title: "text-violet-300",
        toggle: "text-violet-400 bg-violet-800/40",
    },
    amber: {
        container: "bg-amber-900/20",
        title: "text-amber-300",
        toggle: "text-amber-400 bg-amber-800/40",
    },
};

export const TransformationsList: React.FC<TransformationsListProps> = ({
    transformations,
    title,
    color,
    className,
    titleClassName,
    listClassName,
    toggleClassName,
    maxVisible = MAX_VISIBLE_CLAIMS,
}) => {
    const { navigateToEntity } = useSidebarNavigation();
    const entities = usePolicyStore((state) => state.entities);

    if (transformations.length === 0) return null;

    const handleTransformationClick = (transformationId: string) => {
        const entity = entities ? getEntity(entities, 'ClaimsTransformation', transformationId) : undefined;
        if (entity) {
            navigateToEntity(entity, transformationId);
        }
    };

    const colorClasses = COLOR_CLASSES[color];

    return (
        <div className={cn(colorClasses.container, "rounded p-2", className)}>
            <div className={cn("font-semibold mb-1 flex items-center gap-1", colorClasses.title, titleClassName)}>
                <BarChart3 className="w-3 h-3" />
                {title} ({transformations.length})
            </div>
            <ReferenceList items={transformations} maxVisible={maxVisible} className={cn(listClassName)}>
                {(visibleTransformations) => (
                    <>
                        {visibleTransformations.map((transform, idx) => {
                            const transformId = typeof transform === "string" ? transform : transform.id;
                            return (
                                <ClickableReference
                                    key={transformId ?? idx}
                                    value={transformId}
                                    type="transformation"
                                    color={color}
                                    onClick={() => handleTransformationClick(transformId)}
                                />
                            );
                        })}
                        <ReferenceList.Toggle
                            className={cn(colorClasses.toggle, toggleClassName)}
                            titleCollapsed={`Show all ${transformations.length} transformations`}
                            titleExpanded="Show fewer transformations"
                        />
                    </>
                )}
            </ReferenceList>
        </div>
    );
};
