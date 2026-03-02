/**
 * Transition Clip Processor
 *
 * Processes Transition clips which mark state machine transitions.
 * Multiple transitions can appear per log event.
 *
 * Sets ctx.lastTransition with the event name and state name.
 * Also applies transition events to the current step builder if one exists
 * (mirrors the existing parser behavior of capturing SendClaims transitions).
 */

import type { Clip, TransitionContent } from "@/types/journey-recorder";
import type { ClipProcessingContext } from "../clip-processing-context";
import type { ClipProcessor } from "./clip-processor";
import { ClipKind } from "../../constants/keys";

export class TransitionProcessor implements ClipProcessor {
    process(clip: Clip, ctx: ClipProcessingContext): void {
        if (clip.Kind !== ClipKind.Transition) return;

        const transition = clip.Content as TransitionContent;

        ctx.lastTransition = {
            eventName: transition.EventName,
            stateName: transition.StateName,
        };

        // Transition event name is no longer tracked on the step —
        // StepFlowData does not have a transitionEvent field.
        // The transition is available via ctx.lastTransition for interpreters.

        ctx.lastClipKind = ClipKind.Transition;
    }
}
