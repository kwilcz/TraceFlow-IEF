import React from "react";
import {Link} from "@tanstack/react-router";
import {Button} from "@/components/ui/button";
import {Tooltip, TooltipTrigger, TooltipContent, TooltipProvider} from "@/components/ui/tooltip";
import {MenuItem as MenuItemType} from "@/types/menu";
import {CollapseMenuButton} from "./collapseMenuButton";

interface MenuItemProps {
    item: MenuItemType;
    isOpen: boolean | undefined;
}

/**
 * MenuItem Component
 *
 * This component renders a single menu item. If the item has submenus,
 * it renders a CollapseMenuButton. Otherwise, it renders a regular button with a tooltip.
 */
export function MenuItem({item, isOpen}: MenuItemProps) {
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

    return (
        <TooltipProvider disableHoverableContent>
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    <Button variant={item.active ? "secondary" : "ghost"} className="menu-item" asChild>
                        <Link to={item.href}>
                            {item.icon &&
                                <span className={`menu-item-icon ${isOpen === false ? "" : "mr-4"}`}>
                                    <item.icon size='20' strokeWidth='1.3'/>
                                 </span>
                            }
                            <p className={`menu-item-label ${isOpen === false ? "menu-item-label-closed" : "menu-item-label-open"}`}>
                                {item.label}
                            </p>
                        </Link>
                    </Button>
                </TooltipTrigger>
                {isOpen === false && (
                    <TooltipContent side="right">
                        {item.label}
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
}