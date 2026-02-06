"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: number;
    max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    ({ className, value = 0, max = 100, ...props }, ref) => {
        const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

        return (
            <div
                ref={ref}
                className={cn("relative w-full overflow-hidden rounded-full bg-default", className)}
                {...props}
            >
                <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        );
    }
);

Progress.displayName = "Progress";

export { Progress };
