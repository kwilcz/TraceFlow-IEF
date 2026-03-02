import { ArrowsLeftRightIcon } from "@phosphor-icons/react";
import type { FlowNode } from "@/types/flow-node";
import {
    FlowNodeType,
    type StepFlowData,
    type ClaimsTransformationFlowData,
    type TechnicalProfileFlowData,
} from "@/types/flow-node";
import { findChildNode, findParentNode } from "@/lib/trace/domain/flow-node-utils";
import type { Selection, SelectionAction } from "../../types";
import { InspectorHeader } from "../inspector-header";
import { InspectorBreadcrumb } from "../inspector-breadcrumb";
import type { BreadcrumbSegment } from "../inspector-breadcrumb";
import {
    ClaimsIoSection,
    StatebagSection,
} from "../sections";
import { RawDataToggle } from "../raw-data-toggle";

// ============================================================================
// CT Renderer — type-adaptive renderer for claims transformation selection
// ============================================================================

interface CtRendererProps {
    stepNode: FlowNode;
    selection: Selection;
    dispatch: (action: SelectionAction) => void;
}

export function CtRenderer({ stepNode, selection, dispatch }: CtRendererProps) {
    const stepData = stepNode.data as StepFlowData;
    const ctId = selection.itemId ?? "";

    // Find CT node recursively (could be under step or under a TP child)
    const ctNode = findChildNode(stepNode, FlowNodeType.ClaimsTransformation, ctId);
    const ctData = ctNode?.data as ClaimsTransformationFlowData | undefined;

    // Find parent TP for breadcrumb — if CT's parent is a TP node
    const parentNode = ctNode ? findParentNode(stepNode, ctNode) : null;
    const parentTp =
        parentNode?.type === FlowNodeType.TechnicalProfile
            ? (parentNode.data as TechnicalProfileFlowData)
            : null;
    const parentTpId = parentTp?.technicalProfileId;

    // Build breadcrumb segments
    const segments: BreadcrumbSegment[] = [
        {
            label: `Step ${stepData.stepOrder}`,
            onClick: () => dispatch({ type: "select-step", nodeId: selection.nodeId }),
        },
    ];
    if (parentTpId) {
        segments.push({
            label: parentTpId,
            onClick: () => dispatch({ type: "select-tp", nodeId: selection.nodeId, tpId: parentTpId }),
        });
    }
    segments.push({ label: ctId });

    return (
        <div className="space-y-3">
            {/* 1. Header */}
            <InspectorHeader
                icon={<ArrowsLeftRightIcon className="w-4 h-4" />}
                name={ctId}
                result={stepData.result}
                statebag={stepNode.context.statebagSnapshot}
            />

            {/* 2. Breadcrumb */}
            <div className="px-3">
                <InspectorBreadcrumb segments={segments} />
            </div>

            {/* 3. Claims I/O */}
            {ctData && (
                <div className="px-3">
                    <ClaimsIoSection
                        inputClaims={[...ctData.inputClaims]}
                        inputParameters={[...ctData.inputParameters]}
                        outputClaims={[...ctData.outputClaims]}
                    />
                </div>
            )}

            {/* 4. Statebag */}
            <div className="px-3">
                <StatebagSection statebag={stepNode.context.statebagSnapshot} />
            </div>

            {/* 5. Raw data */}
            <div className="px-3">
                <RawDataToggle data={ctNode?.data ?? stepNode.data} />
            </div>
        </div>
    );
}
