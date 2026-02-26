import { ListNumbersIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import type { FlowNode } from "@/types/flow-node";
import {
    FlowNodeType,
    type StepFlowData,
    type DisplayControlFlowData,
} from "@/types/flow-node";
import type { Selection, SelectionAction } from "../../types";
import { InspectorHeader } from "../inspector-header";
import { InspectorErrorBanner } from "../inspector-error-banner";
import { InspectorBreadcrumb } from "../inspector-breadcrumb";
import {
    ComponentsSection,
    StatebagSection,
} from "../sections";
import { RawDataToggle } from "../raw-data-toggle";
import { getStepTpNames, getStepCtNames, isStepFinal, isStepInteractive } from "@/lib/trace/domain/flow-node-utils";

// ============================================================================
// Step Renderer — type-adaptive renderer for step-level selection
// ============================================================================

interface StepRendererProps {
    stepNode: FlowNode;
    selection: Selection;
    dispatch: (action: SelectionAction) => void;
}

export function StepRenderer({ stepNode }: StepRendererProps) {
    const stepData = stepNode.data as StepFlowData;
    const tpNames = getStepTpNames(stepNode);
    const primaryTP = tpNames[0] || stepData.actionHandler || "Unknown";
    const stepLabel = `Step ${stepData.stepOrder} — ${primaryTP}`;

    // Extract DisplayControlFlowData from DC children for ComponentsSection
    const dcActions: DisplayControlFlowData[] = stepNode.children
        .filter((c) => c.type === FlowNodeType.DisplayControl)
        .map((c) => c.data as DisplayControlFlowData);

    return (
        <div className="space-y-3">
            {/* 1. Sticky header */}
            <InspectorHeader
                icon={<ListNumbersIcon className="w-4 h-4" />}
                name={stepLabel}
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
                <InspectorBreadcrumb
                    segments={[
                        { label: stepData.currentJourneyName },
                        { label: `Step ${stepData.stepOrder}` },
                    ]}
                />
            </div>

            {/* 4. Metadata badges */}
            <div className="flex flex-wrap gap-1.5 px-3">
                <Badge variant="outline" className="text-xs font-mono">
                    {stepNode.context.eventType}
                </Badge>
                {isStepInteractive(stepNode) && (
                    <Badge variant="outline" className="text-xs font-mono">
                        Interactive 🖥
                    </Badge>
                )}
                {isStepFinal(stepData) && (
                    <Badge variant="outline" className="text-xs font-mono">
                        Final
                    </Badge>
                )}
                {stepData.uiSettings?.pageType && (
                    <Badge variant="outline" className="text-xs font-mono">
                        {stepData.uiSettings.pageType}
                    </Badge>
                )}
                {stepData.uiSettings?.language && (
                    <Badge variant="outline" className="text-xs font-mono">
                        {stepData.uiSettings.language}
                    </Badge>
                )}
                <Badge variant="outline" className="text-xs font-mono">
                    {new Date(stepNode.context.timestamp).toLocaleTimeString()}
                </Badge>
            </div>

            {/* 5. Components */}
            <div className="px-3">
                <ComponentsSection
                    technicalProfiles={tpNames}
                    claimsTransformations={getStepCtNames(stepNode)}
                    displayControlActions={dcActions}
                    selectableOptions={stepData.selectableOptions}
                    backendApiCalls={stepData.backendApiCalls}
                    selectedOption={stepData.selectedOption}
                />
            </div>

            {/* 6. Statebag */}
            <div className="px-3">
                <StatebagSection statebag={stepNode.context.statebagSnapshot} />
            </div>

            {/* 7. Raw data */}
            <div className="px-3">
                <RawDataToggle data={stepNode.data} />
            </div>
        </div>
    );
}
