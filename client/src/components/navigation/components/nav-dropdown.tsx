import React from "react";
import { NavigationMenu } from "@base-ui/react/navigation-menu";
import { CaretDownIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface NavDropdownProps {
    label: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
}

/**
 * A dropdown navigation item that reveals content when triggered.
 * Uses base-ui NavigationMenu.Trigger and NavigationMenu.Content under the hood.
 *
 * @example
 * ```tsx
 * <TopNavbar.NavDropdown label="Products">
 *     <TopNavbar.NavItem href="/product-a">Product A</TopNavbar.NavItem>
 *     <TopNavbar.NavItem href="/product-b">Product B</TopNavbar.NavItem>
 * </TopNavbar.NavDropdown>
 * ```
 */
export function NavDropdown({ label, children, className, contentClassName }: NavDropdownProps) {
    return (
        <NavigationMenu.Item>
            <NavigationMenu.Trigger className={cn("top-navbar-dropdown-trigger", className)}>
                {label}
                <NavigationMenu.Icon className="top-navbar-dropdown-icon">
                    <CaretDownIcon weight="bold" />
                </NavigationMenu.Icon>
            </NavigationMenu.Trigger>
            <NavigationMenu.Content className={cn("top-navbar-dropdown-content", contentClassName)}>
                {children}
            </NavigationMenu.Content>
        </NavigationMenu.Item>
    );
}
