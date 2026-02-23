import { ShuffleAngularIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import type { TraceStep } from "@/types/trace";
import type { Selection, SelectionAction } from "../../types";
import { InspectorHeader } from "../inspector-header";
import { InspectorBreadcrumb } from "../inspector-breadcrumb";
import {
    AvailableProvidersSection,
    StatebagSection,
} from "../sections";
import { RawDataToggle } from "../raw-data-toggle";

// ============================================================================
// HRD Renderer — type-adaptive renderer for Home Realm Discovery selection
// ============================================================================

interface HrdRendererProps {
    step: TraceStep;
    selection: Selection;
    dispatch: (action: SelectionAction) => void;
}

export function HrdRenderer({ step, selection, dispatch }: HrdRendererProps) {
    return (
        <div className="space-y-3">
            {/* 1. Header */}
            <InspectorHeader
                icon={<ShuffleAngularIcon className="w-4 h-4" />}
                name="Home Realm Discovery"
                result={step.result}
                statebag={step.statebagSnapshot}
            />

            {/* 2. Breadcrumb */}
            <div className="px-3">
                <InspectorBreadcrumb
                    segments={[
                        {
                            label: `Step ${step.stepOrder}`,
                            onClick: () => dispatch({ type: "select-step", stepIndex: selection.stepIndex }),
                        },
                        { label: "HRD" },
                    ]}
                />
            </div>

            {/* 3. Metadata badges */}
            <div className="flex flex-wrap gap-1.5 px-3">
                {step.uiSettings?.pageType && (
                    <Badge variant="outline" className="text-xs font-mono">
                        {step.uiSettings.pageType}
                    </Badge>
                )}
                {step.uiSettings?.contentDefinition && (
                    <Badge variant="outline" className="text-xs font-mono">
                        {step.uiSettings.contentDefinition}
                    </Badge>
                )}
                {step.uiSettings?.language && (
                    <Badge variant="outline" className="text-xs font-mono">
                        {step.uiSettings.language}
                    </Badge>
                )}
            </div>

            {/* 4. Available providers */}
            <div className="px-3">
                <AvailableProvidersSection
                    providers={step.selectableOptions}
                    selectedOption={step.selectedOption}
                />
            </div>

            {/* 5. Statebag */}
            <div className="px-3">
                <StatebagSection statebag={step.statebagSnapshot} />
            </div>

            {/* 6. Raw data */}
            <div className="px-3">
                <RawDataToggle data={step} />
            </div>
        </div>
    );
}
