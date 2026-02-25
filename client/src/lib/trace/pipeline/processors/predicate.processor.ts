/**
 * Predicate Clip Processor
 *
 * Processes Predicate clips which announce a gate/decision handler about to execute.
 * The Predicate clip Content is a string: the fully qualified class name of the handler.
 *
 * This processor simply records the predicate handler name in ctx.lastPredicate.
 * The next HandlerResult clip will be dispatched based on this context.
 *
 * Also clears ctx.lastAction since we've moved to a new predicate sequence.
 */

import type { Clip } from "@/types/journey-recorder";
import type { ClipProcessingContext } from "../clip-processing-context";
import type { ClipProcessor } from "./clip-processor";
import { ClipKind } from "../../constants/keys";

export class PredicateProcessor implements ClipProcessor {
    process(clip: Clip, ctx: ClipProcessingContext): void {
        if (clip.Kind !== ClipKind.Predicate) return;

        ctx.lastPredicate = clip.Content as string;
        ctx.lastPredicateResult = null;
        ctx.lastPredicateResultString = null;
        // Clear action — we're in a predicate sequence now
        ctx.lastAction = null;
        ctx.lastHandlerResult = null;

        ctx.lastClipKind = ClipKind.Predicate;
    }
}
