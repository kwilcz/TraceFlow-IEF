import { GearIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import type { FlowNode } from "@/types/flow-node";
import {
    FlowNodeType,
    type StepFlowData,
    type TechnicalProfileFlowData,
    type ClaimsTransformationFlowData,
} from "@/types/flow-node";
import { findChildNode } from "@/lib/trace/domain/flow-node-utils";
import type { Selection, SelectionAction } from "../../types";
import { InspectorHeader } from "../inspector-header";
import { InspectorErrorBanner } from "../inspector-error-banner";
import { InspectorBreadcrumb } from "../inspector-breadcrumb";
import type { BreadcrumbSegment } from "../inspector-breadcrumb";
import {
    ProviderDetailsSection,
    CtListSection,
    ClaimsIoSection,
    ValidationTpsSection,
    StatebagSection,
} from "../sections";
import { RawDataToggle } from "../raw-data-toggle";

// ============================================================================
// TP Renderer — type-adaptive renderer for technical profile selection
// ============================================================================

interface TpRendererProps {
    stepNode: FlowNode;
    selection: Selection;
    dispatch: (action: SelectionAction) => void;
}

export function TpRenderer({ stepNode, selection, dispatch }: TpRendererProps) {
    const stepData = stepNode.data as StepFlowData;
    const tpId = selection.itemId ?? "";
    const tpNode = findChildNode(stepNode, FlowNodeType.TechnicalProfile, tpId);
    const tpData = tpNode?.data as TechnicalProfileFlowData | undefined;

    // Convert claimsSnapshot to output claims format
    const outputClaims = tpData?.claimsSnapshot
        ? Object.entries(tpData.claimsSnapshot).map(([claimType, value]) => ({ claimType, value }))
        : undefined;

    // Extract ClaimsTransformationFlowData from TP's CT children
    const cts = (tpNode?.children
        .filter((c) => c.type === FlowNodeType.ClaimsTransformation)
        .map((c) => c.data as ClaimsTransformationFlowData)) ?? [];

    // Build validation TP IDs from TP's nested TP children
    const validationTps = tpNode?.children
        .filter((c) => c.type === FlowNodeType.TechnicalProfile)
        .map((c) => (c.data as TechnicalProfileFlowData).technicalProfileId) ?? [];

    // Breadcrumb segments
    const segments: BreadcrumbSegment[] = [
        {
            label: `Step ${stepData.stepOrder}`,
            onClick: () => dispatch({ type: "select-step", stepIndex: selection.stepIndex }),
        },
        { label: tpId },
    ];

    return (
        <div className="space-y-3">
            {/* 1. Sticky header */}
            <InspectorHeader
                icon={<GearIcon className="w-4 h-4" />}
                name={tpId}
                result={stepData.result}
                duration={stepData.duration}
                statebag={stepNode.context.statebagSnapshot}
            />

            {/* 2. Error banner */}
            {stepData.errorMessage && (
                <div className="px-3">
                    <InspectorErrorBanner
                        message={stepData.errorMessage}
                        hResult={stepData.errorHResult}
                    />
                </div>
            )}

            {/* 3. Breadcrumb */}
            <div className="px-3">
                <InspectorBreadcrumb segments={segments} />
            </div>

            {/* 4. Metadata badges */}
            <div className="flex flex-wrap gap-1.5 px-3">
                {tpData?.providerType && (
                    <Badge variant="outline" className="text-xs font-mono">
                        {tpData.providerType}
                    </Badge>
                )}
                {tpData?.protocolType && (
                    <Badge variant="outline" className="text-xs font-mono">
                        {tpData.protocolType}
                    </Badge>
                )}
                <Badge variant="outline" className="text-xs font-mono">
                    Step {stepData.stepOrder}
                </Badge>
            </div>

            {/* 5. Provider details */}
            {tpData && (
                <div className="px-3">
                    <ProviderDetailsSection
                        providerType={tpData.providerType}
                        protocolType={tpData.protocolType}
                    />
                </div>
            )}

            {/* 6. Claims transformations list */}
            {cts.length > 0 && (
                <div className="px-3">
                    <CtListSection claimsTransformations={cts} />
                </div>
            )}

            {/* 7. Claims I/O (snapshot as output claims) */}
            <div className="px-3">
                <ClaimsIoSection outputClaims={outputClaims} />
            </div>

            {/* 8. Validation TPs */}
            {validationTps.length > 0 && (
                <div className="px-3">
                    <ValidationTpsSection validationTps={validationTps} />
                </div>
            )}

            {/* 9. Statebag */}
            <div className="px-3">
                <StatebagSection statebag={stepNode.context.statebagSnapshot} />
            </div>

            {/* 10. Raw data */}
            <div className="px-3">
                <RawDataToggle data={tpNode?.data ?? stepNode.data} />
            </div>
        </div>
    );
}
