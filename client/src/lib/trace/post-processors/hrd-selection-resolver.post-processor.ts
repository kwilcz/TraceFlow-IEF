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

        for (let i = 0; i < traceSteps.length; i++) {
            const currentStep = traceSteps[i];

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

            // First, check the current step's own TPs — when CTP resolves to one
            // of the selectable options in the same step (e.g., CombinedSigninAndSignup
            // flows where the TP is set within the same orchestration step)
            if (this.resolveFromTechnicalProfiles(currentStep, currentStep)) {
                continue;
            }

            // Fall back to the next step's triggered TP
            const nextStep = traceSteps[i + 1];
            if (nextStep) {
                this.resolveFromTechnicalProfiles(currentStep, nextStep);
            }
        }

        return this.success();
    }

    /**
     * Attempts to resolve the selected option by matching a step's TPs
     * against the current step's selectable options.
     * Returns true if a match was found.
     */
    private resolveFromTechnicalProfiles(
        currentStep: { selectableOptions: string[]; selectedOption?: string },
        sourceStep: { technicalProfiles: string[] }
    ): boolean {
        for (const tp of sourceStep.technicalProfiles) {
            if (currentStep.selectableOptions.includes(tp)) {
                currentStep.selectedOption = tp;
                return true;
            }
        }
        return false;
    }
}

/**
 * Factory function for creating HrdSelectionResolverPostProcessor instances.
 */
export function createHrdSelectionResolverPostProcessor(): HrdSelectionResolverPostProcessor {
    return new HrdSelectionResolverPostProcessor();
}
