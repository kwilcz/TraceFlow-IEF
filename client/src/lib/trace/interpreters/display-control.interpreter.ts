/**
 * Display Control Interpreter
 *
 * Handles display control action handlers that manage UI controls like
 * CAPTCHA, email verification, phone verification, etc.
 *
 * Key insight from log analysis:
 * - IsDisplayControlActionRequestHandler is a predicate that checks if a DC action is requested
 * - SendDisplayControlActionResponseHandler processes the DC action and calls the associated TP
 * - The "Id" field format is "DisplayControlId/Action" (e.g., "captchaControlChallengeCode/GetChallenge")
 * - DisplayControlAction array contains multiple TechnicalProfileIds and claim mappings
 * - Each TP entry can also contain nested ClaimsTransformation entries
 *
 * Responsibilities:
 * - Extracts display control ID and action name
 * - Extracts ALL technical profiles invoked by the display control (not just the first)
 * - Captures nested claims transformations within each TP
 * - Captures claim mappings for the action
 */

import type { HandlerResultContent } from "@/types/journey-recorder";
import type { DisplayControlAction, ClaimMapping, DisplayControlTechnicalProfile, ClaimsTransformationDetail } from "@/types/trace";
import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import { DISPLAY_CONTROL_HANDLERS, DISPLAY_CONTROL_ACTION_RESPONSE } from "../constants/handlers";
import { RecorderRecordKey } from "../constants/keys";
import { FlowNodeType, type FlowNodeChild } from "@/types/flow-node";

