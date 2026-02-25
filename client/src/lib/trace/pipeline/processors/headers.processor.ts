/**
 * Headers Clip Processor
 *
 * Processes Headers clips which are always the first clip in a log entry.
 * Extracts flow identity (CorrelationId, TenantId, PolicyId, EventInstance)
 * and updates the processing context.
 *
 * Also handles first-time setup: if mainJourneyId is not yet set,
 * initializes the journey stack with the policy from the headers.
 */

import type { Clip, HeadersContent } from "@/types/journey-recorder";
import type { ClipProcessingContext } from "../clip-processing-context";
import type { ClipProcessor } from "./clip-processor";
import type { ResultApplicator } from "../result-applicator";
import { ClipKind, eventInstanceToEventType } from "../../constants/keys";
import { beginNewSession } from "../clip-processing-context";

export class HeadersProcessor implements ClipProcessor {
    constructor(private readonly resultApplicator: ResultApplicator) {}

    process(clip: Clip, ctx: ClipProcessingContext): void {
        if (clip.Kind !== ClipKind.Headers) return;

        const headers = clip.Content as HeadersContent;

        // Session boundary detection: a second Event:AUTH signals a new
        // authentication session (e.g. user clicked browser-back).
        if (headers.EventInstance === "Event:AUTH" && ctx.sessionFlowCount > 0) {
            beginNewSession(ctx, (c) => this.resultApplicator.finalizeCurrentStep(c));
        }

        ctx.currentHeaders = headers;
        ctx.correlationId = headers.CorrelationId;
        ctx.tenantId = headers.TenantId;
        ctx.policyId = headers.PolicyId;
        ctx.eventInstance = headers.EventInstance;
        ctx.currentEventType = eventInstanceToEventType(headers.EventInstance);

        // Initialize main journey on first Headers clip seen
        if (!ctx.mainJourneyId && headers.PolicyId) {
            ctx.mainJourneyId = headers.PolicyId;
        }

        ctx.lastClipKind = ClipKind.Headers;

        // Record new session and track AUTH events
        if (headers.EventInstance === "Event:AUTH") {
            ctx.sessions.push({
                sessionIndex: ctx.sessionFlowCount,
                startTimestamp: ctx.currentTimestamp,
                stepCount: 0,
            });
            ctx.sessionFlowCount++;
        }
    }
}
