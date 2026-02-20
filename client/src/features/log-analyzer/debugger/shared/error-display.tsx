import type React from "react";

// ============================================================================
// Error Display Components
// ============================================================================

/**
 * Structured error details showing message and optional HResult code.
 *
 * Extracted from `trace-timeline.tsx`. This version uses labelled rows
 * (`Message` / `HResult`) for a clean two-line layout. The simpler
 * `step-panel.tsx` variant (plain paragraph + monospace hResult) is
 * superseded by this more structured approach.
 */
export const ErrorDetails: React.FC<{ message: string; hResult?: string }> = ({ message, hResult }) => (
    <div className="space-y-1.5">
        <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Message</span>
            <span className="text-sm text-red-700 dark:text-red-400 break-words">{message}</span>
        </div>
        {hResult && (
            <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">HResult</span>
                <code className="text-sm font-mono text-red-700 dark:text-red-400">0x{hResult}</code>
            </div>
        )}
    </div>
);

/**
 * Simple single-line error message for parsing or system-level errors.
 *
 * Extracted from `trace-timeline.tsx`.
 */
export const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
    <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
);
