/**
 * Claims Exchange Interpreter
 *
 * Handles all claims exchange related handlers:
 * - ClaimsExchangeActionHandler: Standard claims exchange
 * - ClaimsExchangeRedirectHandler: OAuth/OIDC redirects
 * - ClaimsExchangeSubmitHandler: Return from external IdP
 * - ClaimsExchangeSelectHandler: Claims provider selection
 *
 * Key insight from log analysis:
 * - IsClaimsExchangeProtocolAServiceCallHandler has InitiatingClaimsExchange.TechnicalProfileId
 * - IsClaimsExchangeProtocolOneWayMessageHandler has InitiatingClaimsExchange.TechnicalProfileId
 * - OutputClaimsTransformationHandler has GettingClaims.InitiatingBackendClaimsExchange.TechnicalProfileId
 *
 * Responsibilities:
 * - Extracts technical profile IDs from InitiatingClaimsExchange
 * - Tracks external IdP interactions
 * - Captures redirect and callback flows
 */

import type { HandlerResultContent } from "@/types/journey-recorder";
import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import {
    CLAIMS_EXCHANGE_ACTION,
    CLAIMS_EXCHANGE_REDIRECT,
    CLAIMS_EXCHANGE_SUBMIT,
    CLAIMS_EXCHANGE_SELECT,
    CLAIMS_EXCHANGE_HANDLERS,
} from "../constants/handlers";
import { RecorderRecordKey, StatebagKey, extractTechnicalProfileFromCTP } from "../constants/keys";
import { FlowNodeType, type FlowNodeChild } from "@/types/flow-node";

/**
 * Interprets claims exchange handler clips.
 *
 * Claims exchanges occur when:
 * 1. User is redirected to external IdP (REDIRECT)
 * 2. User returns from external IdP (SUBMIT)
 * 3. Backend claims exchange occurs (ACTION)
 * 4. User selects a claims provider (SELECT)
 *
 * @example From logs (IsClaimsExchangeProtocolAServiceCallHandler):
 * ```json
 * { "Key": "InitiatingClaimsExchange", "Value": {
 *   "ProtocolType": "backend protocol",
 *   "TargetEntity": "ReadData",
 *   "TechnicalProfileId": "AAD-UserReadUsingObjectId",
 *   "ProtocolProviderType": "AzureActiveDirectoryProvider"
 * } }
 * ```
 */
