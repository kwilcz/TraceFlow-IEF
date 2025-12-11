import { useEffect } from 'react';
import { useSidebarNavigation } from '@/hooks/use-sidebar-navigation';

/**
 * Component that handles browser back button events to prioritize sidebar navigation
 */
export function BrowserBackHandler() {
    const { handleBrowserBack } = useSidebarNavigation();

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state?.sidebar) {
                const shouldPreventNavigation = handleBrowserBack();
                if (shouldPreventNavigation) {
                    event.preventDefault();
                    window.history.pushState({ sidebar: true }, '', window.location.href);
                }
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [handleBrowserBack]);

    return null;
}