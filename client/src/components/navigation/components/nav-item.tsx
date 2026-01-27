import React, { useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { NavigationMenu } from "@base-ui/react/navigation-menu";
import { cn } from "@/lib/utils";
import { useNavbarContext } from "../navbar.context";

interface NavItemProps {
    href: string;
    children: React.ReactNode;
    disabled?: boolean;
    external?: boolean;
    className?: string;
}

export function NavItem({ href, children, disabled, external, className }: NavItemProps) {
    const location = useLocation();
    const { registerNavItem, unregisterNavItem } = useNavbarContext();

    const isActive = location.pathname === href;

    useEffect(() => {
        const label = typeof children === "string" ? children : "";
        registerNavItem({ href, label, disabled, external });
        return () => unregisterNavItem(href);
    }, [href, children, disabled, external, registerNavItem, unregisterNavItem]);

    if (disabled) {
        return (
            <NavigationMenu.Item className={'m-0'}>
                <span data-disabled className={cn("top-navbar-nav-item", className)}>
                    {children}
                </span>
            </NavigationMenu.Item>
        );
    }

    if (external) {
        return (
            <NavigationMenu.Item className={'m-0'}>
                <NavigationMenu.Link
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    active={isActive}
                    className={cn("top-navbar-nav-item", className)}
                >
                    {children}
                </NavigationMenu.Link>
            </NavigationMenu.Item>
        );
    }

    return (
        <NavigationMenu.Item className={'m-0'}>
            <NavigationMenu.Link
                href={href}
                render={<Link to={href} />}
                active={isActive}
                className={cn("top-navbar-nav-item", className)}
            >
                {children}
            </NavigationMenu.Link>
        </NavigationMenu.Item>
    );
}
