import { GearIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import type { TraceStep } from "@/types/trace";
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
    step: TraceStep;
    selection: Selection;
    dispatch: (action: SelectionAction) => void;
}

export function TpRenderer({ step, selection, dispatch }: TpRendererProps) {
    const tpId = selection.itemId ?? "";
    const tpDetail = step.technicalProfileDetails?.find((d) => d.id === tpId);

    // Convert claimsSnapshot to output claims format
    const outputClaims = tpDetail?.claimsSnapshot
        ? Object.entries(tpDetail.claimsSnapshot).map(([claimType, value]) => ({ claimType, value }))
        : undefined;

    // Breadcrumb segments
    const segments: BreadcrumbSegment[] = [
        {
            label: `Step ${step.stepOrder}`,
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
                result={step.result}
                duration={step.duration}
                statebag={step.statebagSnapshot}
            />

            {/* 2. Error banner */}
            {step.errorMessage && (
                <div className="px-3">
                    <InspectorErrorBanner
                        message={step.errorMessage}
                        hResult={step.errorHResult}
                    />
                </div>
            )}

            {/* 3. Breadcrumb */}
            <div className="px-3">
                <InspectorBreadcrumb segments={segments} />
            </div>

            {/* 4. Metadata badges */}
            <div className="flex flex-wrap gap-1.5 px-3">
                {tpDetail?.providerType && (
                    <Badge variant="outline" className="text-xs font-mono">
                        {tpDetail.providerType}
                    </Badge>
                )}
                {tpDetail?.protocolType && (
                    <Badge variant="outline" className="text-xs font-mono">
                        {tpDetail.protocolType}
                    </Badge>
                )}
                <Badge variant="outline" className="text-xs font-mono">
                    Step {step.stepOrder}
                </Badge>
            </div>

            {/* 5. Provider details */}
            {tpDetail && (
                <div className="px-3">
                    <ProviderDetailsSection
                        providerType={tpDetail.providerType}
                        protocolType={tpDetail.protocolType}
                    />
                </div>
            )}

            {/* 6. Claims transformations list */}
            {tpDetail?.claimsTransformations && tpDetail.claimsTransformations.length > 0 && (
                <div className="px-3">
                    <CtListSection claimsTransformations={tpDetail.claimsTransformations} />
                </div>
            )}

            {/* 7. Claims I/O (snapshot as output claims) */}
            <div className="px-3">
                <ClaimsIoSection outputClaims={outputClaims} />
            </div>

            {/* 8. Validation TPs */}
            {step.validationTechnicalProfiles && step.validationTechnicalProfiles.length > 0 && (
                <div className="px-3">
                    <ValidationTpsSection validationTps={step.validationTechnicalProfiles} />
                </div>
            )}

            {/* 9. Statebag */}
            <div className="px-3">
                <StatebagSection statebag={step.statebagSnapshot} />
            </div>

            {/* 10. Raw data */}
            <div className="px-3">
                <RawDataToggle data={step} />
            </div>
        </div>
    );
}
