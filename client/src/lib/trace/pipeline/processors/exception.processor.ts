/**
 * Exception Clip Processor
 *
 * Processes FatalException clips which represent terminal errors in the journey.
 * Creates an error step and adds it to the trace.
 *
 * This mirrors the handleFatalException method from the old TraceParser.
 */

import type { Clip, FatalExceptionContent } from "@/types/journey-recorder";
import type { ClipProcessingContext } from "../clip-processing-context";
import type { ClipProcessor } from "./clip-processor";
import { ClipKind } from "../../constants/keys";
import { TraceStepBuilder } from "../../domain/trace-step-builder";

export class ExceptionProcessor implements ClipProcessor {
    process(clip: Clip, ctx: ClipProcessingContext): void {
        if (clip.Kind !== ClipKind.Exception) return;

        const exception = clip.Content as FatalExceptionContent;
        const message = exception.Exception.Message;

        ctx.errors.push(message);

        // Mark current step as error if one exists
        if (ctx.currentStepBuilder) {
            ctx.currentStepBuilder.withError(message).withResult("Error");
        }

        // Create a dedicated error step
        const context = ctx.journeyStack.current();
        const errorStep = TraceStepBuilder.create()
            .withSequence(++ctx.sequenceNumber)
            .withTimestamp(ctx.currentTimestamp)
            .withLogId(ctx.currentLogId)
            .withEventType("AUTH")
            .withJourneyContext(context.journeyId, context.journeyName)
            .withOrchStep(context.lastOrchStep)
            .withGraphNodeId(`${context.journeyId}-Error`)
            .withError(message)
            .withStatebag(ctx.statebag.getStatebagSnapshot())
            .withClaims(ctx.statebag.getClaimsSnapshot())
            .build();

        ctx.traceSteps.push(errorStep);
        ctx.executionMap.addStep(errorStep);

        ctx.lastClipKind = ClipKind.Exception;
    }
}
