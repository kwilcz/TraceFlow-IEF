"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { dataDisabledState } from "@/lib/styles";

interface LabelProps extends React.ComponentProps<"label"> {
    required?: boolean;
}

function Label({ className, required, ...props }: LabelProps) {
    return (
        <label
            data-slot="label"
            className={cn(
                "text-sm font-medium text-foreground",
                required && "after:ml-0.5 after:text-danger after:content-['*']",
                dataDisabledState,
                className
            )}
            {...props}
        />
    );
}

export { Label };
