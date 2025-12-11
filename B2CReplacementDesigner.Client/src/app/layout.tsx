import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/menu-styles.css";
import MainLayout from "@/components/layout/main-layout";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarNavigationProvider } from "@/contexts/SidebarNavigationContext";
import { BrowserBackHandler } from "@/components/browser-back-handler";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: {
        template: "%s | MIP B2C UI",
        default: "Home",
    },
    description: "Custom policy display as relational Graph",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                    <SidebarNavigationProvider>
                        <TooltipProvider>
                            <BrowserBackHandler />
                            <MainLayout>{children}</MainLayout>
                        </TooltipProvider>
                    </SidebarNavigationProvider>
                    <Toaster richColors expand />
                </ThemeProvider>
            </body>
        </html>
    );
}
