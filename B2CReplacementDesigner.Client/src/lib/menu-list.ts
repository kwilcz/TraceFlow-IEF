import { MenuGroup } from "@/types/menu";
import { WorkflowIcon, SwatchBookIcon, SettingsIcon, FileSearchIcon } from "lucide-react";

export function getMenuList(pathname: string): MenuGroup[] {
    return [
        {
            groupLabel: "Main",
            menus: [
                {
                    label: "Policy Flow",
                    href: "/b2c/policy-template",
                    icon: WorkflowIcon,
                    active: pathname.includes("/b2c/policy-template"),
                    submenus: []
                },
                {
                    label: "Claims",
                    href: "/b2c/claims",
                    icon: SwatchBookIcon,
                    active: pathname.includes("/b2c/claims"),
                    submenus: []
                },
                {
                    label: "Analyze Logs",
                    href: "/b2c/analyze-logs",
                    icon: FileSearchIcon,
                    active: pathname.includes("/b2c/analyze-logs"),
                    submenus: []
                },
            ]
        },
        {
            groupLabel: "Settings",
            menus: [
                {
                    label: "Settings",
                    href: "/settings",
                    icon: SettingsIcon,
                    active: pathname.includes("/settings"),
                    submenus: []
                },
            ]
        }
    ];
}