import { createContext, useContext } from 'react';
import type { NavbarContextValue } from '@/types/navigation';

export const NavbarContext = createContext<NavbarContextValue | null>(null);

export function useNavbarContext() {
    const context = useContext(NavbarContext);
    if (!context) {
        throw new Error('Navbar components must be used within TopNavbar');
    }
    return context;
}
