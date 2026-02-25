/**
 * Handler Result Clip Processor
 *
 * Processes HandlerResult clips by dispatching to the appropriate interpreter
 * based on the preceding Action or Predicate clip stored in the context.
 *
 * This is the bridge between the new clip-by-clip pipeline and the existing
 * interpreter system. It builds an InterpretContext from the ClipProcessingContext,
 * calls the interpreter, and uses ResultApplicator to apply the result.
 */

import type { Clip, HandlerResultContent } from "@/types/journey-recorder";
import type { InterpretContext } from "../../interpreters/base-interpreter";
import type { InterpreterRegistry } from "../../interpreters/interpreter-registry";
import type { ClipProcessingContext } from "../clip-processing-context";
import type { ClipProcessor } from "./clip-processor";
import { ClipKind } from "../../constants/keys";
import { TraceStepBuilder } from "../../domain/trace-step-builder";
import { ResultApplicator } from "../result-applicator";

export class HandlerResultProcessor implements ClipProcessor {
    private readonly resultApplicator = new ResultApplicator();

    constructor(private readonly registry: InterpreterRegistry) {}

    process(clip: Clip, ctx: ClipProcessingContext): void {
        if (clip.Kind !== ClipKind.HandlerResult) return;

        const handlerResult = clip.Content as HandlerResultContent;
        ctx.lastHandlerResult = handlerResult;

        // Determine which handler this result belongs to
        const handlerName = ctx.lastAction ?? ctx.lastPredicate;
        if (!handlerName) {
            // Orphaned HandlerResult — no action or predicate to dispatch to.
            // Store predicate result if present, then skip.
            if (handlerResult.PredicateResult !== undefined) {
                ctx.lastPredicateResult = handlerResult.Result;
                ctx.lastPredicateResultString = handlerResult.PredicateResult;
            }
            ctx.lastClipKind = ClipKind.HandlerResult;
            return;
        }

        // If this is a predicate result, capture the predicate outcome
        if (ctx.lastPredicate && handlerResult.PredicateResult !== undefined) {
            ctx.lastPredicateResult = handlerResult.Result;
            ctx.lastPredicateResultString = handlerResult.PredicateResult;
        }

        // Find the interpreter for this handler
        const interpreter = this.registry.getInterpreter(handlerName);
        if (!interpreter) {
            ctx.lastClipKind = ClipKind.HandlerResult;
            return;
        }

        try {
            // Build the InterpretContext the interpreters expect
            const interpretCtx = this.buildInterpretContext(handlerName, handlerResult, clip, ctx);
            const result = interpreter.interpret(interpretCtx);

            // Apply the result to the processing context
            this.resultApplicator.apply(result, ctx);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(
                `[HandlerResultProcessor] Interpreter ${handlerName} failed for log ${ctx.currentLogId}:`,
                errorMessage,
            );
            ctx.errors.push(`Interpreter error in ${handlerName}: ${errorMessage}`);
        }

        ctx.lastClipKind = ClipKind.HandlerResult;
    }

    /**
     * Builds the InterpretContext from the ClipProcessingContext.
     * This preserves the same shape that existing interpreters expect.
     */
    private buildInterpretContext(
        handlerName: string,
        handlerResult: HandlerResultContent,
        clip: Clip,
        ctx: ClipProcessingContext,
    ): InterpretContext {
        // Create or reuse the step builder
        const stepBuilder =
            ctx.currentStepBuilder ??
            TraceStepBuilder.create()
                .withSequence(ctx.sequenceNumber)
                .withTimestamp(ctx.currentTimestamp)
                .withLogId(ctx.currentLogId)
                .withEventType(ctx.currentEventType);

        return {
            clip,
            clipIndex: 0, // Not meaningful in sequential pipeline
            clips: [clip], // Single clip — interpreters use handlerResult directly
            handlerName,
            handlerResult,
            journeyStack: ctx.journeyStack,
            stepBuilder,
            sequenceNumber: ctx.sequenceNumber,
            timestamp: ctx.currentTimestamp,
            logId: ctx.currentLogId,
            statebag: ctx.statebag.getStatebagSnapshot(),
            claims: ctx.statebag.getClaimsSnapshot(),
            previousSteps: ctx.traceSteps,
        };
    }
}
