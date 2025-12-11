import React from "react";
import Link from "next/link";
import {Button} from "@/components/ui/button";
import {Tooltip, TooltipTrigger, TooltipContent, TooltipProvider} from "@/components/ui/tooltip";
import {MenuItem as MenuItemType} from "@/types/menu";
import {CollapseMenuButton} from "./collapseMenuButton";

// Props for the MenuItem component
interface MenuItemProps {
    item: MenuItemType;
    isOpen: boolean | undefined;
}

/**
 * MenuItem Component
 *
 * This component renders a single menu item. If the item has submenus,
 * it renders a CollapseMenuButton. Otherwise, it renders a regular button with a tooltip.
 *
 * @param {MenuItemType} item - The menu item data to render
 * @param {boolean | undefined} isOpen - Determines if the sidebar is open or closed
 */
export function MenuItem({item, isOpen}: MenuItemProps) {
    // If the item has submenus, render as a CollapseMenuButton
    if (item.submenus && item.submenus.length > 0) {
        return (
            <CollapseMenuButton
                icon={item.icon}
                label={item.label}
                active={item.active}
                submenus={item.submenus}
                isOpen={isOpen}
            />
        );
    }

    // If the item doesn't have submenus, render a regular button with a tooltip
    return (
        <TooltipProvider disableHoverableContent>
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    <Button variant={item.active ? "secondary" : "ghost"} className="menu-item" asChild>
                        <Link href={item.href}>
                            {item.icon &&
                                <span className={`menu-item-icon ${isOpen === false ? "" : "mr-4"}`}>
                                    <item.icon size='20' strokeWidth='1.3'/>
                                 </span>
                            }
                            {/* Label */}
                            <p className={`menu-item-label ${isOpen === false ? "menu-item-label-closed" : "menu-item-label-open"}`}>
                                {item.label}
                            </p>
                        </Link>
                    </Button>
                </TooltipTrigger>
                {/* Tooltip for closed sidebar */}
                {isOpen === false && (
                    <TooltipContent side="right">
                        {item.label}
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
}