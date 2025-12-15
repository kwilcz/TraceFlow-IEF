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
 * - Look at the NEXT step's `technicalProfiles`
 * - Find the TP that matches one of the `selectableOptions`
 * - Update `selectedOption` to the matching TP ID
 */

import { BasePostProcessor, type PostProcessorContext, type PostProcessorResult } from "./base-post-processor";

export class HrdSelectionResolverPostProcessor extends BasePostProcessor {
    readonly name = "HrdSelectionResolver";

    process(context: PostProcessorContext): PostProcessorResult {
        const { traceSteps } = context;

        for (let i = 0; i < traceSteps.length - 1; i++) {
            const currentStep = traceSteps[i];
            const nextStep = traceSteps[i + 1];

            // Skip non-HRD steps (HRD steps have multiple selectable options)
            if (currentStep.selectableOptions.length < 2) {
                continue;
            }

            // Check if selectedOption already matches a selectableOption
            const alreadyResolved = currentStep.selectableOptions.includes(
                currentStep.selectedOption || ""
            );

            if (alreadyResolved) {
                continue;
            }

            // Look at next step's triggered TP to find the match
            // The next step should have exactly one TP that matches a selectableOption
            this.resolveFromNextStep(currentStep, nextStep);
        }

        return this.success();
    }

    /**
     * Attempts to resolve the selected option by matching next step's TPs
     * against current step's selectable options.
     */
    private resolveFromNextStep(
        currentStep: { selectableOptions: string[]; selectedOption?: string },
        nextStep: { technicalProfiles: string[] }
    ): void {
        for (const tp of nextStep.technicalProfiles) {
            if (currentStep.selectableOptions.includes(tp)) {
                // Found the match - update selectedOption to actual TP ID
                currentStep.selectedOption = tp;
                return;
            }
        }
    }
}

/**
 * Factory function for creating HrdSelectionResolverPostProcessor instances.
 */
export function createHrdSelectionResolverPostProcessor(): HrdSelectionResolverPostProcessor {
    return new HrdSelectionResolverPostProcessor();
}
