"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { XIcon } from "@phosphor-icons/react";
import {
    transitionSmooth,
    focusRingCombined,
    disabledState,
    ariaDisabledState,
    pressedScale,
} from "@/lib/styles";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
    return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

const dialogTriggerStyles = cn(
    "cursor-pointer transform-gpu",
    transitionSmooth,
    focusRingCombined,
    disabledState, ariaDisabledState,
    pressedScale
);

function DialogTrigger({ className, ...props }: DialogPrimitive.Trigger.Props) {
    return (
        <DialogPrimitive.Trigger
            data-slot="dialog-trigger"
            className={cn(dialogTriggerStyles, className)}
            {...props}
        />
    );
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
    return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
    return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

const dialogBackdropStyles = cn(
    "fixed inset-0 z-50 flex flex-row items-center justify-center h-dvh w-full will-change-[opacity]",
    "bg-black/50 backdrop-blur-md dark:bg-black/60",
    "data-[open]:opacity-100 data-[open]:transition-opacity data-[open]:duration-150 data-[open]:ease-out",
    "data-[starting-style]:opacity-0",
    "data-[ending-style]:opacity-0 data-[ending-style]:transition-opacity data-[ending-style]:duration-100 data-[ending-style]:ease-out",
    "motion-reduce:transition-none"
);

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
    return (
        <DialogPrimitive.Backdrop
            data-slot="dialog-overlay"
            className={cn(dialogBackdropStyles, className)}
            {...props}
        />
    );
}

const dialogContentStyles = cn(
    "relative flex w-full max-w-sm flex-col rounded-3xl bg-overlay shadow-overlay outline-none p-6 pointer-events-auto",
    "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95"
);

function DialogContent({
    className,
    children,
    showCloseButton = true,
    ...props
}: DialogPrimitive.Popup.Props & {
    showCloseButton?: boolean;
}) {
    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Popup
                data-slot="dialog-content"
                className={cn(
                    dialogContentStyles,
                    "fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
                    className
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <DialogPrimitive.Close
                        data-slot="dialog-close"
                        render={
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="absolute top-4 right-4 hover:bg-default data-[hovered=true]:bg-default"
                            />
                        }
                    >
                        <XIcon />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Popup>
        </DialogPortal>
    );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog-header"
            className={cn("flex flex-col gap-1 mb-0", className)}
            {...props}
        />
    );
}

function DialogFooter({
    className,
    showCloseButton = false,
    children,
    ...props
}: React.ComponentProps<"div"> & {
    showCloseButton?: boolean;
}) {
    return (
        <div
            data-slot="dialog-footer"
            className={cn("flex flex-row items-center justify-end gap-2 mt-0", className)}
            {...props}
        >
            {children}
            {showCloseButton && (
                <DialogPrimitive.Close render={<Button variant="outline" />}>
                    Close
                </DialogPrimitive.Close>
            )}
        </div>
    );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
    return (
        <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn(
                "align-middle text-base font-medium text-foreground",
                className
            )}
            {...props}
        />
    );
}

function DialogDescription({
    className,
    ...props
}: DialogPrimitive.Description.Props) {
    return (
        <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn("text-sm text-muted", className)}
            {...props}
        />
    );
}

export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
};
