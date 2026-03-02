/**
 * Base Post-Processor
 *
 * Post-processors run after all logs have been interpreted and steps created.
 * They perform cross-step analysis and correlation that cannot be done during
 * single-log interpretation (e.g., looking ahead to the next step).
 *
 * Use cases:
 * - Resolving HRD selections by correlating with next step's TPs
 * - Calculating step durations based on next step's timestamp
 * - Any other cross-step correlation
 */

import type { FlowNode } from "@/types/flow-node";

/**
 * Context provided to post-processors.
 */
export interface PostProcessorContext {
    /** The FlowNode tree root (mutable - post-processors mutate node data in place) */
    flowTree: FlowNode;
}

/**
 * Result returned by a post-processor.
 */
export interface PostProcessorResult {
    /** Whether processing succeeded */
    success: boolean;
    /** Optional error messages */
    errors?: string[];
}

/**
 * Base class for post-processors.
 * Extend this class to create custom post-processing logic.
 */
export abstract class BasePostProcessor {
    /** Descriptive name for logging/debugging */
    abstract readonly name: string;

    /**
     * Process the trace steps.
     * Implementations should modify traceSteps in place.
     */
    abstract process(context: PostProcessorContext): PostProcessorResult;

    /**
     * Helper to create a success result.
     */
    protected success(): PostProcessorResult {
        return { success: true };
    }

    /**
     * Helper to create an error result.
     */
    protected error(...errors: string[]): PostProcessorResult {
        return { success: false, errors };
    }
}
