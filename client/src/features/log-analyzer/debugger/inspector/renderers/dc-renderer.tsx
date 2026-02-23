import { AppWindowIcon } from "@phosphor-icons/react";
import type { TraceStep } from "@/types/trace";
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
    step: TraceStep;
    selection: Selection;
    dispatch: (action: SelectionAction) => void;
}

export function DcRenderer({ step, selection, dispatch }: DcRendererProps) {
    const dcId = (selection.metadata?.displayControlId as string) ?? "";
    const dcActionName = (selection.metadata?.action as string) ?? undefined;
    const dcAction = step.displayControlActions.find(
        (a) => a.displayControlId === dcId && (!dcActionName || a.action === dcActionName),
    );

    // Claims from claimMappings
    const claims = dcAction?.claimMappings?.map((m) => ({
        claimType: m.policyClaimType,
        value: m.partnerClaimType,
    }));

    // CTs from nested TPs
    const cts =
        dcAction?.technicalProfiles?.flatMap((tp) => tp.claimsTransformations ?? []) ?? [];

    // Validation-type TPs from nested TPs (all DC TPs treated as validation candidates)
    const validationTps =
        dcAction?.technicalProfiles?.map((tp) => tp.technicalProfileId) ?? [];

    // Primary TP for breadcrumb (first TP in step)
    const mainTpId = step.technicalProfiles[0];

    // Build breadcrumb segments
    const segments: BreadcrumbSegment[] = [
        {
            label: `Step ${step.stepOrder}`,
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
                result={step.result}
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
                <StatebagSection statebag={step.statebagSnapshot} />
            </div>

            {/* 8. Raw data */}
            <div className="px-3">
                <RawDataToggle data={step} />
            </div>
        </div>
    );
}
