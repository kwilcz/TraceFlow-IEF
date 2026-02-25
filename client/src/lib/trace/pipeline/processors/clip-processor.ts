import type { Clip } from "@/types/journey-recorder";
import type { ClipProcessingContext } from "../clip-processing-context";

/**
 * Interface for clip-level processors in the pipeline.
 * Each processor handles one specific clip Kind (Headers, Transition, etc.).
 *
 * Processors are responsible for:
 * 1. Extracting data from the clip
 * 2. Updating the {@link ClipProcessingContext} in-place
 *
 * They should NOT create trace steps directly — that's done by
 * the HandlerResultProcessor which delegates to the existing interpreter system.
 */
export interface ClipProcessor {
    /**
     * Process a single clip and update the context.
     *
     * @param clip - The clip to process
     * @param ctx - The mutable processing context to update
     */
    process(clip: Clip, ctx: ClipProcessingContext): void;
}
