import React, { useState, useCallback, useMemo } from 'react';
import { useLocation } from '@tanstack/react-router';
import { NavigationMenu } from '@base-ui/react/navigation-menu';
import { cn } from '@/lib/utils';
import { NavbarContext } from './navbar.context';
import { Logo } from './components/logo';
import { Nav } from './components/nav';
import { NavItem } from './components/nav-item';
import { NavDropdown } from './components/nav-dropdown';
import { Actions } from './components/actions';
import { MobileMenu } from './components/mobile-menu';
import { MobileMenuItem } from './components/mobile-menu-item';
import type { NavItemRegistration } from '@/types/navigation';

interface TopNavbarProps {
    children: React.ReactNode;
    className?: string;
}

function TopNavbarRoot({ children, className }: TopNavbarProps) {
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [navItems, setNavItems] = useState<NavItemRegistration[]>([]);
    const location = useLocation();

    const toggleMobileMenu = useCallback(() => {
        setMobileMenuOpen(prev => !prev);
    }, []);

    const closeMobileMenu = useCallback(() => {
        setMobileMenuOpen(false);
    }, []);

    const registerNavItem = useCallback((item: NavItemRegistration) => {
        setNavItems(prev => {
            const exists = prev.some(i => i.href === item.href);
            if (exists) return prev;
            return [...prev, item];
        });
    }, []);

    const unregisterNavItem = useCallback((href: string) => {
        setNavItems(prev => prev.filter(i => i.href !== href));
    }, []);

    // Close mobile menu on route change
    React.useEffect(() => {
        closeMobileMenu();
    }, [location.pathname, closeMobileMenu]);

    const contextValue = useMemo(() => ({
        isMobileMenuOpen,
        setMobileMenuOpen,
        toggleMobileMenu,
        closeMobileMenu,
        navItems,
        registerNavItem,
        unregisterNavItem,
    }), [isMobileMenuOpen, toggleMobileMenu, closeMobileMenu, navItems, registerNavItem, unregisterNavItem]);

    return (
        <NavbarContext.Provider value={contextValue}>
            <header className={cn('top-navbar', className)}>
                <NavigationMenu.Root className="top-navbar-inner">
                    {children}
                    
                    {/* Portal for dropdown content - positioned below the navbar */}
                    <NavigationMenu.Portal>
                        <NavigationMenu.Positioner 
                            className="top-navbar-positioner"
                            sideOffset={8}
                        >
                            <NavigationMenu.Popup className="top-navbar-popup">
                                <NavigationMenu.Viewport className="top-navbar-viewport" />
                            </NavigationMenu.Popup>
                        </NavigationMenu.Positioner>
                    </NavigationMenu.Portal>
                </NavigationMenu.Root>
            </header>
        </NavbarContext.Provider>
    );
}

export const TopNavbar = Object.assign(TopNavbarRoot, {
    Logo,
    Nav,
    NavItem,
    NavDropdown,
    Actions,
    MobileMenu,
    MobileMenuItem,
    // Re-export base-ui primitives for advanced customization
    Trigger: NavigationMenu.Trigger,
    Content: NavigationMenu.Content,
    Link: NavigationMenu.Link,
    Item: NavigationMenu.Item,
    Icon: NavigationMenu.Icon,
});

