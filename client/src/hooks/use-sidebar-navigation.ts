import { useContext } from 'react';
import { SidebarNavigationContext } from '@/contexts/SidebarNavigationContext';

/**
 * Hook to use sidebar navigation
 */
export function useSidebarNavigation() {
    const context = useContext(SidebarNavigationContext);
    if (!context) {
        throw new Error('useSidebarNavigation must be used within SidebarNavigationProvider');
    }
    return context;
}
