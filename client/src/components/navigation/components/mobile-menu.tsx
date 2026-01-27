import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";import { Button } from '@/components/ui/button';import { useNavbarContext } from "../navbar.context";
import { MobileMenuItem } from "./mobile-menu-item";

interface MobileMenuProps {
    children?: React.ReactNode;
    /** Actions to show next to the burger icon on mobile (e.g., ThemeToggle) */
    actions?: React.ReactNode;
    className?: string;
}

export function MobileMenu({ children, actions, className }: MobileMenuProps) {
    const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu, navItems } = useNavbarContext();
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                const trigger = document.querySelector(".top-navbar-mobile-trigger");
                if (trigger && trigger.contains(event.target as Node)) return;
                closeMobileMenu();
            }
        }

        if (isMobileMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isMobileMenuOpen, closeMobileMenu]);

    // Close on Escape key
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                closeMobileMenu();
            }
        }

        if (isMobileMenuOpen) {
            document.addEventListener("keydown", handleEscape);
            return () => document.removeEventListener("keydown", handleEscape);
        }
    }, [isMobileMenuOpen, closeMobileMenu]);

    return (
        <>
            {/* Mobile actions wrapper - contains actions and burger */}
            <div className="top-navbar-mobile-actions-wrapper">
                {actions && <>{actions}</>}
                {/* Hamburger trigger button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="top-navbar-mobile-trigger"
                    onClick={toggleMobileMenu}
                    aria-expanded={isMobileMenuOpen}
                    aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                    aria-controls="mobile-menu"
                >
                    <div className="hamburger" data-open={isMobileMenuOpen}>
                        <span className="hamburger-line" />
                        <span className="hamburger-line" />
                        <span className="hamburger-line" />
                    </div>
                </Button>
            </div>

            {/* Dropdown menu */}
            <div
                ref={menuRef}
                id="mobile-menu"
                className={cn("top-navbar-mobile-menu", className)}
                data-state={isMobileMenuOpen ? "open" : "closed"}
                aria-hidden={!isMobileMenuOpen}
            >
                <div className="top-navbar-mobile-menu-content">
                    {navItems.map((item) => (
                        <MobileMenuItem
                            key={item.href}
                            href={item.href}
                            disabled={item.disabled}
                            external={item.external}
                        >
                            {item.label}
                        </MobileMenuItem>
                    ))}

                    {/* Mobile-only items separator and content */}
                    {children && (
                        <>
                            <div className="top-navbar-mobile-separator" />
                            {children}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
