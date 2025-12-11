"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMenuList } from "@/hooks/use-menu-list";
import { MenuGroup } from "./menuGroup";
import { MenuGroup as MenuGroupType } from "@/types/menu";

interface MenuProps {
    isOpen: boolean | undefined;
}

/**
 * Menu Component
 *
 * This is the main component for rendering the sidebar menu.
 * It uses the ScrollArea component to allow scrolling if the menu is too long.
 *
 * @param {boolean | undefined} isOpen - Determines if the sidebar is open or closed
 */
export function Menu({ isOpen }: MenuProps) {
    // Custom hook to get the menu list based on the current pathname
    const menuList = useMenuList();

    return (
        <ScrollArea className="menu-scroll-area">
            <nav className="menu-nav">
                <ul className="menu-list">
                    {menuList.map((group: MenuGroupType, index: number) => (
                        <MenuGroup key={index} group={group} isOpen={isOpen} />
                    ))}
                </ul>
            </nav>
        </ScrollArea>
    );
}