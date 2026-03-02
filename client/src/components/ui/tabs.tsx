"use client";

import { createContext, useContext } from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { noHighlight, focusRing, dataDisabledState, transitionAll } from "@/lib/styles";


// ── Variant context — flows from TabsList to TabsTrigger ────────────────
const TabsVariantContext = createContext<TabsVariant>("default");

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

type TabsVariant = "default" | "flat" | "line";

const tabsListVariants = cva(
    "relative inline-flex p-1",
    {
        variants: {
            variant: {
                default: "bg-default rounded-[calc(var(--radius-2xl)+0.25rem)]",
                flat: "bg-transparent p-0 rounded-none",
                line: "bg-transparent p-0 rounded-none",
            },
            orientation: {
                horizontal: "flex-row min-w-fit",
                vertical: "flex-col gap-1",
            },
        },
        compoundVariants: [
            {
                variant: "flat",
                orientation: "horizontal",
                className: "border-b border-border max-w-full overflow-x-auto overflow-y-clip scrollbar-none",
            },
            {
                variant: "flat",
                orientation: "vertical",
                className: "border-l border-border",
            },
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
        <TabsVariantContext.Provider value={variant ?? "default"}>
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
        </TabsVariantContext.Provider>
    );
}

const tabsTriggerBase = cn(
    "relative z-10 flex w-full items-center justify-center gap-1.5 px-4 py-1.5 text-sm outline-none select-none cursor-pointer",
    noHighlight,
    transitionAll,
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    focusRing,
    dataDisabledState,
);

const tabsTriggerVariants = cva(
    tabsTriggerBase,
    {
        variants: {
            variant: {
                default: cn(
                    "rounded-3xl font-medium text-muted",
                    "data-[selected=true]:text-segment-foreground aria-selected:text-segment-foreground",
                    "hover:not-data-[selected=true]:not-aria-selected:opacity-70",
                ),
                flat: cn(
                    "rounded-3xl font-medium text-muted",
                    "data-[selected=true]:text-segment-foreground aria-selected:text-segment-foreground",
                    "hover:not-data-[selected=true]:not-aria-selected:opacity-70",
                ),
                line: cn(
                    "rounded-none font-normal text-muted-foreground",
                    "data-[selected=true]:text-foreground data-[selected=true]:font-medium",
                    "aria-selected:text-foreground aria-selected:font-medium",
                    "hover:not-data-[selected=true]:not-aria-selected:text-foreground hover:not-data-[selected=true]:not-aria-selected:opacity-100",
                ),
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
    const variant = useContext(TabsVariantContext);
    return (
        <TabsPrimitive.Tab
            data-slot="tabs-trigger"
            className={cn(tabsTriggerVariants({ variant }), className)}
            {...props}
        />
    );
}

const tabsIndicatorBase = cn(
    "absolute inset-0 z-0",
    "transition-all duration-250 ease-out motion-reduce:transition-none",
    "w-(--active-tab-width) h-(--active-tab-height) [translate:var(--active-tab-left)_var(--active-tab-top)]"
);

const tabsIndicatorVariants = cva(
    tabsIndicatorBase,
    {
        variants: {
            variant: {
                default: "bg-segment shadow-surface rounded-3xl",
                flat: "bg-surface shadow-surface",
                line: "bg-primary shadow-none rounded-full h-0.5 [translate:var(--active-tab-left)_calc(var(--active-tab-top)+var(--active-tab-height)-2px)]",
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
