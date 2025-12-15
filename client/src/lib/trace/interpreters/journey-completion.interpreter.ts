/**
 * Journey Completion Interpreter
 *
 * Handles handlers related to journey completion and token issuance.
 *
 * Responsibilities:
 * - Detects SendRelyingPartyResponseHandler (final step)
 * - Detects SendClaimsHandler / SendResponseHandler
 * - Marks step as final journey step
 */

import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import {
    SEND_CLAIMS,
    SEND_CLAIMS_ACTION,
    SEND_RP_RESPONSE,
    SEND_RESPONSE,
    STEP_COMPLETION_HANDLERS,
} from "../constants/handlers";
import { RecorderRecordKey } from "../constants/keys";

/**
 * Interprets journey completion handler clips.
 *
 * These handlers are invoked at the end of a user journey to:
 * 1. Issue tokens to the relying party
 * 2. Send final claims
 * 3. Complete the authentication flow
 */
export class JourneyCompletionInterpreter extends BaseInterpreter {
    readonly handlerNames = STEP_COMPLETION_HANDLERS;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerName, handlerResult, stepBuilder } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        // Extract technical profile from InitiatingClaimsExchange (for SendClaimsHandler)
        const technicalProfile = this.extractTechnicalProfile(handlerResult);
        if (technicalProfile) {
            stepBuilder.addTechnicalProfile(technicalProfile);
        }

        // Mark as final step if this is SendRelyingPartyResponseHandler
        if (handlerName === SEND_RP_RESPONSE) {
            stepBuilder.asFinalStep();
            stepBuilder.withActionHandler(SEND_RP_RESPONSE);
        } else if (handlerName === SEND_CLAIMS) {
            stepBuilder.withActionHandler(SEND_CLAIMS);
        } else if (handlerName === SEND_CLAIMS_ACTION) {
            stepBuilder.withActionHandler(SEND_CLAIMS_ACTION);
        } else if (handlerName === SEND_RESPONSE) {
            stepBuilder.withActionHandler(SEND_RESPONSE);
        }

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            technicalProfiles: technicalProfile ? [technicalProfile] : undefined,
        });
    }

    /**
     * Extracts technical profile from InitiatingClaimsExchange or similar records.
     */
    private extractTechnicalProfile(handlerResult: { RecorderRecord?: { Values?: Array<{ Key: string; Value: unknown }> } }): string | null {
        if (!handlerResult?.RecorderRecord?.Values) {
            return null;
        }

        for (const entry of handlerResult.RecorderRecord.Values) {
            if (entry.Key === RecorderRecordKey.InitiatingClaimsExchange && entry.Value) {
                const value = entry.Value as { TechnicalProfileId?: string };
                if (value.TechnicalProfileId) {
                    return value.TechnicalProfileId;
                }
            }
            if (entry.Key === RecorderRecordKey.GettingClaims && entry.Value) {
                const gettingClaims = entry.Value as {
                    InitiatingBackendClaimsExchange?: { TechnicalProfileId?: string };
                };
                if (gettingClaims.InitiatingBackendClaimsExchange?.TechnicalProfileId) {
                    return gettingClaims.InitiatingBackendClaimsExchange.TechnicalProfileId;
                }
            }
        }

        return null;
    }
}

/**
 * Factory function for creating JourneyCompletionInterpreter instances.
 */
export function createJourneyCompletionInterpreter(): JourneyCompletionInterpreter {
    return new JourneyCompletionInterpreter();
}
