"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

import { cn } from "@/lib/utils";

function Separator({
    className,
    orientation = "horizontal",
    ...props
}: SeparatorPrimitive.Props) {
    return (
        <SeparatorPrimitive
            data-slot="separator"
            orientation={orientation}
            className={cn(
                "shrink-0 rounded-lg border-t-0 border-b-0 bg-separator",
                orientation === "horizontal" && "h-px w-full",
                orientation === "vertical" && "h-full min-h-2 w-px",
                className
            )}
            {...props}
        />
    );
}

export { Separator };
