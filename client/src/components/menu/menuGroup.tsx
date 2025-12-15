import React from "react";
import {MenuGroup as MenuGroupType} from "@/types/menu";
import {GroupLabel} from "./groupLabel";
import {MenuItem} from "./menuItem";

interface MenuGroupProps {
    group: MenuGroupType;
    isOpen: boolean | undefined;
}

/**
 * MenuGroup Component
 *
 * This component renders a group of menu items, including the group label.
 *
 * @param {MenuGroupType} group - The menu group data to render
 * @param {boolean | undefined} isOpen - Determines if the sidebar is open or closed
 */
export function MenuGroup({group, isOpen}: MenuGroupProps) {
    return (
        <div className={`menu-group ${group.groupLabel ? "menu-group-with-label" : ""}`}>
            <GroupLabel label={group.groupLabel} isOpen={isOpen}/>
            {/* Render each menu item in the group */}
            {group.menus.map((item, index) => (
                <div className="w-full" key={index}>
                    <MenuItem key={index} item={item} isOpen={isOpen}/>
                </div>
            ))}
        </div>
    );
}

