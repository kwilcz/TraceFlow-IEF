/**
 * Exception Clip Processor
 *
 * Processes FatalException clips which represent terminal errors in the journey.
 * Surfaces the error at the flow level and marks the active step as failed
 * when one is being accumulated.
 */

import type { Clip, FatalExceptionContent } from "@/types/journey-recorder";
import type { ClipProcessingContext } from "../clip-processing-context";
import type { ClipProcessor } from "./clip-processor";
import { ClipKind } from "../../constants/keys";

export class ExceptionProcessor implements ClipProcessor {
    process(clip: Clip, ctx: ClipProcessingContext): void {
        if (clip.Kind !== ClipKind.FatalException && clip.Kind !== ClipKind.Exception) return;

        const exception = clip.Content as FatalExceptionContent;
        const message = exception.Exception.Message || "Unknown error";
        const hResult = exception.Exception.HResult;
        const data =
            exception.Exception.Data && typeof exception.Exception.Data === "object"
                ? (exception.Exception.Data as Record<string, unknown>)
                : undefined;
        const exceptionKind = exception.Exception.Kind || "FatalException";

        ctx.errors.push(message);

        ctx.pendingStepData.result = "Error";
        ctx.pendingStepData.errorMessage = message;
        ctx.pendingStepData.errorHResult = hResult;

        ctx.pendingGlobalError = {
            ...ctx.pendingGlobalError,
            errorType: ctx.pendingGlobalError?.errorType ?? exceptionKind,
            stateName: ctx.pendingGlobalError?.stateName ?? ctx.lastTransition?.stateName ?? exceptionKind,
            ...(message && { message }),
            ...(hResult && { hResult }),
            ...(data && { data }),
        };

        ctx.lastClipKind = ClipKind.FatalException;
    }
}
