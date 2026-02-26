/**
 * FlowTree ↔ TraceStep Sync
 *
 * Syncs post-processor mutations (duration, selectedOption, result) from
 * TraceStep[] back into the FlowNode tree. This bridge exists because
 * post-processors still mutate TraceStep objects. Will be removed when
 * post-processors operate on FlowNode directly.
 */

import type { FlowNode } from "@/types/flow-node";
import type { StepFlowData, HomeRealmDiscoveryFlowData } from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";
import type { TraceStep } from "@/types/trace";

/**
 * Walks the FlowNode tree and syncs mutable fields from TraceStep[]
 * back to FlowNode data. Call after all post-processors have run.
 *
 * Synced fields:
 * - StepFlowData.duration (from StepDurationPostProcessor)
 * - StepFlowData.selectedOption (from HrdSelectionResolverPostProcessor)
 * - StepFlowData.result (if post-processor changes it)
 * - HomeRealmDiscoveryFlowData.selectedOption (from HrdSelectionResolverPostProcessor)
 */
export function syncFlowTreeFromSteps(flowTree: FlowNode, traceSteps: TraceStep[]): void {
    walkAndSync(flowTree, traceSteps);
}

function walkAndSync(node: FlowNode, traceSteps: TraceStep[]): void {
    if (node.data.type === FlowNodeType.Step) {
        const stepData = node.data as StepFlowData;
        const step = traceSteps[stepData.stepIndex];

        if (step) {
            // Sync mutable fields set by post-processors
            stepData.duration = step.duration;
            stepData.selectedOption = step.selectedOption;
            stepData.result = step.result;

            // Sync HRD child if present
            syncHrdChild(node, step);
        }
    }

    for (const child of node.children) {
        walkAndSync(child, traceSteps);
    }
}

function syncHrdChild(stepNode: FlowNode, step: TraceStep): void {
    const hrdChild = stepNode.children.find(
        (c) => c.type === FlowNodeType.HomeRealmDiscovery,
    );

    if (hrdChild && hrdChild.data.type === FlowNodeType.HomeRealmDiscovery) {
        (hrdChild.data as HomeRealmDiscoveryFlowData).selectedOption = step.selectedOption;
    }
}
