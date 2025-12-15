/**
 * Post-Processors Module Index
 *
 * Post-processors run after all logs have been interpreted.
 * They perform cross-step analysis that requires looking at multiple steps.
 *
 * Usage:
 * ```typescript
 * import { getPostProcessors, runPostProcessors } from './post-processors';
 *
 * const postProcessors = getPostProcessors();
 * const result = runPostProcessors(traceSteps, postProcessors);
 * ```
 */

import type { TraceStep } from "@/types/trace";

import {
    BasePostProcessor,
    type PostProcessorContext,
    type PostProcessorResult,
} from "./base-post-processor";

import {
    StepDurationPostProcessor,
    createStepDurationPostProcessor,
} from "./step-duration.post-processor";

import {
    HrdSelectionResolverPostProcessor,
    createHrdSelectionResolverPostProcessor,
} from "./hrd-selection-resolver.post-processor";

// Re-export types and base class
export {
    BasePostProcessor,
    type PostProcessorContext,
    type PostProcessorResult,
};

// Re-export post-processors
export {
    StepDurationPostProcessor,
    createStepDurationPostProcessor,
    HrdSelectionResolverPostProcessor,
    createHrdSelectionResolverPostProcessor,
};

/**
 * Returns the default ordered list of post-processors.
 * Order matters: step duration should run before HRD resolution.
 */
export function getPostProcessors(): BasePostProcessor[] {
    return [
        createStepDurationPostProcessor(),
        createHrdSelectionResolverPostProcessor(),
    ];
}

/**
 * Runs all post-processors in order.
 * Returns combined results with any errors.
 */
export function runPostProcessors(
    traceSteps: TraceStep[],
    postProcessors?: BasePostProcessor[]
): { success: boolean; errors: string[] } {
    const processors = postProcessors ?? getPostProcessors();
    const context: PostProcessorContext = { traceSteps };
    const allErrors: string[] = [];

    for (const processor of processors) {
        const result = processor.process(context);
        if (!result.success && result.errors) {
            allErrors.push(...result.errors);
        }
    }

    return {
        success: allErrors.length === 0,
        errors: allErrors,
    };
}
