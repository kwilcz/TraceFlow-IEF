"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";

import { CheckIcon } from "@phosphor-icons/react";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
    return (
        <CheckboxPrimitive.Root data-slot="checkbox" className={className} {...props}>
            <CheckboxPrimitive.Indicator data-slot="checkbox-indicator">
                <CheckIcon weight="bold" />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
}

export { Checkbox };
