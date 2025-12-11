/**
 * Step Duration Post-Processor
 *
 * Calculates the duration of each step based on the timestamp of the next step.
 * Duration represents the time from when a step started until the next step began.
 *
 * Note: The last step has no duration (undefined) since there's no subsequent step.
 */

import { BasePostProcessor, type PostProcessorContext, type PostProcessorResult } from "./base-post-processor";

export class StepDurationPostProcessor extends BasePostProcessor {
    readonly name = "StepDuration";

    process(context: PostProcessorContext): PostProcessorResult {
        const { traceSteps } = context;

        for (let i = 0; i < traceSteps.length - 1; i++) {
            const currentStep = traceSteps[i];
            const nextStep = traceSteps[i + 1];

            currentStep.duration =
                nextStep.timestamp.getTime() - currentStep.timestamp.getTime();
        }

        // Last step has no duration (undefined by default)

        return this.success();
    }
}

/**
 * Factory function for creating StepDurationPostProcessor instances.
 */
export function createStepDurationPostProcessor(): StepDurationPostProcessor {
    return new StepDurationPostProcessor();
}
