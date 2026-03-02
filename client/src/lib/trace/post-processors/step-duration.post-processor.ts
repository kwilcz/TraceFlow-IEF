/**
 * Step Duration Post-Processor
 *
 * Calculates the duration of each step based on the timestamp of the next step.
 * Duration represents the time from when a step started until the next step began.
 *
 * Note: The last step has no duration (undefined) since there's no subsequent step.
 */

import { collectStepNodes } from "@/lib/trace/domain/flow-node-utils";
import type { StepFlowData } from "@/types/flow-node";

import { BasePostProcessor, type PostProcessorContext, type PostProcessorResult } from "./base-post-processor";

export class StepDurationPostProcessor extends BasePostProcessor {
    readonly name = "StepDuration";

    process(context: PostProcessorContext): PostProcessorResult {
        const stepNodes = collectStepNodes(context.flowTree);

        for (let i = 0; i < stepNodes.length - 1; i++) {
            const current = stepNodes[i];
            const next = stepNodes[i + 1];

            const duration =
                next.context.timestamp.getTime() - current.context.timestamp.getTime();
            (current.data as StepFlowData).duration = duration;
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
