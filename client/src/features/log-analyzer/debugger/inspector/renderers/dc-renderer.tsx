import { AppWindowIcon } from "@phosphor-icons/react";
import type { FlowNode } from "@/types/flow-node";
import {
    FlowNodeType,
    type StepFlowData,
    type DisplayControlFlowData,
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
    ClaimsIoSection,
    CtListSection,
    ValidationTpsSection,
    StatebagSection,
} from "../sections";
import { RawDataToggle } from "../raw-data-toggle";

// ============================================================================
// DC Renderer — type-adaptive renderer for display control selection
// ============================================================================

interface DcRendererProps {
    stepNode: FlowNode;
    selection: Selection;
    dispatch: (action: SelectionAction) => void;
}

export function DcRenderer({ stepNode, selection, dispatch }: DcRendererProps) {
    const stepData = stepNode.data as StepFlowData;
    const dcId = (selection.metadata?.displayControlId as string) ?? "";
    const dcNode = findChildNode(stepNode, FlowNodeType.DisplayControl, dcId);
    const dcData = dcNode?.data as DisplayControlFlowData | undefined;

    // Claims from claimMappings
    const claims = dcData?.claimMappings?.map((m) => ({
        claimType: m.policyClaimType,
        value: m.partnerClaimType,
    }));

    // Extract ClaimsTransformationFlowData from DC's nested TP → CT children
    const cts =
        dcNode?.children
            .filter((c) => c.type === FlowNodeType.TechnicalProfile)
            .flatMap((tp) =>
                tp.children
                    .filter((c) => c.type === FlowNodeType.ClaimsTransformation)
                    .map((c) => c.data as ClaimsTransformationFlowData),
            ) ?? [];

    // Validation-type TPs from DC's TP children
    const validationTps =
        dcNode?.children
            .filter((c) => c.type === FlowNodeType.TechnicalProfile)
            .map((c) => (c.data as TechnicalProfileFlowData).technicalProfileId) ?? [];

    // Primary TP for breadcrumb (first TP in step)
    const mainTpId = stepData.technicalProfileNames[0];

    // Build breadcrumb segments
    const segments: BreadcrumbSegment[] = [
        {
            label: `Step ${stepData.stepOrder}`,
            onClick: () => dispatch({ type: "select-step", stepIndex: selection.stepIndex }),
        },
    ];
    if (mainTpId) {
        segments.push({
            label: mainTpId,
            onClick: () =>
                dispatch({ type: "select-tp", stepIndex: selection.stepIndex, tpId: mainTpId }),
        });
    }
    segments.push({ label: dcId });

    return (
        <div className="space-y-3">
            {/* 1. Header */}
            <InspectorHeader
                icon={<AppWindowIcon className="w-4 h-4" />}
                name={dcId}
                result={stepData.result}
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

            {/* 4. Claims I/O */}
            {claims && claims.length > 0 && (
                <div className="px-3">
                    <ClaimsIoSection inputClaims={claims} />
                </div>
            )}

            {/* 5. CT list from nested TPs */}
            {cts.length > 0 && (
                <div className="px-3">
                    <CtListSection claimsTransformations={cts} />
                </div>
            )}

            {/* 6. Validation TPs */}
            {validationTps.length > 0 && (
                <div className="px-3">
                    <ValidationTpsSection validationTps={validationTps} />
                </div>
            )}

            {/* 7. Statebag */}
            <div className="px-3">
                <StatebagSection statebag={stepNode.context.statebagSnapshot} />
            </div>

            {/* 8. Raw data */}
            <div className="px-3">
                <RawDataToggle data={dcNode?.data ?? stepNode.data} />
            </div>
        </div>
    );
}
