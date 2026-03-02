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
import { FlowNodeType, type FlowNodeChild } from "@/types/flow-node";

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
        const { handlerName, handlerResult, pendingStepData } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        // Extract technical profile info for SendClaims FlowNodeChild
        const tpInfo = this.extractTechnicalProfileInfo(handlerResult);

        // Build FlowNode children
        const flowChildren: FlowNodeChild[] = [];
        if (tpInfo) {
            // TechnicalProfile child so getStepTpNames() finds the TP
            flowChildren.push({
                data: {
                    type: FlowNodeType.TechnicalProfile,
                    technicalProfileId: tpInfo.technicalProfileId,
                    providerType: tpInfo.protocol ?? "Unknown",
                },
            });
            // SendClaims child for UI rendering
            flowChildren.push({
                data: {
                    type: FlowNodeType.SendClaims,
                    technicalProfileId: tpInfo.technicalProfileId,
                    protocol: tpInfo.protocol,
                },
            });
        }

        // Set action handler on pending step data
        if (handlerName === SEND_RP_RESPONSE) {
            pendingStepData.actionHandler = SEND_RP_RESPONSE;
        } else if (handlerName === SEND_CLAIMS) {
            pendingStepData.actionHandler = SEND_CLAIMS;
        } else if (handlerName === SEND_CLAIMS_ACTION) {
            pendingStepData.actionHandler = SEND_CLAIMS_ACTION;
        } else if (handlerName === SEND_RESPONSE) {
            pendingStepData.actionHandler = SEND_RESPONSE;
        }

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            flowChildren: flowChildren.length > 0 ? flowChildren : undefined,
        });
    }

    /**
     * Extracts technical profile info including protocol from claims exchange records.
     */
    private extractTechnicalProfileInfo(
        handlerResult: { RecorderRecord?: { Values?: Array<{ Key: string; Value: unknown }> } }
    ): { technicalProfileId: string; protocol?: string } | null {
        if (!handlerResult?.RecorderRecord?.Values) {
            return null;
        }

        for (const entry of handlerResult.RecorderRecord.Values) {
            if (entry.Key === RecorderRecordKey.InitiatingClaimsExchange && entry.Value) {
                const value = entry.Value as { TechnicalProfileId?: string; ProtocolType?: string };
                if (value.TechnicalProfileId) {
                    return { technicalProfileId: value.TechnicalProfileId, protocol: value.ProtocolType };
                }
            }
            if (entry.Key === RecorderRecordKey.GettingClaims && entry.Value) {
                const gettingClaims = entry.Value as {
                    InitiatingBackendClaimsExchange?: { TechnicalProfileId?: string; ProtocolType?: string };
                };
                if (gettingClaims.InitiatingBackendClaimsExchange?.TechnicalProfileId) {
                    return {
                        technicalProfileId: gettingClaims.InitiatingBackendClaimsExchange.TechnicalProfileId,
                        protocol: gettingClaims.InitiatingBackendClaimsExchange.ProtocolType,
                    };
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
