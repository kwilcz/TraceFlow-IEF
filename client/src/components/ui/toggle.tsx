import * as React from "react";
import { Toggle as TogglePrimitive, type ToggleProps as TogglePrimitiveProps } from "@base-ui/react/toggle";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

type ToggleProps = TogglePrimitiveProps & VariantProps<typeof buttonVariants>;

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
    ({ className, variant = "ghost", size, children, pressed, defaultPressed, onPressedChange, ...props }, ref) => (
        <TogglePrimitive
            ref={ref}
            data-slot="toggle"
            pressed={pressed}
            defaultPressed={defaultPressed}
            onPressedChange={onPressedChange}
            className={cn(
                buttonVariants({ variant, size }),
                "data-pressed:bg-accent-soft data-pressed:text-accent-soft-foreground data-pressed:hover:bg-accent-soft-hover data-pressed:active:scale-100",
                className
            )}
            {...props}
        >
            {children}
        </TogglePrimitive>
    )
);
Toggle.displayName = "Toggle";

export { Toggle };
export type { ToggleProps };