/**
 * Interprets Display Control handler clips.
 *
 * Display controls are used for:
 * 1. CAPTCHA challenges (GetChallenge, VerifyCode)
 * 2. Email verification (SendCode, VerifyCode)
 * 3. Phone verification (SendCode, VerifyCode)
 * 4. TOTP setup and verification
 *
 * @example From logs (SendDisplayControlActionResponseHandler with multiple TPs):
 * ```json
 * {
 *   "Key": "Id",
 *   "Value": "signUpEmailVerification/SendCode"
 * },
 * {
 *   "Key": "DisplayControlAction",
 *   "Value": [
 *     {
 *       "Values": [
 *         { "Key": "TechnicalProfileId", "Value": "GenerateOtp" }
 *       ]
 *     },
 *     {
 *       "Values": [
 *         { "Key": "TechnicalProfileId", "Value": "SendOtp-Salesforce" },
 *         { "Key": "ClaimsTransformation", "Value": {
 *           "Values": [
 *             { "Key": "Id", "Value": "GenerateEmailRequestBody" },
 *             { "Key": "InputClaim", "Value": {...} },
 *             { "Key": "Result", "Value": {...} }
 *           ]
 *         }}
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export class DisplayControlInterpreter extends BaseInterpreter {
    readonly handlerNames = DISPLAY_CONTROL_HANDLERS;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerName, handlerResult } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        // Only extract detailed info from the response handler
        if (handlerName === DISPLAY_CONTROL_ACTION_RESPONSE) {
            const displayControlAction = this.extractDisplayControlAction(handlerResult);

            if (displayControlAction) {
                // Build DC FlowNodeChild with nested TP/CT children
                const dcChildren: FlowNodeChild[] = [];
                if (displayControlAction.technicalProfiles) {
                    for (const tp of displayControlAction.technicalProfiles) {
                        const tpChildren: FlowNodeChild[] = [];
                        if (tp.claimsTransformations) {
                            for (const ct of tp.claimsTransformations) {
                                tpChildren.push({
                                    data: {
                                        type: FlowNodeType.ClaimsTransformation,
                                        transformationId: ct.id,
                                        inputClaims: ct.inputClaims,
                                        inputParameters: ct.inputParameters,
                                        outputClaims: ct.outputClaims,
                                    },
                                });
                            }
                        }
                        dcChildren.push({
                            data: {
                                type: FlowNodeType.TechnicalProfile,
                                technicalProfileId: tp.technicalProfileId,
                                providerType: "DisplayControlProvider",
                                claimMappings: tp.claimMappings,
                            },
                            children: tpChildren.length > 0 ? tpChildren : undefined,
                        });
                    }
                }

                const flowChildren: FlowNodeChild[] = [{
                    data: {
                        type: FlowNodeType.DisplayControl,
                        displayControlId: displayControlAction.displayControlId,
                        action: displayControlAction.action,
                        resultCode: displayControlAction.resultCode,
                        claimMappings: displayControlAction.claimMappings,
                    },
                    children: dcChildren.length > 0 ? dcChildren : undefined,
                }];

                return this.successNoOp({
                    statebagUpdates,
                    claimsUpdates,
                    flowChildren,
                });
            }
        }

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
        });
    }

    /**
     * Extracts display control action details from handler result.
     *
     * Pattern:
     * - "Id" field: "DisplayControlId/Action" (e.g., "captchaControlChallengeCode/GetChallenge")
     * - "DisplayControlAction" array with multiple entries, each containing:
     *   - TechnicalProfileId
     *   - Optional ClaimsTransformation entries
     *   - Claim mappings
     * - "Result" field: HTTP result code (e.g., "200")
     */
    private extractDisplayControlAction(
        handlerResult: HandlerResultContent
    ): DisplayControlAction | null {
        if (!handlerResult.RecorderRecord?.Values) {
            return null;
        }

        let displayControlId = "";
        let action = "";
        let resultCode: string | undefined;
        const technicalProfiles: DisplayControlTechnicalProfile[] = [];
        const globalClaimMappings: ClaimMapping[] = [];

        for (const entry of handlerResult.RecorderRecord.Values) {
            // Extract Id which contains "DisplayControlId/Action"
            if (entry.Key === RecorderRecordKey.Id && typeof entry.Value === "string") {
                const parts = entry.Value.split("/");
                if (parts.length >= 2) {
                    displayControlId = parts[0];
                    action = parts.slice(1).join("/");
                } else {
                    displayControlId = entry.Value;
                }
            }

            // Extract result code
            if (entry.Key === RecorderRecordKey.Result && typeof entry.Value === "string") {
                resultCode = entry.Value;
            }

            // Extract DisplayControlAction array - now handles multiple TPs
            if (entry.Key === RecorderRecordKey.DisplayControlAction && Array.isArray(entry.Value)) {
                for (const actionItem of entry.Value) {
                    const actionValues = actionItem as { Values?: Array<{ Key: string; Value: unknown }> };
                    if (actionValues.Values) {
                        const tpEntry = this.extractTechnicalProfileEntry(actionValues.Values);
                        if (tpEntry) {
                            technicalProfiles.push(tpEntry);
                        }
                    }
                }
            }
        }

        if (!displayControlId) {
            return null;
        }

        return {
            displayControlId,
            action,
            technicalProfiles: technicalProfiles.length > 0 ? technicalProfiles : undefined,
            resultCode,
            claimMappings: globalClaimMappings.length > 0 ? globalClaimMappings : undefined,
        };
    }

    /**
     * Extracts a single technical profile entry from the DisplayControlAction Values array.
     * Each entry can have a TechnicalProfileId, ClaimsTransformations, and ClaimMappings.
     */
    private extractTechnicalProfileEntry(
        values: Array<{ Key: string; Value: unknown }>
    ): DisplayControlTechnicalProfile | null {
        let technicalProfileId: string | undefined;
        const claimsTransformations: ClaimsTransformationDetail[] = [];
        const claimMappings: ClaimMapping[] = [];

        for (const innerEntry of values) {
            // Extract TechnicalProfileId
            if (innerEntry.Key === RecorderRecordKey.TechnicalProfileId && 
                typeof innerEntry.Value === "string") {
                technicalProfileId = innerEntry.Value;
            }

            // Extract nested ClaimsTransformation
            if (innerEntry.Key === "ClaimsTransformation" && 
                typeof innerEntry.Value === "object" && innerEntry.Value !== null) {
                const ctData = innerEntry.Value as { Values?: Array<{ Key: string; Value: unknown }> };
                if (ctData.Values) {
                    const ct = this.extractClaimsTransformation(ctData.Values);
                    if (ct) {
                        claimsTransformations.push(ct);
                    }
                }
            }

            // Extract claim mappings
            if (innerEntry.Key === "MappingPartnerTypeForClaim" && 
                typeof innerEntry.Value === "object") {
                const mapping = innerEntry.Value as {
                    PartnerClaimType?: string;
                    PolicyClaimType?: string;
                };
                if (mapping.PartnerClaimType && mapping.PolicyClaimType) {
                    claimMappings.push({
                        partnerClaimType: mapping.PartnerClaimType,
                        policyClaimType: mapping.PolicyClaimType,
                    });
                }
            }
        }

        if (!technicalProfileId) {
            return null;
        }

        return {
            technicalProfileId,
            claimsTransformations: claimsTransformations.length > 0 ? claimsTransformations : undefined,
            claimMappings: claimMappings.length > 0 ? claimMappings : undefined,
        };
    }

    /**
     * Extracts a ClaimsTransformationDetail from the nested ClaimsTransformation Values.
     */
    private extractClaimsTransformation(
        values: Array<{ Key: string; Value: unknown }>
    ): ClaimsTransformationDetail | null {
        let id: string | undefined;
        const inputClaims: Array<{ claimType: string; value: string }> = [];
        const inputParameters: Array<{ id: string; value: string }> = [];
        const outputClaims: Array<{ claimType: string; value: string }> = [];

        for (const entry of values) {
            if (entry.Key === "Id" && typeof entry.Value === "string") {
                id = entry.Value;
            }

            if (entry.Key === "InputClaim" && typeof entry.Value === "object" && entry.Value !== null) {
                const claim = entry.Value as { PolicyClaimType?: string; Value?: string };
                if (claim.PolicyClaimType) {
                    inputClaims.push({
                        claimType: claim.PolicyClaimType,
                        value: claim.Value ?? "",
                    });
                }
            }

            if (entry.Key === "InputParameter" && typeof entry.Value === "object" && entry.Value !== null) {
                const param = entry.Value as { Id?: string; Value?: string };
                if (param.Id) {
                    inputParameters.push({
                        id: param.Id,
                        value: param.Value ?? "",
                    });
                }
            }

            if (entry.Key === "Result" && typeof entry.Value === "object" && entry.Value !== null) {
                const result = entry.Value as { PolicyClaimType?: string; Value?: string };
                if (result.PolicyClaimType) {
                    outputClaims.push({
                        claimType: result.PolicyClaimType,
                        value: result.Value ?? "",
                    });
                }
            }
        }

        if (!id) {
            return null;
        }

        return {
            id,
            inputClaims,
            inputParameters,
            outputClaims,
        };
    }
}

/**
 * Factory function for creating DisplayControlInterpreter instances.
 */
export function createDisplayControlInterpreter(): DisplayControlInterpreter {
    return new DisplayControlInterpreter();
}
