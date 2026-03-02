/**
 * HRD Selection Resolver Post-Processor
 *
 * Resolves the mismatch between TAGE (ClaimsExchange ID) and actual TP IDs
 * in Home Realm Discovery (HRD) flows.
 *
 * Problem:
 * - HRD step has `selectableOptions` containing TP IDs (e.g., "AADAdeccoDE-OpenIdConnect")
 * - HRD step has `selectedOption` as TAGE (e.g., "MicrosoftAccountExchange")
 * - These don't match, so the UI can't highlight the correct option
 *
 * Solution:
 * - Look at the current or NEXT step's TP children
 * - Find the TP that matches one of the `selectableOptions`
 * - Update `selectedOption` to the matching TP ID
 */

import { collectStepNodes, getStepTpNames } from "@/lib/trace/domain/flow-node-utils";
import type { FlowNode, StepFlowData, HomeRealmDiscoveryFlowData } from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";

import { BasePostProcessor, type PostProcessorContext, type PostProcessorResult } from "./base-post-processor";

export class HrdSelectionResolverPostProcessor extends BasePostProcessor {
    readonly name = "HrdSelectionResolver";

    process(context: PostProcessorContext): PostProcessorResult {
        const stepNodes = collectStepNodes(context.flowTree);

        for (let i = 0; i < stepNodes.length; i++) {
            const step = stepNodes[i];
            const stepData = step.data as StepFlowData;

            // Skip non-HRD steps (HRD steps have multiple selectable options)
            if (stepData.selectableOptions.length < 2) {
                continue;
            }

            // Check if selectedOption already matches a selectableOption
            const alreadyResolved = stepData.selectableOptions.includes(
                stepData.selectedOption || ""
            );

            if (alreadyResolved) {
                continue;
            }

            // First, check the current step's own TPs — when CTP resolves to one
            // of the selectable options in the same step (e.g., CombinedSigninAndSignup
            // flows where the TP is set within the same orchestration step)
            let resolved = this.resolveFromTpChildren(stepData, step);

            // Fall back to the next step's TP children
            if (!resolved) {
                const nextStep = stepNodes[i + 1];
                if (nextStep) {
                    resolved = this.resolveFromTpChildren(stepData, nextStep);
                }
            }

            // Sync resolved option to the HRD child node
            if (resolved) {
                this.syncHrdChild(step, stepData.selectedOption);
            }
        }

        return this.success();
    }

    /**
     * Attempts to resolve the selected option by matching a step's TP children
     * against the current step's selectable options.
     * Returns true if a match was found.
     */
    private resolveFromTpChildren(
        stepData: StepFlowData,
        sourceStep: FlowNode
    ): boolean {
        for (const tpId of getStepTpNames(sourceStep)) {
            if (stepData.selectableOptions.includes(tpId)) {
                stepData.selectedOption = tpId;
                return true;
            }
        }
        return false;
    }

    /**
     * Syncs the resolved selectedOption to the HRD child FlowNode.
     */
    private syncHrdChild(stepNode: FlowNode, selectedOption: string | undefined): void {
        const hrdChild = stepNode.children.find(
            (c) => c.type === FlowNodeType.HomeRealmDiscovery
        );

        if (hrdChild && hrdChild.data.type === FlowNodeType.HomeRealmDiscovery) {
            (hrdChild.data as HomeRealmDiscoveryFlowData).selectedOption = selectedOption;
        }
    }
}

/**
 * Factory function for creating HrdSelectionResolverPostProcessor instances.
 */
export function createHrdSelectionResolverPostProcessor(): HrdSelectionResolverPostProcessor {
    return new HrdSelectionResolverPostProcessor();
}
