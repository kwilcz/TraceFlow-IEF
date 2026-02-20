import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldBase } from "@/lib/styles";

// =============================================================================
// Display Field — readonly data display sharing field tokens with Input
// =============================================================================

const displayFieldBase = cn(fieldBase, "shadow-none cursor-default select-all min-h-7.5");

interface DisplayFieldProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Action element (e.g. CopyButton) shown on hover in the top-right corner */
    action?: React.ReactNode;
}

function DisplayField({ className, children, action, ...props }: DisplayFieldProps) {
    return (
        <div className="group/field relative">
            <div data-slot="display-field" className={cn(displayFieldBase, className)} {...props}>
                {children}
            </div>
            {action && (
                <div
                    data-slot="display-field-action"
                    className="absolute top-0 right-0 opacity-0 group-hover/field:opacity-100 transition-opacity"
                >
                    {action}
                </div>
            )}
        </div>
    );
}

export { DisplayField };
export type { DisplayFieldProps };
