"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";

import { cn } from "@/lib/utils";
import {
    focusRing,
    dataDisabledState,
    transitionColors,
} from "@/lib/styles";
import { CheckIcon } from "@phosphor-icons/react";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
    return (
        <CheckboxPrimitive.Root
            data-slot="checkbox"
            className={cn(
                // Base layout
                "relative flex shrink-0 size-4 items-center justify-center gap-3 rounded-md bg-field shadow-field outline-none cursor-pointer",
                // Larger hit target
                "after:absolute after:-inset-x-3 after:-inset-y-2",
                // Transitions
                transitionColors,
                // Hover (when not checked)
                "hover:not-data-checked:bg-field-hover",
                // Checked state
                "data-checked:bg-accent data-checked:text-accent-foreground",
                // Focus
                focusRing,
                // Invalid state (when not checked)
                "aria-invalid:not-data-checked:ring-2 aria-invalid:not-data-checked:ring-destructive/50 aria-invalid:not-data-checked:ring-offset-0",
                // Invalid + checked
                "aria-invalid:data-checked:bg-danger aria-invalid:data-checked:text-danger-foreground",
                // Disabled
                dataDisabledState,
                className
            )}
            {...props}
        >
            <CheckboxPrimitive.Indicator
                data-slot="checkbox-indicator"
                className="flex items-center justify-center text-current transition-opacity duration-150 ease-out motion-reduce:transition-none"
            >
                <CheckIcon
                    weight="bold"
                    data-slot="checkbox-default-indicator--checkmark"
                    className="size-2.5 stroke-[2.5px]"
                />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
}

export { Checkbox };
