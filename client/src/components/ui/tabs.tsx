"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { noHighlight, focusRing, dataDisabledState, transitionAll } from "@/lib/styles";

function Tabs({
    className,
    orientation = "horizontal",
    ...props
}: TabsPrimitive.Root.Props) {
    return (
        <TabsPrimitive.Root
            data-slot="tabs"
            orientation={orientation}
            className={cn(
                "flex gap-2",
                orientation === "horizontal" && "flex-col",
                orientation === "vertical" && "flex-row",
                className
            )}
            {...props}
        />
    );
}

type TabsVariant = "default" | "line";

const tabsListVariants = cva(
    "relative inline-flex p-1",
    {
        variants: {
            variant: {
                default: "bg-default rounded-[calc(var(--radius-2xl)+0.25rem)]",
                line: "bg-transparent p-0 rounded-none",
            },
            orientation: {
                horizontal: "flex-row min-w-fit",
                vertical: "flex-col gap-1",
            },
        },
        compoundVariants: [
            {
                variant: "line",
                orientation: "horizontal",
                className: "border-b border-border max-w-full overflow-x-auto overflow-y-clip scrollbar-none",
            },
            {
                variant: "line",
                orientation: "vertical",
                className: "border-l border-border",
            },
        ],
        defaultVariants: {
            variant: "default",
            orientation: "horizontal",
        },
    }
);

interface TabsListProps
    extends TabsPrimitive.List.Props,
        VariantProps<typeof tabsListVariants> {
    hideSeparator?: boolean;
}

function TabsList({
    className,
    variant = "default",
    hideSeparator = false,
    children,
    ...props
}: TabsListProps) {
    const orientation =
        (props as { orientation?: "horizontal" | "vertical" }).orientation ??
        "horizontal";

    return (
        <TabsPrimitive.List
            data-slot="tabs-list"
            data-variant={variant}
            data-hide-separator={hideSeparator ? "true" : undefined}
            className={cn(tabsListVariants({ variant, orientation }), className)}
            {...props}
        >
            <TabsIndicator variant={variant} />
            {children}
        </TabsPrimitive.List>
    );
}

const tabsTriggerBaseStyles = cn(
    "relative z-10 flex min-h-8 w-full items-center justify-center gap-1.5 px-4 py-1.5 rounded-3xl text-sm font-medium text-muted outline-none select-none cursor-pointer",
    noHighlight,
    transitionAll,
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "data-[selected=true]:text-segment-foreground aria-selected:text-segment-foreground",
    "hover:not-data-[selected=true]:not-aria-selected:opacity-70",
    focusRing,
    dataDisabledState
);

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
    return (
        <TabsPrimitive.Tab
            data-slot="tabs-trigger"
            className={cn(tabsTriggerBaseStyles, className)}
            {...props}
        />
    );
}

const tabsIndicatorBase = cn(
    "absolute inset-0 z-0",
    "transition-all duration-250 ease-out motion-reduce:transition-none",
    "[width:var(--active-tab-width)] [height:var(--active-tab-height)] [translate:var(--active-tab-left)_var(--active-tab-top)]"
);

const tabsIndicatorVariants = cva(
    tabsIndicatorBase,
    {
        variants: {
            variant: {
                default: "bg-segment shadow-surface rounded-3xl",
                line: "bg-primary shadow-none rounded-none",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

interface TabsIndicatorProps
    extends TabsPrimitive.Indicator.Props,
        VariantProps<typeof tabsIndicatorVariants> {}

function TabsIndicator({ className, variant, ...props }: TabsIndicatorProps) {
    return (
        <TabsPrimitive.Indicator
            data-slot="tabs-indicator"
            className={cn(tabsIndicatorVariants({ variant }), className)}
            {...props}
        />
    );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
    return (
        <TabsPrimitive.Panel
            data-slot="tabs-content"
            className={cn("w-full", "outline-none", className)}
            {...props}
        />
    );
}

export { Tabs, TabsList, TabsTrigger, TabsIndicator, TabsContent };
export type { TabsListProps, TabsVariant };
