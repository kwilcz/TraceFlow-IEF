"use client";

import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Compact copy button with tooltip feedback.
 */
const CopyButton: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }, [value]);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-accent"
                    onClick={handleCopy}
                >
                    {copied ? (
                        <Check className="w-3 h-3 text-green-500" />
                    ) : (
                        <Copy className="w-3 h-3 text-muted-foreground" />
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
                {copied ? "Copied!" : `Copy ${label ?? "value"}`}
            </TooltipContent>
        </Tooltip>
    );
};

interface DetailsPanelContextValue {
    variant: "step" | "technical-profile" | "transformation" | "hrd" | "displayControl";
}

const DetailsPanelContext = createContext<DetailsPanelContextValue | null>(null);

function useDetailsPanelCtx(): DetailsPanelContextValue {
    const ctx = useContext(DetailsPanelContext);
    if (!ctx) {
        throw new Error("DetailsPanel subcomponent must be used within <DetailsPanel>");
    }
    return ctx;
}

type PanelVariant = "step" | "technical-profile" | "transformation" | "hrd" | "displayControl";

const variantStyles: Record<PanelVariant, { headerBg: string; accentColor: string }> = {
    step: {
        headerBg: "bg-muted/30",
        accentColor: "text-foreground",
    },
    "technical-profile": {
        headerBg: "bg-violet-50 dark:bg-violet-900/20",
        accentColor: "text-violet-700 dark:text-violet-300",
    },
    transformation: {
        headerBg: "bg-cyan-50 dark:bg-cyan-900/20",
        accentColor: "text-cyan-700 dark:text-cyan-300",
    },
    hrd: {
        headerBg: "bg-amber-50 dark:bg-amber-900/20",
        accentColor: "text-amber-700 dark:text-amber-300",
    },
    displayControl: {
        headerBg: "bg-emerald-50 dark:bg-emerald-900/20",
        accentColor: "text-emerald-700 dark:text-emerald-300",
    },
};

interface DetailsPanelRootProps {
    children: React.ReactNode;
    variant?: PanelVariant;
    className?: string;
}

function Root({ children, variant = "step", className }: DetailsPanelRootProps) {
    const ctx: DetailsPanelContextValue = useMemo(() => ({ variant }), [variant]);

    return (
        <DetailsPanelContext.Provider value={ctx}>
            <div className={cn("flex flex-col h-full bg-background", className)}>
                {children}
            </div>
        </DetailsPanelContext.Provider>
    );
}
Root.displayName = "DetailsPanel";

interface HeaderProps {
    children: React.ReactNode;
    className?: string;
}

function Header({ children, className }: HeaderProps) {
    const { variant } = useDetailsPanelCtx();
    const styles = variantStyles[variant];

    return (
        <div className={cn("p-4 border-b", styles.headerBg, className)}>
            <div className="flex items-start justify-between gap-2">
                {children}
            </div>
        </div>
    );
}
Header.displayName = "DetailsPanel.Header";

interface HeaderContentProps {
    children: React.ReactNode;
    className?: string;
}

function HeaderContent({ children, className }: HeaderContentProps) {
    return (
        <div className={cn("flex-1 min-w-0", className)}>
            {children}
        </div>
    );
}
HeaderContent.displayName = "DetailsPanel.HeaderContent";

interface HeaderActionsProps {
    children: React.ReactNode;
    className?: string;
}

function HeaderActions({ children, className }: HeaderActionsProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            {children}
        </div>
    );
}
HeaderActions.displayName = "DetailsPanel.HeaderActions";

interface TitleRowProps {
    children: React.ReactNode;
    className?: string;
}

function TitleRow({ children, className }: TitleRowProps) {
    return (
        <div className={cn("flex items-center gap-2 flex-wrap", className)}>
            {children}
        </div>
    );
}
TitleRow.displayName = "DetailsPanel.TitleRow";

interface TitleProps {
    children: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
}

function Title({ children, icon, className }: TitleProps) {
    const { variant } = useDetailsPanelCtx();
    const styles = variantStyles[variant];

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {icon}
            <h2 className={cn("text-lg font-semibold", styles.accentColor)}>
                {children}
            </h2>
        </div>
    );
}
Title.displayName = "DetailsPanel.Title";

interface SubtitleProps {
    children: React.ReactNode;
    copyable?: boolean;
    copyValue?: string;
    copyLabel?: string;
    className?: string;
}

function Subtitle({ children, copyable, copyValue, copyLabel, className }: SubtitleProps) {
    return (
        <div className={cn("flex items-center gap-2 mt-1", className)}>
            <p className="text-sm text-foreground font-mono break-all">
                {children}
            </p>
            {copyable && copyValue && (
                <CopyButton value={copyValue} label={copyLabel ?? "value"} />
            )}
        </div>
    );
}
Subtitle.displayName = "DetailsPanel.Subtitle";

