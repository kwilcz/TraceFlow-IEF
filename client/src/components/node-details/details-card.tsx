import React from "react";
import { cn } from "@/lib/utils";

interface DetailsCardProps {
    className?: string;
    children: React.ReactNode;
}

interface DetailsCardSectionProps {
    title?: React.ReactNode;
    className?: string;
    titleClassName?: string;
    children: React.ReactNode;
}

const DetailsCardRoot: React.FC<DetailsCardProps> = ({ className, children }) => (
    <div className={cn("space-y-4", className)}>{children}</div>
);

const Section: React.FC<DetailsCardSectionProps> = ({ title, className, titleClassName, children }) => (
    <div className={cn("space-y-3", className)}>
        {title ? (
            <h3 className={cn("text-sm font-semibold text-muted-foreground mb-4", titleClassName)}>{title}</h3>
        ) : null}
        {children}
    </div>
);

type DetailsCardComponent = React.FC<DetailsCardProps> & {
    Section: React.FC<DetailsCardSectionProps>;
};

const DetailsCard = Object.assign(DetailsCardRoot, { Section }) as DetailsCardComponent;

export { DetailsCard };
