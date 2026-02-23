import { useMemo, useState } from "react";
import { InspectorSection } from "./inspector-section";

// ============================================================================
// Raw Data Toggle — collapsible JSON dump of step data
// ============================================================================

// TODO: Design review pending (§6.6 Q4 + §10.1). This is a temporary debug aid.
// Exact behavior, position, and rendering TBD in a future design session.

interface RawDataToggleProps {
    /** The TraceStep or sub-object to dump as raw JSON. */
    data: unknown;
}

/**
 * Simple collapsible that renders the raw JSON data of a trace step.
 * Lazy-renders the JSON only when expanded to avoid serializing large objects.
 */
export function RawDataToggle({ data }: RawDataToggleProps) {
    const [expanded, setExpanded] = useState(false);
    const serialized = useMemo(
        () => (expanded ? JSON.stringify(data, null, 2) : ""),
        [data, expanded],
    );

    return (
        <InspectorSection title="Raw Trace Data">
            <details open={expanded} onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)}>
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    Click to expand raw JSON
                </summary>
                {expanded && (
                    <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto mt-2 p-2 rounded-md bg-muted/50 border border-border">
                        {serialized}
                    </pre>
                )}
            </details>
        </InspectorSection>
    );
}
