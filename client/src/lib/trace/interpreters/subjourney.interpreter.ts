/**
 * SubJourney Interpreter
 *
 * Handles SubJourney-related handlers that manage transitions between
 * UserJourneys and SubJourneys in B2C policies.
 *
 * Responsibilities:
 * - Detects SubJourney entry
 * - Manages the journey stack context
 * - Tracks SubJourney nesting
 */

import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import {
    ENQUEUE_NEW_JOURNEY,
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
                return this.handleDispatch(context, statebagUpdates, claimsUpdates);

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
            return this.successNoOp({
                statebagUpdates,
                claimsUpdates,
                pushSubJourney: {
                    journeyId: subJourneyId,
                    journeyName: subJourneyId,
                },
            });
        }

        return this.successNoOp({ statebagUpdates, claimsUpdates });
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
