import {LucideIcon} from "lucide-react";

export interface MenuItem {
    label: string;
    href: string;
    icon?: LucideIcon;
    active: boolean;
    submenus: MenuItem[];
}

export interface MenuGroup {
    groupLabel: string;
    menus: MenuItem[];
}

export interface Submenu {
    label: string;
    href: string;
    active: boolean;
}