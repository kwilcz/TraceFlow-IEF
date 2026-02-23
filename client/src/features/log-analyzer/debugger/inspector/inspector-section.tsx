import type React from "react";

// ============================================================================
// Inspector Section
// ============================================================================

interface InspectorSectionProps {
    title: string;
    /** Optional count rendered as "(N)" after the title. */
    count?: number;
    /** Reserved for future collapsibility — currently ignored. */
    defaultOpen?: boolean;
    children: React.ReactNode;
}

/**
 * Collapsible section wrapper used by all type-adaptive renderers.
 *
 * **V1 — always open.** The `defaultOpen` prop is accepted for forward
 * compatibility but collapsibility is not yet wired up.
 */
export function InspectorSection({ title, count, children }: InspectorSectionProps) {
    return (
        <section className="mt-4 first:mt-0">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {title}
                {count !== undefined && (
                    <span className="font-normal ml-1">({count})</span>
                )}
            </h3>

            <div className="space-y-1 mt-2">{children}</div>
        </section>
    );
}
