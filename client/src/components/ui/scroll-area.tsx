"use client";

import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

import { cn } from "@/lib/utils";
import { transitionColors } from "@/lib/styles";

const scrollAreaStyles = "relative overflow-hidden";
const scrollAreaViewportStyles = "h-full w-full rounded-[inherit]";

function ScrollArea({
    className,
    children,
    ...props
}: ScrollAreaPrimitive.Root.Props) {
    return (
        <ScrollAreaPrimitive.Root
            data-slot="scroll-area"
            className={cn(scrollAreaStyles, className)}
            {...props}
        >
            <ScrollAreaPrimitive.Viewport
                data-slot="scroll-area-viewport"
                className={scrollAreaViewportStyles}
            >
                {children}
            </ScrollAreaPrimitive.Viewport>
            <ScrollBar />
            <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
    );
}

const scrollBarBase = cn("flex touch-none select-none", transitionColors);
const scrollBarVerticalStyles = "h-full w-2.5 border-l border-l-transparent p-px";
const scrollBarHorizontalStyles = "h-2.5 flex-col border-t border-t-transparent p-px";
const scrollThumbStyles = "relative flex-1 rounded-full bg-border";

function ScrollBar({
    className,
    orientation = "vertical",
    ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
    return (
        <ScrollAreaPrimitive.Scrollbar
            data-slot="scroll-area-scrollbar"
            data-orientation={orientation}
            orientation={orientation}
            className={cn(
                scrollBarBase,
                orientation === "vertical" ? scrollBarVerticalStyles : scrollBarHorizontalStyles,
                className
            )}
            {...props}
        >
            <ScrollAreaPrimitive.Thumb
                data-slot="scroll-area-thumb"
                className={scrollThumbStyles}
            />
        </ScrollAreaPrimitive.Scrollbar>
    );
}

export { ScrollArea, ScrollBar };
