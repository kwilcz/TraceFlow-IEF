"use client";

import { Field as FieldPrimitive } from "@base-ui/react/field";
import * as React from "react";

import { cn } from "@/lib/utils";
import { dataDisabledState } from "@/lib/styles";

function Field({
    className,
    ...props
}: React.ComponentProps<typeof FieldPrimitive.Root>) {
    return (
        <FieldPrimitive.Root
            data-slot="field"
            className={cn("flex flex-col gap-1", dataDisabledState, className)}
            {...props}
        />
    );
}

function FieldLabel({
    className,
    ...props
}: React.ComponentProps<typeof FieldPrimitive.Label>) {
    return (
        <FieldPrimitive.Label
            data-slot="field-label"
            className={cn(
                "text-sm font-medium text-foreground",
                "data-[required=true]:after:ml-0.5 data-[required=true]:after:text-danger data-[required=true]:after:content-['*']",
                "data-[invalid=true]:text-danger",
                className
            )}
            {...props}
        />
    );
}

function FieldDescription({
    className,
    ...props
}: React.ComponentProps<typeof FieldPrimitive.Description>) {
    return (
        <FieldPrimitive.Description
            data-slot="field-description"
            className={cn("text-xs text-muted data-[invalid=true]:hidden", className)}
            {...props}
        />
    );
}

function FieldError({
    className,
    ...props
}: React.ComponentProps<typeof FieldPrimitive.Error>) {
    return (
        <FieldPrimitive.Error
            data-slot="field-error"
            className={cn("text-xs text-danger", className)}
            {...props}
        />
    );
}

export { Field, FieldDescription, FieldError, FieldLabel };
