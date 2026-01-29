"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";
import {
    focusRing,
    transitionColors,
    popupAnimation,
} from "@/lib/styles";

function TooltipProvider({
    delay = 0,
    disableHoverableContent: _disableHoverableContent,
    ...props
}: TooltipPrimitive.Provider.Props & {
    disableHoverableContent?: boolean;
}) {
    return (
        <TooltipPrimitive.Provider
            data-slot="tooltip-provider"
            delay={delay}
            {...props}
        />
    );
}

function Tooltip({
    delayDuration,
    ...props
}: TooltipPrimitive.Root.Props & { delayDuration?: number }) {
    return (
        <TooltipProvider delay={delayDuration ?? 0}>
            <TooltipPrimitive.Root data-slot="tooltip" {...props} />
        </TooltipProvider>
    );
}

function TooltipTrigger({
    asChild,
    children,
    className,
    ...props
}: TooltipPrimitive.Trigger.Props & { asChild?: boolean }) {
    const render = asChild
        ? (React.Children.only(children) as React.ReactElement)
        : undefined;

    return (
        <TooltipPrimitive.Trigger
            data-slot="tooltip-trigger"
            className={cn(transitionColors, "cursor-pointer", focusRing, className)}
            render={render}
            {...props}
        >
            {asChild ? null : children}
        </TooltipPrimitive.Trigger>
    );
}

const tooltipPopupStyles = cn(
    // Base layout
    "origin-[var(--transform-origin)] rounded-xl bg-overlay px-2 py-1 text-xs shadow-overlay will-change-[opacity,transform]",
    // Animation
    popupAnimation
);

function TooltipContent({
    className,
    side = "top",
    sideOffset = 4,
    align = "center",
    alignOffset = 0,
    children,
    ...props
}: TooltipPrimitive.Popup.Props &
    Pick<
        TooltipPrimitive.Positioner.Props,
        "align" | "alignOffset" | "side" | "sideOffset"
    >) {
    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                side={side}
                sideOffset={sideOffset}
                className="isolate z-50"
            >
                <TooltipPrimitive.Popup
                    data-slot="tooltip-content"
                    className={cn(tooltipPopupStyles, "z-50 w-fit max-w-xs", className)}
                    {...props}
                >
                    {children}
                </TooltipPrimitive.Popup>
            </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
    );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
