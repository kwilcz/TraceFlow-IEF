"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import * as React from "react";

import { cn } from "@/lib/utils";
import {
    noHighlight,
    dataDisabledState,
    disabledState,
    ariaDisabledState,
    transitionSmooth,
    focusRingCombined,
    pressedScale,
    popupAnimation,
    overlayBase,
    menuItemBase,
    menuItemStates,
} from "@/lib/styles";
import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react";

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
    return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
    return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

const dropdownTriggerStyles = cn(
    "outline-none transform-gpu cursor-pointer",
    transitionSmooth,
    focusRingCombined,
    disabledState, ariaDisabledState,
    "data-[pending=true]:animate-pulse",
    pressedScale
);

function DropdownMenuTrigger({
    asChild,
    className,
    children,
    ...props
}: MenuPrimitive.Trigger.Props & { asChild?: boolean }) {
    const render = asChild
        ? (React.Children.only(children) as React.ReactElement)
        : undefined;

    return (
        <MenuPrimitive.Trigger
            data-slot="dropdown-menu-trigger"
            render={render}
            className={cn(dropdownTriggerStyles, className)}
            {...props}
        >
            {asChild ? null : children}
        </MenuPrimitive.Trigger>
    );
}

const dropdownPopoverStyles = cn(
    // Base layout
    "max-w-[48svw] scroll-py-1 overflow-y-auto overscroll-contain md:min-w-55",
    overlayBase,
    "focus-visible:outline-none data-[focus-visible=true]:outline-none",
    // Animation
    popupAnimation
);

