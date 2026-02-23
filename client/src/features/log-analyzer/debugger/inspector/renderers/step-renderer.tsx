import { ListNumbersIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import type { TraceStep } from "@/types/trace";
import type { Selection, SelectionAction } from "../../types";
import { InspectorHeader } from "../inspector-header";
import { InspectorErrorBanner } from "../inspector-error-banner";
import { InspectorBreadcrumb } from "../inspector-breadcrumb";
import {
    ComponentsSection,
    StatebagSection,
} from "../sections";
import { RawDataToggle } from "../raw-data-toggle";

// ============================================================================
// Step Renderer — type-adaptive renderer for step-level selection
// ============================================================================

interface StepRendererProps {
    step: TraceStep;
    selection: Selection;
    dispatch: (action: SelectionAction) => void;
}

export function StepRenderer({ step }: StepRendererProps) {
    const primaryTP = step.technicalProfiles[0] || step.actionHandler || "Unknown";
    const stepLabel = `Step ${step.stepOrder} — ${primaryTP}`;

    return (
        <div className="space-y-3">
            {/* 1. Sticky header */}
            <InspectorHeader
                icon={<ListNumbersIcon className="w-4 h-4" />}
                name={stepLabel}
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
                <InspectorBreadcrumb
                    segments={[
                        { label: step.currentJourneyName },
                        { label: `Step ${step.stepOrder}` },
                    ]}
                />
            </div>

            {/* 4. Metadata badges */}
            <div className="flex flex-wrap gap-1.5 px-3">
                <Badge variant="outline" className="text-xs font-mono">
                    {step.eventType}
                </Badge>
                {step.isInteractiveStep && (
                    <Badge variant="outline" className="text-xs font-mono">
                        Interactive 🖥
                    </Badge>
                )}
                {step.isFinalStep && (
                    <Badge variant="outline" className="text-xs font-mono">
                        Final
                    </Badge>
                )}
                {step.uiSettings?.pageType && (
                    <Badge variant="outline" className="text-xs font-mono">
                        {step.uiSettings.pageType}
                    </Badge>
                )}
                {step.uiSettings?.language && (
                    <Badge variant="outline" className="text-xs font-mono">
                        {step.uiSettings.language}
                    </Badge>
                )}
                <Badge variant="outline" className="text-xs font-mono">
                    {new Date(step.timestamp).toLocaleTimeString()}
                </Badge>
            </div>

            {/* 5. Components */}
            <div className="px-3">
                <ComponentsSection
                    technicalProfiles={step.technicalProfiles}
                    claimsTransformations={step.claimsTransformations}
                    displayControlActions={step.displayControlActions}
                    selectableOptions={step.selectableOptions}
                    backendApiCalls={step.backendApiCalls}
                    selectedOption={step.selectedOption}
                />
            </div>

            {/* 6. Statebag */}
            <div className="px-3">
                <StatebagSection statebag={step.statebagSnapshot} />
            </div>

            {/* 7. Raw data */}
            <div className="px-3">
                <RawDataToggle data={step} />
            </div>
        </div>
    );
}
