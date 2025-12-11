import type { Icon } from "@phosphor-icons/react";

export interface MenuItem {
    label: string;
    href: string;
    icon?: Icon;
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