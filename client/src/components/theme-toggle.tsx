"use client";

import { useTheme } from "@/components/theme-provider";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";

import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <Tabs value={theme} onValueChange={setTheme}>
            <TabsList>
                <TabsTrigger key="light" value="light">
                    <SunIcon />
                </TabsTrigger>
                <TabsTrigger key="dark" value="dark">
                    <MoonIcon />
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}
