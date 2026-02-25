/**
 * Action Clip Processor
 *
 * Processes Action clips which announce an imperative handler about to execute.
 * The Action clip Content is a string: the fully qualified class name of the handler.
 *
 * This processor records the action handler name in ctx.lastAction.
 * The next HandlerResult clip will be dispatched to the interpreter for this action.
 *
 * Also clears ctx.lastPredicate since we've moved from predicate to action sequence.
 */

import type { Clip } from "@/types/journey-recorder";
import type { ClipProcessingContext } from "../clip-processing-context";
import type { ClipProcessor } from "./clip-processor";
import { ClipKind } from "../../constants/keys";

export class ActionProcessor implements ClipProcessor {
    process(clip: Clip, ctx: ClipProcessingContext): void {
        if (clip.Kind !== ClipKind.Action) return;

        ctx.lastAction = clip.Content as string;
        // Clear predicate — we're in an action sequence now
        ctx.lastPredicate = null;
        ctx.lastHandlerResult = null;

        ctx.lastClipKind = ClipKind.Action;
    }
}
