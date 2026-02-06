"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const kbdVariants = cva(
    "inline-flex items-center space-x-0.5 rounded-lg px-2 text-center font-sans font-medium whitespace-nowrap text-muted rtl:space-x-reverse [word-spacing:-0.25rem]",
    {
        variants: {
            variant: {
                default: "bg-default",
                light: "bg-transparent",
            },
            size: {
                sm: "h-5 px-1.5 text-xs",
                md: "h-6 text-sm",
                lg: "h-7 px-2.5 text-base",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "md",
        },
    }
);

interface KbdProps
    extends React.ComponentProps<"kbd">,
        VariantProps<typeof kbdVariants> {
    keys?: string | string[];
}

const KEY_MAP: Record<string, string> = {
    command: "⌘",
    cmd: "⌘",
    ctrl: "⌃",
    control: "⌃",
    alt: "⌥",
    option: "⌥",
    opt: "⌥",
    shift: "⇧",
    enter: "↵",
    return: "↵",
    backspace: "⌫",
    delete: "⌦",
    escape: "⎋",
    esc: "⎋",
    tab: "⇥",
    space: "␣",
    up: "↑",
    down: "↓",
    left: "←",
    right: "→",
};

function normalizeKey(key: string): string {
    const lower = key.toLowerCase().trim();
    return KEY_MAP[lower] ?? key.toUpperCase();
}

function Kbd({
    size,
    variant,
    keys,
    children,
    className,
    ...props
}: KbdProps) {
    const renderKeys = () => {
        if (keys) {
            const keyArray = Array.isArray(keys) ? keys : keys.split("+");
            return keyArray.map((key, index) => (
                <React.Fragment key={index}>
                    <abbr
                        className="flex items-center justify-center size-full no-underline"
                        title={key}
                    >
                        {normalizeKey(key)}
                    </abbr>
                </React.Fragment>
            ));
        }
        return <span className="flex items-center justify-center">{children}</span>;
    };

    return (
        <kbd
            data-slot="kbd"
            className={cn(kbdVariants({ variant, size }), className)}
            {...props}
        >
            {renderKeys()}
        </kbd>
    );
}

export { Kbd, type KbdProps };
