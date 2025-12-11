/**
 * Claims Transformation Interpreter
 *
 * Handles the ClaimsTransformationActionHandler which executes claims
 * transformations to compute or modify claim values.
 *
 * Also extracts PROT statebag for backend API call details.
 *
 * Responsibilities:
 * - Extracts detailed claims transformation information
 * - Captures input claims, parameters, and output claims
 * - Tracks how claims are computed/derived
 * - Extracts backend API call details from PROT statebag
 * - Associates CTs with their parent Technical Profile context
 */

import type { HandlerResultContent } from "@/types/journey-recorder";
import type { ClaimsTransformationDetail, BackendApiCall, TechnicalProfileDetail } from "@/types/trace";
import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import {
    CLAIMS_TRANSFORMATION_ACTION,
    CLAIMS_TRANSFORMATION_HANDLERS,
} from "../constants/handlers";
import { RecorderRecordKey, StatebagKey } from "../constants/keys";

/**
 * Interprets ClaimsTransformationActionHandler clips.
 *
 * Claims transformations are used to:
 * 1. Transform claim values (e.g., string manipulation)
 * 2. Compute new claims from existing ones
 * 3. Apply business logic to claims
 *
 * Key insight: OutputClaimsTransformationHandler contains BOTH:
 * - GettingClaims.InitiatingBackendClaimsExchange.TechnicalProfileId (TP context)
 * - OutputClaimsTransformation.ClaimsTransformation[] (CTs executed in that context)
 */
