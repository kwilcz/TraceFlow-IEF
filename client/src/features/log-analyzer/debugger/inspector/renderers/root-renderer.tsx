import { FolderOpenIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { useShallow } from "zustand/react/shallow";
import { useLogStore } from "@/stores/log-store";
import { FlowNodeType, type RootFlowData } from "@/types/flow-node";
import { InspectorSection } from "../inspector-section";
import { ErrorDetails, fromGlobalFlowError } from "../error-details";

// ============================================================================
// Root Renderer — inspector view for the top-level UserJourney node
// ============================================================================

/**
 * Renders flow-level metadata for the root (UserJourney) node:
 * - Flow identity: TenantId, PolicyId, CorrelationId
 * - Log event instances in order
 * - Session count
 * - Global error details (when present)
 */
export function RootRenderer() {
    const { flowTree, globalError } = useLogStore(
        useShallow((s) => ({
            flowTree: s.flowTree,
            globalError: s.selectedFlow?.globalError,
        })),
    );

    if (!flowTree || flowTree.data.type !== FlowNodeType.Root) return null;

    const rootData = flowTree.data as RootFlowData;

    return (
        <div className="space-y-3">
            {/* ── Sticky identity bar ────────────────────────────────── */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between gap-2 px-3 h-9">
                <div className="flex items-center gap-2 min-w-0">
                    <FolderOpenIcon className="w-4 h-4 shrink-0" />
                    <span className="font-mono text-sm truncate" title={flowTree.name}>
                        {flowTree.name}
                    </span>
                </div>
                {globalError && (
                    <Badge variant="destructive" className="text-xs shrink-0">
                        Error
                    </Badge>
                )}
            </div>

            {/* ── Flow Identity ──────────────────────────────────────── */}
            <div className="px-3">
                <InspectorSection title="Flow Identity">
                    <LabelValueRow label="Tenant ID" value={rootData.tenantId || "—"} mono />
                    <LabelValueRow label="Policy ID" value={rootData.policyId || "—"} mono />
                    <LabelValueRow label="Correlation ID" value={rootData.correlationId || "—"} mono />
                </InspectorSection>
            </div>

            {/* ── Log Events ────────────────────────────────────────── */}
            <div className="px-3">
                <InspectorSection title="Log Events" count={rootData.eventInstances.length}>
                    <div className="flex flex-wrap gap-1.5">
                        {rootData.eventInstances.length > 0 ? (
                            rootData.eventInstances.map((ev, i) => (
                                <Badge key={i} variant="outline" className="text-xs font-mono">
                                    {ev}
                                </Badge>
                            ))
                        ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                        )}
                    </div>
                    <LabelValueRow label="Session count" value={String(rootData.sessionCount)} />
                </InspectorSection>
            </div>

            {/* ── Global Error ───────────────────────────────────────── */}
            {globalError && (
                <div className="px-3">
                    <InspectorSection title="Global Error">
                        <ErrorDetails {...fromGlobalFlowError(globalError)} />
                    </InspectorSection>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Shared sub-component
// ============================================================================

interface LabelValueRowProps {
    label: string;
    value: string;
    mono?: boolean;
}

function LabelValueRow({ label, value, mono = false }: LabelValueRowProps) {
    return (
        <div className="flex items-start gap-2 py-0.5">
            <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
            <span
                className={`text-xs break-all ${mono ? "font-mono" : ""}`}
                title={value}
            >
                {value}
            </span>
        </div>
    );
}
