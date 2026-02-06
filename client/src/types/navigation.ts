import type { Icon } from '@phosphor-icons/react';

/**
 * Registration data for nav items (used for mobile menu auto-population)
 */
export interface NavItemRegistration {
    href: string;
    label: string;
    disabled?: boolean;
    external?: boolean;
    icon?: Icon;
}

/**
 * Context value for navbar state management
 */
export interface NavbarContextValue {
    isMobileMenuOpen: boolean;
    setMobileMenuOpen: (open: boolean) => void;
    toggleMobileMenu: () => void;
    closeMobileMenu: () => void;
    navItems: NavItemRegistration[];
    registerNavItem: (item: NavItemRegistration) => void;
    unregisterNavItem: (href: string) => void;
}
