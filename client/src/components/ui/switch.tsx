"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { noHighlight, dataDisabledState, focusRing, transitionAll } from "@/lib/styles";

const switchVariants = cva(
    cn("inline-flex items-center gap-3 cursor-pointer", noHighlight, dataDisabledState),
    {
        variants: {
            size: {
                sm: "",
                md: "",
                lg: "",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }
);

const switchControlBase = cn(
    "relative flex shrink-0 items-center overflow-hidden rounded-full bg-default",
    transitionAll,
    "group-hover:bg-default/80",
    "group-data-[checked]:bg-accent group-hover:group-data-[checked]:bg-accent-hover"
);

const switchControlFocus = cn(
    "group-focus-visible:outline-none group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background"
);

const switchControlVariants = cva(
    cn(switchControlBase, switchControlFocus),
    {
        variants: {
            size: {
                sm: "h-4 w-8",
                md: "h-5 w-10",
                lg: "h-6 w-12",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }
);

const switchThumbBase = cn(
    "flex origin-center rounded-full bg-white text-black shadow-field",
    "transition-all duration-300 ease-out motion-reduce:transition-none",
    "group-data-[checked]:bg-accent-foreground group-data-[checked]:text-accent",
    "group-disabled:bg-default-foreground/20 group-disabled:group-data-[checked]:opacity-40"
);

const switchThumbVariants = cva(
    switchThumbBase,
    {
        variants: {
            size: {
                sm: "ms-0.5 h-3 w-[1.03125rem] group-data-[checked]:ms-[calc(100%-1.15625rem)]",
                md: "ms-0.5 h-4 w-[1.375rem] group-data-[checked]:ms-[calc(100%-1.5rem)]",
                lg: "ms-0.5 h-5 w-[1.71875rem] group-data-[checked]:ms-[calc(100%-1.84375rem)]",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }
);

export interface SwitchProps
    extends SwitchPrimitive.Root.Props,
        VariantProps<typeof switchVariants> {}

function Switch({ className, size = "md", ...props }: SwitchProps) {
    return (
        <SwitchPrimitive.Root
            data-slot="switch"
            className={cn(switchVariants({ size }), "group", className)}
            {...props}
        >
            <SwitchPrimitive.Thumb
                data-slot="switch-control"
                className={switchControlVariants({ size })}
            >
                <span className={switchThumbVariants({ size })} />
            </SwitchPrimitive.Thumb>
        </SwitchPrimitive.Root>
    );
}

export { Switch, switchVariants };
