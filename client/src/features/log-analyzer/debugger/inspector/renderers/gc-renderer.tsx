import { ArrowSquareInIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { FlowNode } from "@/types/flow-node";
import {
    FlowNodeType,
    type StepFlowData,
    type GetClaimsFlowData,
} from "@/types/flow-node";
import type { Selection, SelectionAction } from "../../types";
import { InspectorHeader } from "../inspector-header";
import { InspectorBreadcrumb } from "../inspector-breadcrumb";
import { InspectorSection } from "../inspector-section";
import { ErrorDetails, fromStepError } from "../error-details";
import { StatebagSection } from "../sections";
import { RawDataToggle } from "../raw-data-toggle";

// ============================================================================
// GC Renderer — inspector renderer for GetClaims step children
// ============================================================================

interface GcRendererProps {
    stepNode: FlowNode;
    selection: Selection;
    dispatch: (action: SelectionAction) => void;
}

export function GcRenderer({ stepNode, selection, dispatch }: GcRendererProps) {
    const stepData = stepNode.data as StepFlowData;
    const gcNode = stepNode.children.find((c) => c.type === FlowNodeType.GetClaims);
    const gcData = gcNode?.data as GetClaimsFlowData | undefined;

    return (
        <div className="space-y-3">
            {/* 1. Header */}
            <InspectorHeader
                icon={<ArrowSquareInIcon className="w-4 h-4" />}
                name="GetClaims"
                result={stepData.result}
                statebag={stepNode.context.statebagSnapshot}
                logId={stepNode.context.logId}
                duration={stepData.duration}
            />

            {/* 2. Error banner(s) */}
            {stepData.errors.length > 0 && (
                <div className="px-3 space-y-2">
                    {stepData.errors.map((err, i) => (
                        <ErrorDetails key={i} {...fromStepError(err)} />
                    ))}
                </div>
            )}

            {/* 3. Breadcrumb */}
            <div className="px-3">
                <InspectorBreadcrumb
                    segments={[
                        {
                            label: `Step ${stepData.stepOrder}`,
                            onClick: () => dispatch({ type: "select-step", nodeId: selection.nodeId }),
                        },
                        { label: "GetClaims" },
                    ]}
                />
            </div>

            {/* 4. Claims source + validation status badges */}
            <div className="flex flex-wrap gap-1.5 px-3">
                <Badge variant="secondary" className="text-xs">
                    Source: {gcData?.claimsSource ?? "id_token_hint"}
                </Badge>
                {gcData?.idTokenHintValidated ? (
                    <Badge className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700" variant="outline">
                        id_token_hint validated
                    </Badge>
                ) : (
                    <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-700" variant="outline">
                        id_token_hint not validated
                    </Badge>
                )}
            </div>

            {/* 5. Extracted claims table */}
            <div className="px-3">
                <InspectorSection title={`Extracted Claims (${gcData?.extractedClaims.length ?? 0})`}>
                    {gcData && gcData.extractedClaims.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Claim Type</TableHead>
                                    <TableHead>Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {gcData.extractedClaims.map(({ claimType, value }) => (
                                    <TableRow key={claimType}>
                                        <TableCell className="font-mono text-xs">{claimType}</TableCell>
                                        <TableCell className="font-mono text-xs break-all">{value}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-xs text-amber-700 dark:text-amber-400 px-1 py-2">
                            No claim values changed at this step.
                        </p>
                    )}
                </InspectorSection>
            </div>

            {/* 6. Statebag */}
            <div className="px-3">
                <StatebagSection statebag={stepNode.context.statebagSnapshot} />
            </div>

            {/* 7. Raw data — full GetClaims node data */}
            <div className="px-3">
                <RawDataToggle data={gcNode?.data ?? stepNode.data} />
            </div>
        </div>
    );
}
