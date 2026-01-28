"use client";

import { useTheme } from "@/components/theme-provider";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";

import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <Tabs value={theme} onValueChange={setTheme}>
            <TabsList className={""}>
                <TabsTrigger key="light" value="light" className="size-7 px-0">
                    <SunIcon size={12} />
                </TabsTrigger>
                <TabsTrigger key="dark" value="dark" className="size-7 px-0">
                    <MoonIcon size={12} />
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}
