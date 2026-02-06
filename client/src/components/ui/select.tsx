"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import * as React from "react";
import { CaretDownIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import {
    noHighlight,
    dataDisabledState,
    disabledState,
    ariaDisabledState,
    transitionColors,
    focusRingCombined,
    popupAnimation,
    overlayBase,
    fieldBase,
    fieldHover,
    fieldFocus,
    invalidRing,
    menuItemBase,
    menuItemStates,
} from "@/lib/styles";

function Select<Value, Multiple extends boolean | undefined = false>(
    props: SelectPrimitive.Root.Props<Value, Multiple>
) {
    return <SelectPrimitive.Root data-slot="select" {...props} />;
}

const selectTriggerStyles = cn(
    fieldBase,
    "relative isolate inline-flex min-h-9 items-center justify-between gap-2 shadow-field select-none",
    noHighlight,
    transitionColors,
    fieldHover,
    focusRingCombined, 
    "data-[popup-open=true]:ring-2 data-[popup-open=true]:ring-ring data-[popup-open=true]:ring-offset-2 data-[popup-open=true]:ring-offset-background data-[popup-open=true]:bg-field-focus data-[popup-open=true]:border-field-border-focus",
    invalidRing,
    disabledState, dataDisabledState, ariaDisabledState
);

function SelectTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
    return (
        <SelectPrimitive.Trigger
            data-slot="select-trigger"
            className={cn(selectTriggerStyles, className)}
            {...props}
        >
            {children}
        </SelectPrimitive.Trigger>
    );
}

const selectValueStyles = cn("flex-1 text-left text-base wrap-break-word text-current sm:text-sm data-[placeholder=true]:text-field-placeholder");

function SelectValue({
    placeholder,
    className,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
    return (
        <SelectPrimitive.Value
            data-slot="select-value"
            placeholder={placeholder}
            className={cn(selectValueStyles, className)}
            {...props}
        />
    );
}

const selectIconStyles = cn(
    "flex shrink-0 items-center justify-center text-field-placeholder", 
    "transition duration-150 will-change-transform",
    "data-popup-open:rotate-180");

function SelectIcon({
    className,
    children,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Icon>) {
    return (
        <SelectPrimitive.Icon
            data-slot="select-icon"
            className={cn(selectIconStyles, className)}
            {...props}
        >
            {children ?? <CaretDownIcon className="size-4" />}
        </SelectPrimitive.Icon>
    );
}

function SelectPortal(props: React.ComponentProps<typeof SelectPrimitive.Portal>) {
    return <SelectPrimitive.Portal data-slot="select-portal" {...props} />;
}

const selectPopoverStyles = cn(
    "min-w-(--anchor-width) scroll-py-1 overflow-y-auto overscroll-contain",
    overlayBase,
    "focus-visible:outline-none data-[focus-visible=true]:outline-none",
    popupAnimation
);

interface SelectContentProps extends React.ComponentProps<typeof SelectPrimitive.Popup> {
    alignItemWithTrigger?: boolean;
    side?: "top" | "bottom";
    sideOffset?: number;
}

function SelectContent({
    alignItemWithTrigger = false,
    side = "bottom",
    sideOffset = 4,
    className,
    children,
    ...props
}: SelectContentProps) {
    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Positioner
                className="isolate z-50 outline-none"
                alignItemWithTrigger={alignItemWithTrigger}
                side={side}
                sideOffset={sideOffset}
            >
                <SelectPrimitive.Popup
                    data-slot="select-content"
                    className={cn(selectPopoverStyles, className)}
                    {...props}
                >
                    {children}
                </SelectPrimitive.Popup>
            </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
    );
}

const selectItemStyles = cn(
    menuItemBase,
    "gap-2 rounded-xl",
    noHighlight, "select-none",
    focusRingCombined,
    menuItemStates
);

function SelectItem({
    className,
    children,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
    return (
        <SelectPrimitive.Item
            data-slot="select-item"
            className={cn(selectItemStyles, className)}
            {...props}
        >
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    );
}

function SelectGroup(props: React.ComponentProps<typeof SelectPrimitive.Group>) {
    return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

const selectGroupLabelStyles = "px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider";

function SelectGroupLabel({
    className,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.GroupLabel>) {
    return (
        <SelectPrimitive.GroupLabel
            data-slot="select-group-label"
            className={cn(selectGroupLabelStyles, className)}
            {...props}
        />
    );
}

function SelectSeparator({
    className,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
    return (
        <SelectPrimitive.Separator
            data-slot="select-separator"
            className={cn("my-1 h-px bg-border", className)}
            {...props}
        />
    );
}

export {
    Select,
    SelectContent,
    SelectGroup,
    SelectGroupLabel,
    SelectIcon,
    SelectItem,
    SelectPortal,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
};