export class ClaimsTransformationInterpreter extends BaseInterpreter {
    readonly handlerNames = CLAIMS_TRANSFORMATION_HANDLERS;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerResult } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);
        const claimsTransformations = this.extractClaimsTransformations(handlerResult);
        const backendApiCalls = this.extractBackendApiCalls(handlerResult, statebagUpdates);

        // Extract TP context and associate CTs with it
        const tpContext = this.extractTechnicalProfileContext(handlerResult);
        let technicalProfileDetails: TechnicalProfileDetail[] | undefined;

        if (tpContext && claimsTransformations.length > 0) {
            // Create TechnicalProfileDetail with associated CTs
            technicalProfileDetails = [{
                id: tpContext.technicalProfileId,
                providerType: tpContext.providerType || "Unknown",
                protocolType: tpContext.protocolType,
                claimsTransformations,
            }];
        }

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            claimsTransformations,
            technicalProfileDetails,
            backendApiCalls: backendApiCalls.length > 0 ? backendApiCalls : undefined,
            actionHandler: CLAIMS_TRANSFORMATION_ACTION,
        });
    }

    // =========================================================================
    // Extraction Methods - TechnicalProfile context
    // =========================================================================

    /**
     * Extracts the Technical Profile context from GettingClaims.InitiatingBackendClaimsExchange.
     * This tells us which TP the CTs in this result belong to.
     */
    private extractTechnicalProfileContext(
        handlerResult: HandlerResultContent | null
    ): { technicalProfileId: string; providerType?: string; protocolType?: string } | null {
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
                                    technicalProfileId: backendExchange.TechnicalProfileId,
                                    providerType: backendExchange.ProtocolProviderType,
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

    // =========================================================================
    // Extraction Methods - ClaimsTransformation specific
    // =========================================================================

    /**
     * Extracts claims transformation details from handler result.
     *
     * Looks for OutputClaimsTransformation records containing ClaimsTransformation entries.
     * Each ClaimsTransformation has Id, InputClaim, InputParameter, and Result entries.
     */
    private extractClaimsTransformations(
        handlerResult: HandlerResultContent | null
    ): ClaimsTransformationDetail[] {
        if (!handlerResult?.RecorderRecord?.Values) {
            return [];
        }

        const transformations: ClaimsTransformationDetail[] = [];

        for (const entry of handlerResult.RecorderRecord.Values) {
            // Handle OutputClaimsTransformation directly at root level
            if (entry.Key === RecorderRecordKey.OutputClaimsTransformation && entry.Value) {
                const outputCT = entry.Value as {
                    Values?: Array<{
                        Key: string;
                        Value?: {
                            Values?: Array<{ Key: string; Value: unknown }>;
                        };
                    }>;
                };

                if (outputCT.Values) {
                    for (const ctEntry of outputCT.Values) {
                        if (ctEntry.Key === RecorderRecordKey.ClaimsTransformation && ctEntry.Value?.Values) {
                            const transformation = this.parseClaimsTransformationEntry(ctEntry.Value.Values);
                            if (transformation) {
                                transformations.push(transformation);
                            }
                        }
                    }
                }
            }

            // Also check GettingClaims for InitiatingOutputClaimsTransformation pattern
            if (entry.Key === RecorderRecordKey.GettingClaims && entry.Value) {
                const gettingClaims = entry.Value as {
                    InitiatingOutputClaimsTransformation?: {
                        TransformationId?: string;
                    };
                    InitiatingInputClaimsTransformation?: {
                        TransformationId?: string;
                    };
                };

                if (gettingClaims.InitiatingOutputClaimsTransformation?.TransformationId) {
                    transformations.push({
                        id: gettingClaims.InitiatingOutputClaimsTransformation.TransformationId,
                        inputClaims: [],
                        inputParameters: [],
                        outputClaims: [],
                    });
                }

                if (gettingClaims.InitiatingInputClaimsTransformation?.TransformationId) {
                    transformations.push({
                        id: gettingClaims.InitiatingInputClaimsTransformation.TransformationId,
                        inputClaims: [],
                        inputParameters: [],
                        outputClaims: [],
                    });
                }
            }
        }

        return transformations;
    }

    /**
     * Parses a single ClaimsTransformation entry's values array.
     */
    private parseClaimsTransformationEntry(
        values: Array<{ Key: string; Value: unknown }>
    ): ClaimsTransformationDetail | null {
        const detail: ClaimsTransformationDetail = {
            id: "",
            inputClaims: [],
            inputParameters: [],
            outputClaims: [],
        };

        for (const item of values) {
            if (item.Key === RecorderRecordKey.Id && typeof item.Value === "string") {
                detail.id = item.Value;
            } else if (item.Key === RecorderRecordKey.InputClaim && item.Value) {
                const claim = item.Value as { PolicyClaimType?: string; Value?: string };
                if (claim.PolicyClaimType) {
                    detail.inputClaims.push({
                        claimType: claim.PolicyClaimType,
                        value: claim.Value ?? "",
                    });
                }
            } else if (item.Key === RecorderRecordKey.InputParameter && item.Value) {
                const param = item.Value as { ParameterType?: string; Value?: string };
                if (param.ParameterType) {
                    detail.inputParameters.push({
                        id: param.ParameterType,
                        value: param.Value ?? "",
                    });
                }
            } else if (item.Key === RecorderRecordKey.Result && item.Value) {
                const result = item.Value as { PolicyClaimType?: string; Value?: string };
                if (result.PolicyClaimType) {
                    detail.outputClaims.push({
                        claimType: result.PolicyClaimType,
                        value: result.Value ?? "",
                    });
                }
            }
        }

        return detail.id ? detail : null;
    }

    // =========================================================================
    // Backend API Call Extraction
    // =========================================================================

    /**
     * Extracts backend API call information from PROT statebag.
     */
    private extractBackendApiCalls(
        handlerResult: HandlerResultContent,
        statebagUpdates: Record<string, string>
    ): BackendApiCall[] {
        const calls: BackendApiCall[] = [];

        // Extract from PROT statebag in handler result
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
            if (parsedCall && !calls.some((c) => c.requestUri === parsedCall.requestUri)) {
                calls.push(parsedCall);
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
}

/**
 * Factory function for creating ClaimsTransformationInterpreter instances.
 */
export function createClaimsTransformationInterpreter(): ClaimsTransformationInterpreter {
    return new ClaimsTransformationInterpreter();
}
