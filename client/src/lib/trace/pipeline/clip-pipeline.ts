/**
 * Clip Pipeline
 *
 * Processes clips sequentially through specialized processors.
 * This replaces the ClipAggregator approach where clips were pre-grouped
 * into Action+HandlerResult pairs.
 *
 * The pipeline processes each clip in order:
 *   Headers → Transition → Predicate → HandlerResult → Action → HandlerResult → ...
 *
 * Each ClipKind has a dedicated processor. The HandlerResultProcessor
 * bridges to the existing interpreter system via the InterpreterRegistry.
 */

import type { ClipsArray } from "@/types/journey-recorder";
import type { InterpreterRegistry } from "../interpreters/interpreter-registry";
import type { ClipProcessingContext } from "./clip-processing-context";
import type { ClipProcessor } from "./processors/clip-processor";
import { ClipKind } from "../constants/keys";
import { HeadersProcessor } from "./processors/headers.processor";
import { TransitionProcessor } from "./processors/transition.processor";
import { PredicateProcessor } from "./processors/predicate.processor";
import { ActionProcessor } from "./processors/action.processor";
import { HandlerResultProcessor } from "./processors/handler-result.processor";
import { ExceptionProcessor } from "./processors/exception.processor";
import { StepLifecycleManager } from "./step-lifecycle-manager";

export class ClipPipeline {
    private readonly processors: Map<string, ClipProcessor>;
    readonly stepLifecycleManager: StepLifecycleManager;

    constructor(interpreterRegistry: InterpreterRegistry) {
        this.stepLifecycleManager = new StepLifecycleManager();
        this.processors = new Map<string, ClipProcessor>([
            [ClipKind.Headers, new HeadersProcessor(this.stepLifecycleManager)],
            [ClipKind.Transition, new TransitionProcessor()],
            [ClipKind.Predicate, new PredicateProcessor()],
            [ClipKind.Action, new ActionProcessor()],
            [ClipKind.HandlerResult, new HandlerResultProcessor(interpreterRegistry, this.stepLifecycleManager)],
            [ClipKind.Exception, new ExceptionProcessor()],
        ]);
    }

    /**
     * Processes all clips from a single log entry in order.
     */
    processClips(clips: ClipsArray, ctx: ClipProcessingContext): void {
        for (const clip of clips) {
            const processor = this.processors.get(clip.Kind);
            if (processor) {
                processor.process(clip, ctx);
            }
            // Unknown clip kinds are silently skipped
        }
    }
}
