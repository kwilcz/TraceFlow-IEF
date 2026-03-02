/**
 * Exception Clip Processor
 *
 * Processes FatalException clips which represent terminal errors in the journey.
 * Creates an error step FlowNode directly on the FlowTree.
 */

import type { Clip, FatalExceptionContent } from "@/types/journey-recorder";
import type { ClipProcessingContext } from "../clip-processing-context";
import type { ClipProcessor } from "./clip-processor";
import type { StepFlowData } from "@/types/flow-node";
import { ClipKind } from "../../constants/keys";
import { FlowNodeType } from "@/types/flow-node";

export class ExceptionProcessor implements ClipProcessor {
    process(clip: Clip, ctx: ClipProcessingContext): void {
        if (clip.Kind !== ClipKind.Exception) return;

        const exception = clip.Content as FatalExceptionContent;
        const message = exception.Exception.Message;

        ctx.errors.push(message);

        // Mark current pending step as error if one is being accumulated
        if (ctx.pendingStepData) {
            ctx.pendingStepData.result = "Error";
            ctx.pendingStepData.errorMessage = message;
        }

        // Create a dedicated error step FlowNode directly on the tree
        const context = ctx.journeyStack.current();
        const errorStepData: StepFlowData = {
            type: FlowNodeType.Step,
            stepOrder: context.lastOrchStep,
            currentJourneyName: context.journeyName,
            result: "Error",
            errors: [{ kind: "Unhandled", hResult: "", message }],
            selectableOptions: [],
        };

        const graphNodeId = `${context.journeyId}-Error`;
        ctx.executionMap.addStep({
            graphNodeId,
            result: "Error",
            sequenceNumber: ++ctx.sequenceNumber,
        });

        ctx.flowTreeBuilder.addStep(errorStepData, {
            timestamp: ctx.currentTimestamp,
            sequenceNumber: ctx.sequenceNumber,
            logId: ctx.currentLogId,
            eventType: ctx.currentEventType,
            statebagSnapshot: ctx.statebag.getStatebagSnapshot(),
            claimsSnapshot: ctx.statebag.getClaimsSnapshot(),
        });

        ctx.lastClipKind = ClipKind.Exception;
    }
}
