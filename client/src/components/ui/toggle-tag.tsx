import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { focusRing } from "@/lib/styles";

const toggleTagVariants = cva(
    cn(
        // Base styles
        "relative inline-flex items-center gap-1 rounded-full font-medium select-none cursor-pointer",
        "text-xs px-1.5 py-0.5",
        "transition-[color,background-color,box-shadow,scale] duration-100",
        "motion-reduce:transition-none",
        "origin-center transform-gpu",
        // Inactive state
        "bg-default text-default-foreground",
        "hover:bg-default-hover",
        // Active state via data attribute
        "data-[active=true]:bg-accent-soft data-[active=true]:text-accent-soft-foreground",
        "data-[active=true]:hover:bg-accent-soft-hover",
        // Focus
        focusRing,
    ),
);

type ToggleTagVariantProps = VariantProps<typeof toggleTagVariants>;

interface ToggleTagProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ToggleTagVariantProps {
    active?: boolean;
    children: React.ReactNode;
}

function ToggleTag({ active = false, className, children, ...props }: ToggleTagProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={active ? "true" : "false"}
            data-active={active}
            className={cn(toggleTagVariants(), className)}
            {...props}
        >
            {children}
        </button>
    );
}

export { ToggleTag };
