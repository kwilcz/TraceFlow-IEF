import { BrowserBackHandler } from "@/components/browser-back-handler";
import { TopNavbar } from "@/components/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarNavigationProvider } from "@/contexts/SidebarNavigationContext";
import { CircuitryIcon } from "@phosphor-icons/react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

export const Route = createRootRoute({
    component: RootLayout,
});

function RootLayout() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="traceflow-theme">
            <SidebarNavigationProvider>
                <TooltipProvider>
                    <BrowserBackHandler />

                    {/* Full-page wrapper with background that extends behind sticky navbar */}
                    <div className="min-h-screen">
                        <TopNavbar>
                            <TopNavbar.Logo icon={<CircuitryIcon weight="fill" />}>Trace<span className="text-primary">Flow</span></TopNavbar.Logo>

                            <TopNavbar.Nav>
                                <TopNavbar.NavItem href="/">Home</TopNavbar.NavItem>
                                <TopNavbar.NavItem href="/b2c/policy-graph">Policy Graph</TopNavbar.NavItem>
                                <TopNavbar.NavItem href="/b2c/analyze-logs">Policy Debugger</TopNavbar.NavItem>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span>
                                            <TopNavbar.NavItem href="/licensing" disabled>
                                                Licensing
                                            </TopNavbar.NavItem>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>In Progress</TooltipContent>
                                </Tooltip>
                                <TopNavbar.NavItem href="/contact">Contact</TopNavbar.NavItem>
                            </TopNavbar.Nav>

                            <TopNavbar.Actions>
                                <ThemeToggle />
                            </TopNavbar.Actions>

                            <TopNavbar.MobileMenu actions={<ThemeToggle />} />
                        </TopNavbar>

                        <main>
                            <Outlet />
                        </main>
                    </div>
                </TooltipProvider>
            </SidebarNavigationProvider>
            <Toaster richColors expand />
            {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
        </ThemeProvider>
    );
}
