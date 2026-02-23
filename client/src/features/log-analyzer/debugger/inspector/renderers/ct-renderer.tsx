import { ArrowsLeftRightIcon } from "@phosphor-icons/react";
import type { TraceStep } from "@/types/trace";
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
    step: TraceStep;
    selection: Selection;
    dispatch: (action: SelectionAction) => void;
}

export function CtRenderer({ step, selection, dispatch }: CtRendererProps) {
    const ctId = selection.itemId ?? "";

    // Find ctDetail: first in step-level, then in TP-level
    const ctDetail =
        step.claimsTransformationDetails.find((ct) => ct.id === ctId) ??
        step.technicalProfileDetails
            ?.flatMap((tp) => tp.claimsTransformations ?? [])
            .find((ct) => ct.id === ctId);

    // Find parent TP for breadcrumb
    const parentTp = step.technicalProfileDetails?.find((tp) =>
        tp.claimsTransformations?.some((ct) => ct.id === ctId),
    );

    // Build breadcrumb segments
    const segments: BreadcrumbSegment[] = [
        {
            label: `Step ${step.stepOrder}`,
            onClick: () => dispatch({ type: "select-step", stepIndex: selection.stepIndex }),
        },
    ];
    if (parentTp) {
        segments.push({
            label: parentTp.id,
            onClick: () => dispatch({ type: "select-tp", stepIndex: selection.stepIndex, tpId: parentTp.id }),
        });
    }
    segments.push({ label: ctId });

    return (
        <div className="space-y-3">
            {/* 1. Header */}
            <InspectorHeader
                icon={<ArrowsLeftRightIcon className="w-4 h-4" />}
                name={ctId}
                result={step.result}
                statebag={step.statebagSnapshot}
            />

            {/* 2. Breadcrumb */}
            <div className="px-3">
                <InspectorBreadcrumb segments={segments} />
            </div>

            {/* 3. Claims I/O */}
            {ctDetail && (
                <div className="px-3">
                    <ClaimsIoSection
                        inputClaims={ctDetail.inputClaims}
                        inputParameters={ctDetail.inputParameters}
                        outputClaims={ctDetail.outputClaims}
                    />
                </div>
            )}

            {/* 4. Statebag */}
            <div className="px-3">
                <StatebagSection statebag={step.statebagSnapshot} />
            </div>

            {/* 5. Raw data */}
            <div className="px-3">
                <RawDataToggle data={step} />
            </div>
        </div>
    );
}
