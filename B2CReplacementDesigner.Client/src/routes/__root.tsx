import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import MainLayout from '@/components/layout/main-layout';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { SidebarNavigationProvider } from '@/contexts/SidebarNavigationContext';
import { BrowserBackHandler } from '@/components/browser-back-handler';
import { TooltipProvider } from '@/components/ui/tooltip';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="traceflow-theme">
      <SidebarNavigationProvider>
        <TooltipProvider>
          <BrowserBackHandler />
          <MainLayout>
            <Outlet />
          </MainLayout>
        </TooltipProvider>
      </SidebarNavigationProvider>
      <Toaster richColors expand />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </ThemeProvider>
  );
}
