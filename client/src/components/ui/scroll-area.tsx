"use client";

import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

import { cn } from "@/lib/utils";
import { transitionColors } from "@/lib/styles";

const scrollAreaRootStyles = "relative overflow-hidden";
const scrollAreaViewportStyles = "rounded-[inherit]";
const scrollAreaContentStyles = "";
const scrollBarBase = cn("flex touch-none select-none", transitionColors);
const scrollBarVerticalStyles = "h-full w-2.5 border-l border-l-transparent p-px";
const scrollBarHorizontalStyles = "h-2.5 flex-col border-t border-t-transparent p-px";
const scrollThumbStyles = "relative flex-1 rounded-full bg-border";

function ScrollAreaRoot({ className, ...props }: ScrollAreaPrimitive.Root.Props) {
    return (
        <ScrollAreaPrimitive.Root
            data-slot="scroll-area-root"
            className={cn(scrollAreaRootStyles, className)}
            {...props}
        />
    );
}

function ScrollAreaViewport({
    className,
    ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Viewport>) {
    return (
        <ScrollAreaPrimitive.Viewport
            data-slot="scroll-area-viewport"
            className={cn(scrollAreaViewportStyles, className)}
            {...props}
        />
    );
}

function ScrollAreaContent({
    className,
    ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Content>) {
    return (
        <ScrollAreaPrimitive.Content
            data-slot="scroll-area-content"
            className={cn(scrollAreaContentStyles, className)}
            {...props}
        />
    );
}

function ScrollAreaThumb({
    className,
    ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Thumb>) {
    return (
        <ScrollAreaPrimitive.Thumb
            data-slot="scroll-area-thumb"
            className={cn(scrollThumbStyles, className)}
            {...props}
        />
    );
}

function ScrollAreaScrollbar({
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
                className,
            )}
            {...props}
        />
    );
}

function ScrollAreaCorner({
    className,
    ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Corner>) {
    return <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" className={className} {...props} />;
}

function ScrollBar({ className, orientation = "vertical", ...props }: ScrollAreaPrimitive.Scrollbar.Props) {
    return (
        <ScrollAreaScrollbar className={className} orientation={orientation} {...props}>
            <ScrollAreaThumb />
        </ScrollAreaScrollbar>
    );
}

function ScrollArea({ className, children, ...props }: ScrollAreaPrimitive.Root.Props) {
    return (
        <ScrollAreaRoot className={className} {...props}>
            <ScrollAreaViewport>
                <ScrollAreaContent>{children}</ScrollAreaContent>
            </ScrollAreaViewport>
            <ScrollBar />
            <ScrollAreaCorner />
        </ScrollAreaRoot>
    );
}

export {
    ScrollArea,
    ScrollAreaRoot,
    ScrollAreaViewport,
    ScrollAreaContent,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaCorner,
    ScrollBar,
    ScrollAreaRoot as Root,
    ScrollAreaViewport as Viewport,
    ScrollAreaContent as Content,
    ScrollAreaScrollbar as Scrollbar,
    ScrollAreaThumb as Thumb,
    ScrollAreaCorner as Corner,
};