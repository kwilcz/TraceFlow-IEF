import { ShuffleAngularIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import type { FlowNode } from "@/types/flow-node";
import {
    FlowNodeType,
    type StepFlowData,
    type HomeRealmDiscoveryFlowData,
} from "@/types/flow-node";
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
    stepNode: FlowNode;
    selection: Selection;
    dispatch: (action: SelectionAction) => void;
}

export function HrdRenderer({ stepNode, selection, dispatch }: HrdRendererProps) {
    const stepData = stepNode.data as StepFlowData;

    // Find the HRD child node
    const hrdNode = stepNode.children.find((c) => c.type === FlowNodeType.HomeRealmDiscovery);
    const hrdData = hrdNode?.data as HomeRealmDiscoveryFlowData | undefined;

    return (
        <div className="space-y-3">
            {/* 1. Header */}
            <InspectorHeader
                icon={<ShuffleAngularIcon className="w-4 h-4" />}
                name="Home Realm Discovery"
                result={stepData.result}
                statebag={stepNode.context.statebagSnapshot}
            />

            {/* 2. Breadcrumb */}
            <div className="px-3">
                <InspectorBreadcrumb
                    segments={[
                        {
                            label: `Step ${stepData.stepOrder}`,
                            onClick: () => dispatch({ type: "select-step", nodeId: selection.nodeId }),
                        },
                        { label: "HRD" },
                    ]}
                />
            </div>

            {/* 3. Metadata badges */}
            <div className="flex flex-wrap gap-1.5 px-3">
                {hrdData?.uiSettings?.pageType && (
                    <Badge variant="outline" className="text-xs font-mono">
                        {hrdData.uiSettings.pageType}
                    </Badge>
                )}
                {hrdData?.uiSettings?.contentDefinition && (
                    <Badge variant="outline" className="text-xs font-mono">
                        {hrdData.uiSettings.contentDefinition}
                    </Badge>
                )}
                {hrdData?.uiSettings?.language && (
                    <Badge variant="outline" className="text-xs font-mono">
                        {hrdData.uiSettings.language}
                    </Badge>
                )}
            </div>

            {/* 4. Available providers */}
            <div className="px-3">
                <AvailableProvidersSection
                    providers={hrdData?.selectableOptions ?? []}
                    selectedOption={hrdData?.selectedOption}
                />
            </div>

            {/* 5. Statebag */}
            <div className="px-3">
                <StatebagSection statebag={stepNode.context.statebagSnapshot} />
            </div>

            {/* 6. Raw data */}
            <div className="px-3">
                <RawDataToggle data={hrdNode?.data ?? stepNode.data} />
            </div>
        </div>
    );
}
