"use client";

import { useEffect } from 'react';
import { useSidebarNavigation } from '@/hooks/use-sidebar-navigation';

/**
 * Component that handles browser back button events to prioritize sidebar navigation
 */
export function BrowserBackHandler() {
    const { handleBrowserBack } = useSidebarNavigation();

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            // Check if this is a synthetic history entry from sidebar
            if (event.state?.sidebar) {
                // Handle sidebar navigation first
                const shouldPreventNavigation = handleBrowserBack();
                if (shouldPreventNavigation) {
                    // Prevent the default page navigation
                    event.preventDefault();
                    // Push the state back to maintain history consistency
                    window.history.pushState({ sidebar: true }, '', window.location.href);
                }
                // If shouldPreventNavigation is false, allow normal page navigation
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [handleBrowserBack]);

    return null; // This component doesn't render anything
}