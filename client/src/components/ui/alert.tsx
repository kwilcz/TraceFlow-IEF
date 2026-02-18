import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
    "relative w-full rounded-xl border px-4 py-3 text-sm [&>svg+div]:-translate-y-0.5 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7",
    {
        variants: {
            variant: {
                default: "border-field-border bg-surface text-foreground",
                destructive: "border-danger/30 bg-danger/10 text-danger",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

export interface AlertProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof alertVariants> {}

const Root = React.forwardRef<HTMLDivElement, AlertProps>(({ className, variant, ...props }, ref) => (
    <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
    />
));

Root.displayName = "Alert";

const Title = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h5
            ref={ref}
            className={cn("mb-1 font-medium leading-none tracking-tight", className)}
            {...props}
        />
    ),
);

Title.displayName = "AlertTitle";

const Description = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("text-sm leading-relaxed", className)}
            {...props}
        />
    ),
);

Description.displayName = "AlertDescription";

export { Root, Title, Description };
