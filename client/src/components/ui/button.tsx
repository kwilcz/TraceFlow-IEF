"use client";

import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";

import { cn } from "@/lib/utils";

type ButtonVariant =
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "destructive"
    | "link";

type ButtonSize =
    | "default"
    | "xs"
    | "sm"
    | "lg"
    | "xl"
    | "icon"
    | "icon-xs"
    | "icon-sm"
    | "icon-lg"
    | "icon-xl";

type ButtonProps = ButtonPrimitive.Props & {
    asChild?: boolean;
    variant?: ButtonVariant;
    size?: ButtonSize;
};

function Button({
    asChild,
    className,
    variant = "default",
    size = "default",
    children,
    ...props
}: ButtonProps) {
    const render = asChild
        ? (React.Children.only(children) as React.ReactElement)
        : undefined;

    return (
        <ButtonPrimitive
            data-slot="button"
            data-variant={variant}
            data-size={size}
            className={cn(className)}
            render={render}
            {...props}
        >
            {asChild ? null : children}
        </ButtonPrimitive>
    );
}

export { Button };