export class ClaimsExchangeInterpreter extends BaseInterpreter {
    readonly handlerNames = CLAIMS_EXCHANGE_HANDLERS;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerName, handlerResult } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        // Extract technical profile info from InitiatingClaimsExchange (primary for service calls)
        // Falls back to InitiatingBackendClaimsExchange (nested under GettingClaims)
        // Falls back to CTP for user-triggered flows
        const initiatingTpInfo = this.extractTpInfoFromInitiatingClaimsExchange(handlerResult);
        const backendTpInfo = this.extractTpInfoFromBackendClaimsExchange(handlerResult);
        const ctpTp = this.extractTriggeredTechnicalProfileFromCTP(handlerResult);
        const tpInfo = initiatingTpInfo ?? backendTpInfo
            ?? (ctpTp ? { id: ctpTp, providerType: "Unknown", protocolType: undefined as string | undefined } : null);

        const flowChildren: FlowNodeChild[] = [];
        if (tpInfo) {
            flowChildren.push({
                data: {
                    type: FlowNodeType.TechnicalProfile,
                    technicalProfileId: tpInfo.id,
                    providerType: tpInfo.providerType,
                    protocolType: tpInfo.protocolType,
                },
            });
        }

        switch (handlerName) {
            case CLAIMS_EXCHANGE_REDIRECT:
                return this.handleRedirect(context, statebagUpdates, claimsUpdates, flowChildren);

            case CLAIMS_EXCHANGE_SUBMIT:
                return this.handleSubmit(context, statebagUpdates, claimsUpdates, flowChildren);

            case CLAIMS_EXCHANGE_SELECT:
                return this.handleSelect(context, statebagUpdates, claimsUpdates);

            case CLAIMS_EXCHANGE_ACTION:
            default:
                return this.handleAction(context, statebagUpdates, claimsUpdates, flowChildren);
        }
    }

    // =========================================================================
    // Handler Methods
    // =========================================================================

    /**
     * Handles redirect to external IdP.
     * Sets event type to ClaimsExchange and marks step as requiring external interaction.
     */
    private handleRedirect(
        context: InterpretContext,
        statebagUpdates: Record<string, string>,
        claimsUpdates: Record<string, string>,
        flowChildren: FlowNodeChild[]
    ): InterpretResult {
        context.pendingStepData.actionHandler = CLAIMS_EXCHANGE_REDIRECT;

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            flowChildren: flowChildren.length > 0 ? flowChildren : undefined,
        });
    }

    /**
     * Handles return from external IdP.
     * This is when the user has completed authentication with the external provider.
     */
    private handleSubmit(
        context: InterpretContext,
        statebagUpdates: Record<string, string>,
        claimsUpdates: Record<string, string>,
        flowChildren: FlowNodeChild[]
    ): InterpretResult {
        context.pendingStepData.actionHandler = CLAIMS_EXCHANGE_SUBMIT;

        return this.successFinalizeStep({
            statebagUpdates,
            claimsUpdates,
            stepResult: "Success",
            flowChildren: flowChildren.length > 0 ? flowChildren : undefined,
        });
    }

    /**
     * Handles claims provider selection.
     * Used when user chooses which IdP to authenticate with.
     */
    private handleSelect(
        context: InterpretContext,
        statebagUpdates: Record<string, string>,
        claimsUpdates: Record<string, string>
    ): InterpretResult {
        const { handlerResult } = context;

        const selectableOptions = this.extractSelectableProviders(handlerResult);

        context.pendingStepData.actionHandler = CLAIMS_EXCHANGE_SELECT;

        const flowChildren: FlowNodeChild[] = [];
        if (selectableOptions.length > 0) {
            flowChildren.push({
                data: {
                    type: FlowNodeType.HomeRealmDiscovery,
                    selectableOptions,
                },
            });
        }

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            flowChildren: flowChildren.length > 0 ? flowChildren : undefined,
        });
    }

    /**
     * Handles backend claims exchange.
     * Used for server-to-server claims exchanges (e.g., REST API calls, AAD queries).
     */
    private handleAction(
        context: InterpretContext,
        statebagUpdates: Record<string, string>,
        claimsUpdates: Record<string, string>,
        flowChildren: FlowNodeChild[]
    ): InterpretResult {
        context.pendingStepData.actionHandler = CLAIMS_EXCHANGE_ACTION;

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            flowChildren: flowChildren.length > 0 ? flowChildren : undefined,
        });
    }

    // =========================================================================
    // Extraction Methods - Claims Exchange specific
    // =========================================================================

    /**
     * Extracts technical profile ID from InitiatingClaimsExchange record.
     *
     * Pattern: IsClaimsExchangeProtocolAServiceCallHandler or IsClaimsExchangeProtocolOneWayMessageHandler
     * has RecorderRecord with InitiatingClaimsExchange.TechnicalProfileId
     */
    private extractTpInfoFromInitiatingClaimsExchange(
        handlerResult: HandlerResultContent | null
    ): { id: string; providerType: string; protocolType?: string } | null {
        if (!handlerResult?.RecorderRecord?.Values) {
            return null;
        }

        for (const entry of handlerResult.RecorderRecord.Values) {
            if (entry.Key === RecorderRecordKey.InitiatingClaimsExchange && entry.Value) {
                const value = entry.Value as {
                    TechnicalProfileId?: string;
                    ProtocolProviderType?: string;
                    ProtocolType?: string;
                };
                if (value.TechnicalProfileId) {
                    return {
                        id: value.TechnicalProfileId,
                        providerType: value.ProtocolProviderType ?? "Unknown",
                        protocolType: value.ProtocolType,
                    };
                }
            }
        }

        return null;
    }

    /**
     * Extracts technical profile ID from InitiatingBackendClaimsExchange record.
     *
     * Pattern: ClaimsExchangeActionHandler has RecorderRecord with
     * GettingClaims.Values[].InitiatingBackendClaimsExchange.TechnicalProfileId
     *
     * @example From logs:
     * ```json
     * { "Key": "GettingClaims", "Value": { "Values": [
     *   { "Key": "InitiatingBackendClaimsExchange", "Value": {
     *     "TechnicalProfileId": "AAD-UserReadUsingObjectId",
     *     "ProtocolType": "backend protocol"
     *   } }
     * ] } }
     * ```
     */
    private extractTpInfoFromBackendClaimsExchange(
        handlerResult: HandlerResultContent | null
    ): { id: string; providerType: string; protocolType?: string } | null {
        if (!handlerResult?.RecorderRecord?.Values) {
            return null;
        }

        for (const entry of handlerResult.RecorderRecord.Values) {
            if (entry.Key === RecorderRecordKey.GettingClaims && entry.Value) {
                const gettingClaims = entry.Value as {
                    Values?: Array<{ Key: string; Value: unknown }>;
                };

                if (gettingClaims.Values) {
                    for (const innerEntry of gettingClaims.Values) {
                        if (
                            innerEntry.Key === RecorderRecordKey.InitiatingBackendClaimsExchange &&
                            innerEntry.Value
                        ) {
                            const backendExchange = innerEntry.Value as {
                                TechnicalProfileId?: string;
                                ProtocolProviderType?: string;
                                ProtocolType?: string;
                            };
                            if (backendExchange.TechnicalProfileId) {
                                return {
                                    id: backendExchange.TechnicalProfileId,
                                    providerType: backendExchange.ProtocolProviderType ?? "Unknown",
                                    protocolType: backendExchange.ProtocolType,
                                };
                            }
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Extracts the triggered technical profile from the CTP statebag entry.
     * CTP appears AFTER a user selects an option.
     */
    private extractTriggeredTechnicalProfileFromCTP(
        handlerResult: HandlerResultContent | null
    ): string | null {
        if (!handlerResult?.Statebag) {
            return null;
        }

        const ctpEntry = handlerResult.Statebag[StatebagKey.CTP];
        if (!ctpEntry) {
            return null;
        }

        let ctpValue: string | undefined;
        if (typeof ctpEntry === "object" && "v" in ctpEntry) {
            ctpValue = (ctpEntry as { v: string }).v;
        } else if (typeof ctpEntry === "string") {
            ctpValue = ctpEntry;
        }

        return ctpValue ? extractTechnicalProfileFromCTP(ctpValue) : null;
    }

    /**
     * Extracts selectable provider IDs from handler result.
     */
    private extractSelectableProviders(
        handlerResult: HandlerResultContent | null
    ): string[] {
        if (!handlerResult?.RecorderRecord?.Values) {
            return [];
        }

        const providers: string[] = [];

        for (const entry of handlerResult.RecorderRecord.Values) {
            if (entry.Key === RecorderRecordKey.EnabledForUserJourneysTrue && entry.Value) {
                const value = entry.Value as {
                    Values?: Array<{ Key: string; Value: unknown }>;
                };
                if (value.Values) {
                    for (const innerEntry of value.Values) {
                        if (innerEntry.Key === RecorderRecordKey.TechnicalProfileEnabled) {
                            const tp = innerEntry.Value as { TechnicalProfile?: string };
                            if (tp.TechnicalProfile) {
                                providers.push(tp.TechnicalProfile);
                            }
                        }
                    }
                }
            }
        }

        return providers;
    }
}

/**
 * Factory function for creating ClaimsExchangeInterpreter instances.
 */
export function createClaimsExchangeInterpreter(): ClaimsExchangeInterpreter {
    return new ClaimsExchangeInterpreter();
}
