/**
 * SubJourney Interpreter
 *
 * Handles SubJourney-related handlers that manage transitions between
 * UserJourneys and SubJourneys in B2C policies.
 *
 * Responsibilities:
 * - Detects SubJourney entry and exit
 * - Manages the journey stack context
 * - Tracks SubJourney nesting
 */

import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import {
    ENQUEUE_NEW_JOURNEY,
    SUBJOURNEY_DISPATCH,
    SUBJOURNEY_TRANSFER,
    SUBJOURNEY_EXIT,
    SUBJOURNEY_HANDLERS,
} from "../constants/handlers";
import { RecorderRecordKey } from "../constants/keys";

/**
 * Interprets SubJourney-related handler clips.
 *
 * SubJourneys are used for:
 * 1. Reusable journey segments (e.g., MFA enrollment)
 * 2. Modular policy design
 * 3. Conditional journey branching
 */
export class SubJourneyInterpreter extends BaseInterpreter {
    readonly handlerNames = SUBJOURNEY_HANDLERS;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerName, handlerResult } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        switch (handlerName) {
            case ENQUEUE_NEW_JOURNEY:
            case SUBJOURNEY_DISPATCH:
                return this.handleDispatch(context, statebagUpdates, claimsUpdates);

            case SUBJOURNEY_TRANSFER:
                return this.handleTransfer(context, statebagUpdates, claimsUpdates);

            case SUBJOURNEY_EXIT:
                return this.handleExit(context, statebagUpdates, claimsUpdates);

            default:
                return this.successNoOp({ statebagUpdates, claimsUpdates });
        }
    }

    /**
     * Handles SubJourney dispatch - entering a SubJourney.
     */
    private handleDispatch(
        context: InterpretContext,
        statebagUpdates: Record<string, string>,
        claimsUpdates: Record<string, string>
    ): InterpretResult {
        const subJourneyId = this.extractSubJourneyId(context);

        if (subJourneyId) {
            context.stepBuilder.withActionHandler(SUBJOURNEY_DISPATCH);

            return this.successNoOp({
                statebagUpdates,
                claimsUpdates,
                pushSubJourney: {
                    journeyId: subJourneyId,
                    journeyName: subJourneyId,
                },
                subJourneyId,
            });
        }

        return this.successNoOp({ statebagUpdates, claimsUpdates });
    }

    /**
     * Handles SubJourney transfer - similar to dispatch but used in different contexts.
     */
    private handleTransfer(
        context: InterpretContext,
        statebagUpdates: Record<string, string>,
        claimsUpdates: Record<string, string>
    ): InterpretResult {
        const subJourneyId = this.extractSubJourneyId(context);

        if (subJourneyId) {
            context.stepBuilder.withActionHandler(SUBJOURNEY_TRANSFER);

            return this.successNoOp({
                statebagUpdates,
                claimsUpdates,
                pushSubJourney: {
                    journeyId: subJourneyId,
                    journeyName: subJourneyId,
                },
                subJourneyId,
            });
        }

        return this.successNoOp({ statebagUpdates, claimsUpdates });
    }

    /**
     * Handles SubJourney exit - returning to parent journey.
     */
    private handleExit(
        context: InterpretContext,
        statebagUpdates: Record<string, string>,
        claimsUpdates: Record<string, string>
    ): InterpretResult {
        context.stepBuilder.withActionHandler(SUBJOURNEY_EXIT);

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            popSubJourney: true,
        });
    }

    /**
     * Extracts SubJourney ID from handler result or statebag.
     * Handles both string format and object format { SubJourneyId: "..." }.
     */
    private extractSubJourneyId(context: InterpretContext): string | null {
        const { handlerResult } = context;

        if (!handlerResult?.RecorderRecord?.Values) {
            return null;
        }

        for (const entry of handlerResult.RecorderRecord.Values) {
            if (
                entry.Key === RecorderRecordKey.SubJourney ||
                entry.Key === RecorderRecordKey.SubJourneyId ||
                entry.Key === RecorderRecordKey.SubJourneyInvoked
            ) {
                const value = entry.Value;

                if (typeof value === "string") {
                    return value;
                }

                if (value && typeof value === "object") {
                    const objValue = value as { SubJourneyId?: string; Id?: string };
                    return objValue.SubJourneyId ?? objValue.Id ?? null;
                }
            }
        }

        return null;
    }
}

/**
 * Factory function for creating SubJourneyInterpreter instances.
 */
export function createSubJourneyInterpreter(): SubJourneyInterpreter {
    return new SubJourneyInterpreter();
}
