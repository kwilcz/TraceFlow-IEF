/**
 * Backend API Interpreter
 *
 * Handles extraction of backend API call information from B2C traces.
 * This interpreter processes:
 * - PROT statebag entries for AAD Graph API calls
 * - REST API calls from RestfulProvider
 * - OAuth2/OpenIdConnect protocol calls
 * - SAML protocol calls
 *
 * Key patterns:
 * - IsClaimsExchangeProtocolAServiceCallHandler has InitiatingClaimsExchange with ProtocolProviderType
 * - OutputClaimsTransformationHandler has PROT statebag with response details
 */

import type { HandlerResultContent } from "../../../types/journey-recorder";
import type { BackendApiCall, TechnicalProfileDetail } from "../../../types/trace";
import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import {
    CLAIMS_EXCHANGE_SERVICE_CALL,
    CLAIMS_EXCHANGE_REDIRECTION,
    CLAIMS_EXCHANGE_API,
} from "../constants/handlers";
import { RecorderRecordKey, StatebagKey } from "../constants/keys";

/**
 * Protocol provider types from B2C.
 */
const PROTOCOL_PROVIDERS = {
    REST: "RestfulProvider",
    AAD: "AzureActiveDirectoryProvider",
    OAUTH2: "OAuth2",
    OIDC: "OpenIdConnect",
    SAML: "SAML2",
} as const;

/**
 * Interprets backend API call clips and extracts protocol information.
 * 
 * Note: PROT statebag is extracted by the claims-exchange interpreter 
 * which handles OutputClaimsTransformationHandler.
 */
export class BackendApiInterpreter extends BaseInterpreter {
    readonly handlerNames = [
        CLAIMS_EXCHANGE_SERVICE_CALL,
        CLAIMS_EXCHANGE_REDIRECTION,
        CLAIMS_EXCHANGE_API,
    ] as const;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerName, handlerResult, stepBuilder } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        // Extract backend API call information
        const backendApiCalls = this.extractBackendApiCalls(handlerResult, statebagUpdates);
        const technicalProfileDetails = this.extractTechnicalProfileDetails(handlerResult);
        
        // Also extract technical profile IDs for the simple technicalProfiles array
        const technicalProfiles = technicalProfileDetails.map((detail) => detail.id);

        // When a TP is triggered (via ClaimsExchangeProtocol handlers like Redirection or API),
        // clear any selectableOptions that may have been set by ShouldOrchestrationStepBeInvoked.
        // This prevents HRD options from leaking to steps where a TP was definitively triggered.
        const hasTechnicalProfiles = technicalProfiles.length > 0;

        // Apply directly to step builder
        if (hasTechnicalProfiles) {
            stepBuilder.clearSelectableOptions();
            stepBuilder.addTechnicalProfiles(technicalProfiles);
        }

        for (const detail of technicalProfileDetails) {
            stepBuilder.addTechnicalProfileDetail(detail);
        }

        for (const call of backendApiCalls) {
            stepBuilder.addBackendApiCall(call);
        }

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
        });
    }

    /**
     * Extracts backend API call information from handler result.
     */
    private extractBackendApiCalls(
        handlerResult: HandlerResultContent,
        statebagUpdates: Record<string, string>
    ): BackendApiCall[] {
        const calls: BackendApiCall[] = [];

        // Extract from PROT statebag
        const protEntry = this.extractProtStatebag(handlerResult);
        if (protEntry) {
            const parsedCall = this.parseProtEntry(protEntry);
            if (parsedCall) {
                calls.push(parsedCall);
            }
        }

        // Also check statebag updates for PROT
        if (statebagUpdates.PROT) {
            const parsedCall = this.parseProtEntry(statebagUpdates.PROT);
            if (parsedCall) {
                // Only add if not duplicate
                if (!calls.some((c) => c.requestUri === parsedCall.requestUri)) {
                    calls.push(parsedCall);
                }
            }
        }

        return calls;
    }

    /**
     * Extracts PROT statebag entry from handler result.
     */
    private extractProtStatebag(handlerResult: HandlerResultContent): string | null {
        if (!handlerResult.Statebag) {
            return null;
        }

        const protEntry = handlerResult.Statebag[StatebagKey.PROT];
        if (!protEntry) {
            return null;
        }

        if (typeof protEntry === "string") {
            return protEntry;
        }

        if (typeof protEntry === "object" && "v" in protEntry) {
            return (protEntry as { v: string }).v;
        }

        return null;
    }

    /**
     * Parses a PROT statebag entry into a BackendApiCall.
     *
     * PROT entry format:
     * "AAD Request to {url} using method {method}...\r\nResponse: \n{json}\r\n"
     * or
     * "REST API Request to {url} using method {method}...\r\nStatus: {code}\r\nResponse: {json}\r\n"
     */
    private parseProtEntry(protValue: string): BackendApiCall | null {
        if (!protValue) {
            return null;
        }

        const call: BackendApiCall = {};

        // Extract request URI
        const requestMatch = protValue.match(/Request to ([^\s]+)/i);
        if (requestMatch) {
            call.requestUri = requestMatch[1];
        }

        // Extract request type (AAD or REST)
        if (protValue.startsWith("AAD Request")) {
            call.requestType = "AAD";
        } else if (protValue.includes("REST API")) {
            call.requestType = "REST";
        }

        // Extract response
        const responseMatch = protValue.match(/Response:\s*\n?({[\s\S]*?})\s*$/m);
        if (responseMatch) {
            call.rawResponse = responseMatch[1].trim();
            try {
                call.response = JSON.parse(call.rawResponse);
            } catch {
                // Response is not valid JSON, keep raw
            }
        }

        return Object.keys(call).length > 0 ? call : null;
    }

    /**
     * Extracts technical profile details including protocol provider type.
     */
    private extractTechnicalProfileDetails(
        handlerResult: HandlerResultContent
    ): TechnicalProfileDetail[] {
        const details: TechnicalProfileDetail[] = [];

        if (!handlerResult.RecorderRecord?.Values) {
            return details;
        }

        for (const entry of handlerResult.RecorderRecord.Values) {
            // InitiatingClaimsExchange contains protocol provider info
            if (entry.Key === RecorderRecordKey.InitiatingClaimsExchange && entry.Value) {
                const value = entry.Value as {
                    TechnicalProfileId?: string;
                    ProtocolProviderType?: string;
                    ProtocolType?: string;
                };

                if (value.TechnicalProfileId) {
                    details.push({
                        id: value.TechnicalProfileId,
                        providerType: value.ProtocolProviderType ?? "Unknown",
                        protocolType: value.ProtocolType,
                    });
                }
            }

            // GettingClaims.InitiatingBackendClaimsExchange also contains protocol info
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
                            };

                            if (backendExchange.TechnicalProfileId) {
                                details.push({
                                    id: backendExchange.TechnicalProfileId,
                                    providerType: backendExchange.ProtocolProviderType ?? "Unknown",
                                });
                            }
                        }
                    }
                }
            }
        }

        return details;
    }
}

/**
 * Factory function for creating BackendApiInterpreter instances.
 */
export function createBackendApiInterpreter(): BackendApiInterpreter {
    return new BackendApiInterpreter();
}
