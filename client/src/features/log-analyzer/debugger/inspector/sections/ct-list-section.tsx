import { Badge } from "@/components/ui/badge";
import { InspectorSection } from "../inspector-section";
import { CopyButton } from "../../shared";
import type { ClaimsTransformationFlowData } from "@/types/flow-node";

// ============================================================================
// CT List Section — claims transformations with inline input/output claims
// ============================================================================

interface CtListSectionProps {
    claimsTransformations: ClaimsTransformationFlowData[];
}

export function CtListSection({ claimsTransformations }: CtListSectionProps) {
    if (claimsTransformations.length === 0) return null;

    return (
        <InspectorSection title="Claims Transformations" count={claimsTransformations.length}>
            {claimsTransformations.map((ct) => (
                <div key={ct.transformationId} className="rounded-md border border-border p-2 mb-1.5 last:mb-0">
                    {/* CT Header */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-cyan-700 dark:text-cyan-300 font-medium">
                            {ct.transformationId}
                        </span>
                        <CopyButton value={ct.transformationId} label="CT ID" />
                    </div>

                    {/* Input Claims */}
                    {ct.inputClaims.length > 0 && (
                        <div className="mt-1.5">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                Inputs
                            </span>
                            <div className="mt-0.5 space-y-0.5">
                                {ct.inputClaims.map((c, i) => (
                                    <div key={`in-${c.claimType}-${i}`} className="flex items-center gap-2 pl-2">
                                        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                                            {c.claimType}:
                                        </span>
                                        <span className="text-[11px] font-mono truncate">
                                            {c.value || "(empty)"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Parameters */}
                    {ct.inputParameters.length > 0 && (
                        <div className="mt-1.5">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                Parameters
                            </span>
                            <div className="mt-0.5 space-y-0.5">
                                {ct.inputParameters.map((p, i) => (
                                    <div key={`param-${p.id}-${i}`} className="flex items-center gap-2 pl-2">
                                        <span className="text-[11px] font-mono text-muted-foreground/70 shrink-0">
                                            {p.id}:
                                        </span>
                                        <span className="text-[11px] font-mono text-muted-foreground truncate">
                                            {p.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Output Claims */}
                    {ct.outputClaims.length > 0 && (
                        <div className="mt-1.5">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                Outputs
                            </span>
                            <div className="mt-0.5 space-y-0.5">
                                {ct.outputClaims.map((c, i) => (
                                    <div key={`out-${c.claimType}-${i}`} className="flex items-center gap-2 pl-2">
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] px-1 py-0 text-emerald-600 border-emerald-400"
                                        >
                                            {c.claimType}
                                        </Badge>
                                        <span className="text-[11px] font-mono truncate">
                                            {c.value || "(empty)"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </InspectorSection>
    );
}
