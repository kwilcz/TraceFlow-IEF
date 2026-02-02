"use client";

import {Field as FieldPrimitive} from "@base-ui/react/field";
import * as React from "react";

import {cn} from "@/lib/utils";
import {dataDisabledState} from "@/lib/styles";


/**
 * Root component for a form field.
 *
 * ## Usage
 * ```tsx
 * <Field.Root>
 *   <Field.Label />
 *   <Field.Control />
 *   <Field.Description />
 *   <Field.Item />
 *   <Field.Error />
 *   <Field.Validity />
 * </Field.Root>
 *
 */
function Root({
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

function Label({
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

function Control({
className, ...props
}: React.ComponentProps<typeof FieldPrimitive.Control>) {
    return (
        <FieldPrimitive.Control
            data-slot="field-control"
            className={cn("", className)}
            {...props}
        />
    );
}


/*
 * Groups individual items in a checkbox group or radio group with a label and description.
 * Renders a `<div>` element.
 */
function Item({
                  className,
                  ...props
              }: React.ComponentProps<typeof FieldPrimitive.Item>) {
    return (
        <FieldPrimitive.Item
            data-slot="field-item"
            className={cn("relative flex flex-col", className)}
            {...props}
        />
    );
}

/*
 * A paragraph with additional information about the field.
 * Renders a `<p>` element.
 */
function Description({
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

/*
 * An error message displayed if the field control fails validation.
 * Renders a `<div>` element.
 */
function Error({
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

export {Root, Label, Description, Control, Item, Error};
