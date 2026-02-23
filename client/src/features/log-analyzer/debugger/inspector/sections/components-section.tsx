import { useEffect, useState } from "react";
import {
    CaretDownIcon,
    CaretRightIcon,
    ArrowSquareOutIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InspectorSection } from "../inspector-section";
import { CopyButton } from "../../shared";
import type { DisplayControlAction, BackendApiCall } from "@/types/trace";

// ============================================================================
// Components Section — lists TPs, CTs, DCs, selectable options, API calls
// ============================================================================

interface ComponentsSectionProps {
    technicalProfiles: string[];
    claimsTransformations: string[];
    displayControlActions: DisplayControlAction[];
    selectableOptions: string[];
    backendApiCalls?: BackendApiCall[];
    selectedOption?: string;
}

/** Mini sub-heading used for each non-empty group. */
function SubHeading({ children }: { children: React.ReactNode }) {
    return (
        <h4 className="text-[10px] text-muted-foreground uppercase font-medium mt-3 first:mt-0 mb-1">
            {children}
        </h4>
    );
}

export function ComponentsSection({
    technicalProfiles,
    claimsTransformations,
    displayControlActions,
    selectableOptions,
    backendApiCalls,
    selectedOption,
}: ComponentsSectionProps) {
    const [expandedApis, setExpandedApis] = useState<Set<number>>(new Set());

    // Reset expanded state on data change
    useEffect(() => {
        setExpandedApis(new Set());
    }, [backendApiCalls]);

    const toggleApi = (idx: number) => {
        setExpandedApis((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const hasContent =
        technicalProfiles.length > 0 ||
        claimsTransformations.length > 0 ||
        displayControlActions.length > 0 ||
        selectableOptions.length > 0 ||
        (backendApiCalls && backendApiCalls.length > 0);

    if (!hasContent) return null;

    return (
        <InspectorSection title="Components">
            {/* Technical Profiles */}
            {technicalProfiles.length > 0 && (
                <>
                    <SubHeading>Technical Profiles ({technicalProfiles.length})</SubHeading>
                    {technicalProfiles.map((tp) => (
                        <div key={tp} className="group flex items-center justify-between py-1">
                            <span className="text-xs font-mono text-violet-700 dark:text-violet-300 truncate">
                                {tp}
                            </span>
                            <CopyButton value={tp} label="TP ID" />
                        </div>
                    ))}
                </>
            )}

            {/* Claims Transformations */}
            {claimsTransformations.length > 0 && (
                <>
                    <SubHeading>Claims Transformations ({claimsTransformations.length})</SubHeading>
                    {claimsTransformations.map((ct) => (
                        <div key={ct} className="group flex items-center justify-between py-1">
                            <span className="text-xs font-mono text-cyan-700 dark:text-cyan-300 truncate">
                                {ct}
                            </span>
                            <CopyButton value={ct} label="CT ID" />
                        </div>
                    ))}
                </>
            )}

            {/* Display Control Actions */}
            {displayControlActions.length > 0 && (
                <>
                    <SubHeading>Display Controls ({displayControlActions.length})</SubHeading>
                    {displayControlActions.map((dc, idx) => (
                        <div
                            key={`${dc.displayControlId}-${dc.action}-${idx}`}
                            className="flex items-center justify-between py-1"
                        >
                            <span className="text-xs font-mono text-orange-700 dark:text-orange-300 truncate">
                                {dc.displayControlId}{" "}
                                <span className="text-muted-foreground">({dc.action})</span>
                            </span>
                            {dc.resultCode && (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-[10px] ml-2",
                                        dc.resultCode === "200"
                                            ? "text-green-600 border-green-400"
                                            : "text-red-600 border-red-400",
                                    )}
                                >
                                    {dc.resultCode}
                                </Badge>
                            )}
                        </div>
                    ))}
                </>
            )}

            {/* Selectable Options */}
            {selectableOptions.length > 0 && (
                <>
                    <SubHeading>Selectable Options</SubHeading>
                    <div className="flex flex-wrap gap-1">
                        {selectableOptions.map((opt) => (
                            <Badge
                                key={opt}
                                variant="outline"
                                className={cn(
                                    "text-xs",
                                    opt === selectedOption &&
                                        "text-emerald-700 dark:text-emerald-300 border-emerald-400",
                                )}
                            >
                                {opt}
                            </Badge>
                        ))}
                    </div>
                </>
            )}

            {/* Backend API Calls */}
            {backendApiCalls && backendApiCalls.length > 0 && (
                <>
                    <SubHeading>Backend API Calls ({backendApiCalls.length})</SubHeading>
                    {backendApiCalls.map((call, idx) => {
                        const expanded = expandedApis.has(idx);
                        const hasResponse = call.response || call.rawResponse;

                        return (
                            <div key={idx} className="rounded-md border border-border p-2 text-xs">
                                <div
                                    className={cn(
                                        "flex items-center gap-1.5",
                                        hasResponse && "cursor-pointer",
                                    )}
                                    onClick={() => hasResponse && toggleApi(idx)}
                                >
                                    {hasResponse &&
                                        (expanded ? (
                                            <CaretDownIcon className="w-3 h-3 shrink-0" />
                                        ) : (
                                            <CaretRightIcon className="w-3 h-3 shrink-0" />
                                        ))}
                                    <ArrowSquareOutIcon className="w-3 h-3 shrink-0 text-muted-foreground" />
                                    <span className="font-mono text-muted-foreground truncate">
                                        {call.requestType && (
                                            <span className="text-foreground mr-1">{call.requestType}</span>
                                        )}
                                        {call.requestUri}
                                    </span>
                                </div>
                                {expanded && hasResponse && (
                                    <pre className="mt-2 p-2 bg-muted rounded text-[10px] font-mono overflow-auto max-h-48 whitespace-pre-wrap break-all">
                                        {call.response
                                            ? JSON.stringify(call.response, null, 2)
                                            : call.rawResponse}
                                    </pre>
                                )}
                            </div>
                        );
                    })}
                </>
            )}
        </InspectorSection>
    );
}
