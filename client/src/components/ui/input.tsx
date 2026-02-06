"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { fieldBase, transitionAll, disabledState, focusRingCombined } from "@/lib/styles";

const inputVariants = cva(
    cn(
        // Base styles
        fieldBase,
        transitionAll,
        focusRingCombined,
        // Hover state (only when not focused)
        "hover:bg-field-hover focus:hover:bg-field-focus",
        // Invalid state
        "aria-invalid:ring-2 aria-invalid:ring-destructive aria-invalid:ring-offset-0",
        "data-[invalid=true]:ring-2 data-[invalid=true]:ring-destructive data-[invalid=true]:ring-offset-0",
        // Disabled state
        disabledState,
    ),
    {
        variants: {
            variant: {
                primary: "",
                secondary: "shadow-none bg-default hover:bg-default-hover focus:bg-default",
            },
        },
        defaultVariants: {
            variant: "primary",
        },
    },
);

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = "text", variant, ...props }, ref) => {
    return <input type={type} className={cn(inputVariants({ variant }), className)} ref={ref} {...props} />;
});
Input.displayName = "Input";

export { Input, inputVariants };