function DropdownMenuContent({
    align = "start",
    alignOffset = 0,
    side = "bottom",
    sideOffset = 4,
    className,
    ...props
}: MenuPrimitive.Popup.Props &
    Pick<
        MenuPrimitive.Positioner.Props,
        "align" | "alignOffset" | "side" | "sideOffset"
    >) {
    return (
        <MenuPrimitive.Portal>
            <MenuPrimitive.Positioner
                className="isolate z-50 outline-none"
                align={align}
                alignOffset={alignOffset}
                side={side}
                sideOffset={sideOffset}
            >
                <MenuPrimitive.Popup
                    data-slot="dropdown-menu-content"
                    className={cn(dropdownPopoverStyles, className)}
                    {...props}
                />
            </MenuPrimitive.Positioner>
        </MenuPrimitive.Portal>
    );
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
    return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

const menuLabelStyles = "px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider";

function DropdownMenuGroupLabel({
    className,
    inset,
    ...props
}: MenuPrimitive.GroupLabel.Props & {
    inset?: boolean;
}) {
    return (
        <MenuPrimitive.GroupLabel
            data-slot="dropdown-menu-group-label"
            data-inset={inset}
            className={cn(menuLabelStyles, inset && "pl-8", className)}
            {...props}
        />
    );
}

function DropdownMenuLabel({
    className,
    inset,
    ...props
}: React.ComponentProps<"div"> & {
    inset?: boolean;
}) {
    return (
        <div
            data-slot="dropdown-menu-label"
            data-inset={inset}
            className={cn(menuLabelStyles, inset && "pl-8", className)}
            {...props}
        />
    );
}

const menuItemStyles = cn(
    menuItemBase,
    "rounded-2xl will-change-transform",
    noHighlight,
    "transition-[transform,box-shadow] duration-250 ease-out motion-reduce:transition-none",
    focusRingCombined,
    "active:scale-[0.98] data-[pressed=true]:scale-[0.98]",
    menuItemStates
);

const menuItemDestructiveStyles = cn("text-danger hover:bg-danger/10 data-[hovered=true]:bg-danger/10");

function DropdownMenuItem({
    className,
    inset,
    variant = "default",
    asChild,
    children,
    ...props
}: MenuPrimitive.Item.Props & {
    inset?: boolean;
    variant?: "default" | "destructive";
    asChild?: boolean;
}) {
    const render = asChild
        ? (React.Children.only(children) as React.ReactElement)
        : undefined;

    return (
        <MenuPrimitive.Item
            data-slot="dropdown-menu-item"
            data-inset={inset}
            data-variant={variant}
            render={render}
            className={cn(
                menuItemStyles,
                variant === "destructive" && menuItemDestructiveStyles,
                inset && "pl-8",
                className
            )}
            {...props}
        >
            {asChild ? null : children}
        </MenuPrimitive.Item>
    );
}

function DropdownMenuArrow(_props: React.ComponentProps<"div">) {
    return null;
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
    return (
        <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
    );
}

const menuItemIndicatorStyles = "absolute top-1/2 left-2 flex size-4 shrink-0 -translate-y-1/2 items-center justify-center text-muted transition duration-250 motion-reduce:transition-none";

function DropdownMenuSubTrigger({
    className,
    inset,
    children,
    ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
    inset?: boolean;
}) {
    return (
        <MenuPrimitive.SubmenuTrigger
            data-slot="dropdown-menu-sub-trigger"
            data-inset={inset}
            data-has-submenu="true"
            className={cn(menuItemStyles, inset && "pl-8", className)}
            {...props}
        >
            {children}
            <span className="ml-auto">
                <CaretRightIcon />
            </span>
        </MenuPrimitive.SubmenuTrigger>
    );
}

function DropdownMenuSubContent({
    align = "start",
    alignOffset = -3,
    side = "right",
    sideOffset = 0,
    className,
    ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
    return (
        <DropdownMenuContent
            data-slot="dropdown-menu-sub-content"
            className={cn(dropdownPopoverStyles, className)}
            align={align}
            alignOffset={alignOffset}
            side={side}
            sideOffset={sideOffset}
            {...props}
        />
    );
}

function DropdownMenuCheckboxItem({
    className,
    children,
    checked,
    ...props
}: MenuPrimitive.CheckboxItem.Props) {
    return (
        <MenuPrimitive.CheckboxItem
            data-slot="dropdown-menu-checkbox-item"
            className={cn(menuItemStyles, "pr-8", className)}
            checked={checked}
            {...props}
        >
            <span
                className={cn(menuItemIndicatorStyles, "right-2 left-auto")}
                data-slot="dropdown-menu-checkbox-item-indicator"
            >
                <MenuPrimitive.CheckboxItemIndicator>
                    <CheckIcon className="size-2.5" />
                </MenuPrimitive.CheckboxItemIndicator>
            </span>
            {children}
        </MenuPrimitive.CheckboxItem>
    );
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
    return (
        <MenuPrimitive.RadioGroup
            data-slot="dropdown-menu-radio-group"
            {...props}
        />
    );
}

function DropdownMenuRadioItem({
    className,
    children,
    ...props
}: MenuPrimitive.RadioItem.Props) {
    return (
        <MenuPrimitive.RadioItem
            data-slot="dropdown-menu-radio-item"
            className={cn(menuItemStyles, "pr-8", className)}
            {...props}
        >
            <span
                className={cn(menuItemIndicatorStyles, "right-2 left-auto")}
                data-slot="dropdown-menu-radio-item-indicator"
            >
                <MenuPrimitive.RadioItemIndicator>
                    <span className="size-2 rounded-full bg-current" />
                </MenuPrimitive.RadioItemIndicator>
            </span>
            {children}
        </MenuPrimitive.RadioItem>
    );
}

function DropdownMenuSeparator({
    className,
    ...props
}: MenuPrimitive.Separator.Props) {
    return (
        <MenuPrimitive.Separator
            data-slot="dropdown-menu-separator"
            className={cn("my-1 h-px bg-border", className)}
            {...props}
        />
    );
}

function DropdownMenuShortcut({
    className,
    ...props
}: React.ComponentProps<"span">) {
    return (
        <span
            data-slot="dropdown-menu-shortcut"
            className={cn("ml-auto text-xs tracking-widest text-muted", className)}
            {...props}
        />
    );
}

export {
    DropdownMenu,
    DropdownMenuArrow,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuGroupLabel,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
};