interface BadgeGroupProps {
    children: React.ReactNode;
    className?: string;
}

function BadgeGroup({ children, className }: BadgeGroupProps) {
    return (
        <div className={cn("flex flex-wrap gap-2 mt-2", className)}>
            {children}
        </div>
    );
}
BadgeGroup.displayName = "DetailsPanel.BadgeGroup";

interface ContentProps {
    children: React.ReactNode;
    className?: string;
}

function Content({ children, className }: ContentProps) {
    return (
        <ScrollArea className="flex-1">
            <div className={cn("p-4 space-y-6 max-w-full overflow-hidden", className)}>
                {children}
            </div>
        </ScrollArea>
    );
}
Content.displayName = "DetailsPanel.Content";

interface SectionProps {
    children: React.ReactNode;
    title?: string;
    icon?: React.ReactNode;
    className?: string;
}

function Section({ children, title, icon, className }: SectionProps) {
    return (
        <div className={cn("overflow-hidden", className)}>
            {title && (
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                    {icon}
                    {title}
                </h4>
            )}
            {children}
        </div>
    );
}
Section.displayName = "DetailsPanel.Section";

type SectionBoxVariant = "muted" | "orange" | "cyan" | "amber" | "blue" | "emerald" | "violet";

const sectionBoxStyles: Record<SectionBoxVariant, string> = {
    muted: "bg-muted",
    orange: "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800",
    cyan: "bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800",
    amber: "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800",
    blue: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800",
    violet: "bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800",
};

interface SectionBoxProps {
    children: React.ReactNode;
    variant?: SectionBoxVariant;
    className?: string;
}

function SectionBox({ children, variant = "muted", className }: SectionBoxProps) {
    return (
        <div className={cn("p-3 rounded-md space-y-2 overflow-hidden", sectionBoxStyles[variant], className)}>
            {children}
        </div>
    );
}
SectionBox.displayName = "DetailsPanel.SectionBox";

interface RowProps {
    children: React.ReactNode;
    className?: string;
}

function Row({ children, className }: RowProps) {
    return (
        <div className={cn("flex items-center justify-between gap-2", className)}>
            {children}
        </div>
    );
}
Row.displayName = "DetailsPanel.Row";

interface LabelProps {
    children: React.ReactNode;
    className?: string;
}

function Label({ children, className }: LabelProps) {
    return (
        <span className={cn("text-xs text-muted-foreground flex-shrink-0", className)}>
            {children}
        </span>
    );
}
Label.displayName = "DetailsPanel.Label";

interface ValueProps {
    children: React.ReactNode;
    mono?: boolean;
    truncate?: boolean;
    breakAll?: boolean;
    className?: string;
}

function Value({ children, mono, truncate, breakAll, className }: ValueProps) {
    return (
        <span
            className={cn(
                "text-sm min-w-0",
                mono && "font-mono",
                truncate && "truncate",
                breakAll && "break-all",
                className
            )}
        >
            {children}
        </span>
    );
}
Value.displayName = "DetailsPanel.Value";

interface ItemProps {
    children: React.ReactNode;
    className?: string;
    variant?: SectionBoxVariant;
}

function Item({ children, className, variant = "muted" }: ItemProps) {
    return (
        <div className={cn("p-2 rounded-md", sectionBoxStyles[variant], className)}>
            {children}
        </div>
    );
}
Item.displayName = "DetailsPanel.Item";

interface ItemListProps {
    children: React.ReactNode;
    className?: string;
    maxHeight?: string;
}

function ItemList({ children, className, maxHeight = "max-h-64" }: ItemListProps) {
    return (
        <div className={cn("space-y-1.5 overflow-y-auto", maxHeight, className)}>
            {children}
        </div>
    );
}
ItemList.displayName = "DetailsPanel.ItemList";

interface EmptyProps {
    children: React.ReactNode;
    className?: string;
}

function Empty({ children, className }: EmptyProps) {
    return (
        <p className={cn("text-xs text-muted-foreground italic", className)}>
            {children}
        </p>
    );
}
Empty.displayName = "DetailsPanel.Empty";

export const DetailsPanel = Object.assign(Root, {
    Header,
    HeaderContent,
    HeaderActions,
    TitleRow,
    Title,
    Subtitle,
    BadgeGroup,
    Content,
    Section,
    SectionBox,
    Row,
    Label,
    Value,
    Item,
    ItemList,
    Empty,
    Badge,
    CopyButton,
});

export type { PanelVariant, SectionBoxVariant };
