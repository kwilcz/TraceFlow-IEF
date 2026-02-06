"use client";

import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import {
    focusRing,
    disabledState,
    noHighlight,
    transitionSmooth,
} from "@/lib/styles";

const buttonVariants = cva(
    cn(
        // Base layout
        "relative isolate inline-flex origin-center items-center justify-center gap-2 rounded-2xl text-sm font-medium whitespace-nowrap will-change-transform outline-none select-none cursor-pointer transform-gpu",
        noHighlight,
        // Transitions
        transitionSmooth,
        // Focus state
        focusRing,
        // Disabled state
        disabledState,
        // Active/pressed
        "active:scale-[0.97]",
        // Icon styling
        "[&_svg:not([data-slot=spinner]_svg,[data-slot=link-icon]_svg)]:pointer-events-none [&_svg:not([data-slot=spinner]_svg,[data-slot=link-icon]_svg)]:-mx-0.5 [&_svg:not([data-slot=spinner]_svg,[data-slot=link-icon]_svg)]:my-0.5 [&_svg:not([data-slot=spinner]_svg,[data-slot=link-icon]_svg)]:size-5 [&_svg:not([data-slot=spinner]_svg,[data-slot=link-icon]_svg)]:shrink-0 [&_svg:not([data-slot=spinner]_svg,[data-slot=link-icon]_svg)]:self-center sm:[&_svg:not([data-slot=spinner]_svg,[data-slot=link-icon]_svg)]:my-1 sm:[&_svg:not([data-slot=spinner]_svg,[data-slot=link-icon]_svg)]:size-4"
    ),
    {
        variants: {
            variant: {
                default: "bg-accent text-accent-foreground hover:bg-accent-hover",
                secondary: "bg-default text-accent-soft-foreground hover:bg-default-hover",
                outline: "border border-border bg-transparent text-default-foreground hover:bg-default/60",
                ghost: "bg-transparent text-default-foreground hover:bg-default-hover",
                destructive: "bg-danger text-danger-foreground hover:bg-danger-hover",
                link: "bg-transparent text-default-foreground underline-offset-4 hover:underline active:scale-100",
            },
            size: {
                default: "h-10 px-4 md:h-9",
                xs: "h-8 px-2 text-xs md:h-7",
                sm: "h-9 px-3 md:h-8 [&_svg:not([data-slot=spinner]_svg,[data-slot=link-icon]_svg)]:size-4 active:scale-[0.98]",
                lg: "h-11 text-base md:h-10 active:scale-[0.96]",
                xl: "h-12 px-6 text-base md:h-11",
                icon: "w-10 p-0 md:w-9",
                "icon-xs": "min-h-6.5 min-w-6.5 rounded-md [&_svg:not([class*=size-])]:size-3.5",
                "icon-sm": "w-9 min-h-8 min-w-8 md:w-8 [&_svg:not([class*=size-])]:size-3.5",
                "icon-lg": "w-11 min-h-11 min-w-11 md:w-10 [&_svg:not([class*=size-])]:size-6",
                "icon-xl": "min-h-14 min-w-14 rounded-lg [&_svg:not([class*=size-])]:size-8",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

type ButtonProps = ButtonPrimitive.Props &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    };

function Button({
    asChild,
    className,
    variant,
    size,
    children,
    ...props
}: ButtonProps) {
    const render = asChild
        ? (React.Children.only(children) as React.ReactElement)
        : undefined;

    return (
        <ButtonPrimitive
            data-slot="button"
            className={cn(buttonVariants({ variant, size }), className)}
            render={render}
            {...props}
        >
            {asChild ? null : children}
        </ButtonPrimitive>
    );
}

export { Button, buttonVariants };
export type { ButtonProps };
