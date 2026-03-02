/**
 * Self-Asserted Validation Interpreter
 *
 * Handles the SelfAssertedMessageValidationHandler which fires when
 * the user submits a self-asserted form and validation TPs execute.
 *
 * Key insight from log analysis:
 * - SelfAssertedMessageValidationHandler contains ValidationTechnicalProfile
 * - ValidationTechnicalProfile.TechnicalProfileId shows the validation TP (e.g., "login-NonInteractive")
 * - CTP statebag shows the self-asserted TP itself (e.g., "SelfAsserted-LocalAccountSignin-Email:1")
 * - Exception in RecorderRecord.Values.Validation indicates validation failure
 *
 * Responsibilities:
 * - Tracks form submissions and validation
 * - Captures both self-asserted TP (from CTP) and validation TP (from ValidationTechnicalProfile)
 * - Extracts claim mappings from validation results
 * - Detects and reports validation errors from Exception in handler result
 *
 * NOTE: Claims transformations (CTs) are NOT handled here — they are the
 * responsibility of the ClaimsTransformationInterpreter.
 */

import type { HandlerResultContent } from "@/types/journey-recorder";
import type { ClaimMapping } from "@/types/trace";
import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import { FlowNodeType, type FlowNodeChild } from "@/types/flow-node";
import { SELF_ASSERTED_VALIDATION } from "../constants/handlers";
import { RecorderRecordKey, StatebagKey, extractTechnicalProfileFromCTP } from "../constants/keys";

/**
 * Interprets SelfAssertedMessageValidationHandler clips.
 *
 * This handler fires when the user submits a self-asserted form and
 * validation technical profiles execute against the input.
 *
 * @example From logs (SelfAssertedMessageValidationHandler):
 * ```json
 * { "Key": "Validation", "Value": { "Values": [
 *   { "Key": "ProtocolProviderType", "Value": "SelfAssertedAttributeProvider" },
 *   { "Key": "TechnicalProfileEnabled", "Value": { "TechnicalProfile": "login-NonInteractive" } },
 *   { "Key": "ValidationTechnicalProfile", "Value": { "Values": [
 *     { "Key": "TechnicalProfileId", "Value": "login-NonInteractive" }
 *   ] } }
 * ] } }
 * ```
 */
export class SelfAssertedValidationInterpreter extends BaseInterpreter {
    readonly handlerNames = [SELF_ASSERTED_VALIDATION] as const;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerResult, pendingStepData } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        // Extract technical profiles:
        // 1. CTP - the self-asserted TP that was triggered (appears after user selection)
        // 2. ValidationTechnicalProfile - the TP used to validate the form input
        const selfAssertedTp = this.extractTriggeredTechnicalProfileFromCTP(handlerResult);
        const validationTps = this.extractValidationTechnicalProfiles(handlerResult);
        const claimMappings = this.extractClaimMappings(handlerResult);

        // Build flowChildren: self-asserted TP as parent, with validation TPs as nested children
        const flowChildren = this.buildFlowChildren(selfAssertedTp, validationTps, claimMappings);

        pendingStepData.actionHandler = SELF_ASSERTED_VALIDATION;

        // Check for validation errors (Exception in handler result)
        const errorInfo = this.extractValidationError(handlerResult);

        if (errorInfo.message) {
            return this.successNoOp({
                statebagUpdates,
                claimsUpdates,
                stepResult: "Error",
                error: errorInfo.message,
                errorHResult: errorInfo.hResult,
                stepErrors: [{
                    kind: "Handled",
                    hResult: errorInfo.hResult ?? "",
                    message: errorInfo.message,
                }],
                flowChildren: flowChildren.length > 0 ? flowChildren : undefined,
            });
        }

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            flowChildren: flowChildren.length > 0 ? flowChildren : undefined,
        });
    }

    // =========================================================================
    // Flow Children Builder
    // =========================================================================

    /**
     * Builds flowChildren: self-asserted TP and validation TPs as direct step children.
     * Claim mappings are placed on the first validation TP (where they originate).
     */
    private buildFlowChildren(
        selfAssertedTp: string | null,
        validationTps: string[],
        claimMappings: ClaimMapping[]
    ): FlowNodeChild[] {
        const flowChildren: FlowNodeChild[] = [];

        if (selfAssertedTp) {
            // Build nested children for the self-asserted TP
            const nestedChildren: FlowNodeChild[] = [];

            // Validation TPs as children of the self-asserted TP
            for (let i = 0; i < validationTps.length; i++) {
                nestedChildren.push({
                    data: {
                        type: FlowNodeType.TechnicalProfile,
                        technicalProfileId: validationTps[i],
                        providerType: "Unknown",
                        claimMappings: i === 0 && claimMappings.length > 0 ? claimMappings : undefined,
                    },
                });
            }

            flowChildren.push({
                data: {
                    type: FlowNodeType.TechnicalProfile,
                    technicalProfileId: selfAssertedTp,
                    providerType: "SelfAssertedAttributeProvider",
                },
                children: nestedChildren.length > 0 ? nestedChildren : undefined,
            });
        } else {
            // No self-asserted TP — keep flat (orphan validation TPs)
            for (let i = 0; i < validationTps.length; i++) {
                flowChildren.push({
                    data: {
                        type: FlowNodeType.TechnicalProfile,
                        technicalProfileId: validationTps[i],
                        providerType: "Unknown",
                        claimMappings: i === 0 && claimMappings.length > 0 ? claimMappings : undefined,
                    },
                });
            }
        }

        return flowChildren;
    }

    // =========================================================================
    // Extraction Methods - SelfAsserted Validation specific
    // =========================================================================

    /**
     * Extracts the triggered technical profile from the CTP statebag entry.
     * CTP format: "TechnicalProfileName:StepNumber"
     */
    private extractTriggeredTechnicalProfileFromCTP(handlerResult: HandlerResultContent | null): string | null {
        if (!handlerResult?.Statebag) {
            return null;
        }

        const ctpEntry = handlerResult.Statebag[StatebagKey.CTP];
        const ctpValue = this.extractStatebagEntryValue(ctpEntry);

        return ctpValue ? extractTechnicalProfileFromCTP(ctpValue) : null;
    }

    /**
     * Extracts validation technical profiles from handler result.
     *
     * Pattern: SelfAssertedMessageValidationHandler has Validation record with ValidationTechnicalProfile
     * Returns an array since there can be multiple validation TPs.
     */
    private extractValidationTechnicalProfiles(handlerResult: HandlerResultContent | null): string[] {
        const validationTps: string[] = [];

        if (!handlerResult?.RecorderRecord?.Values) {
            return validationTps;
        }

        for (const entry of handlerResult.RecorderRecord.Values) {
            if (entry.Key === RecorderRecordKey.Validation && entry.Value) {
                const validationValue = entry.Value as {
                    Values?: Array<{ Key: string; Value: unknown }>;
                };
                if (validationValue.Values) {
                    for (const innerEntry of validationValue.Values) {
                        if (innerEntry.Key === RecorderRecordKey.ValidationTechnicalProfile) {
                            const vtpValue = innerEntry.Value as {
                                Values?: Array<{ Key: string; Value: string }>;
                            };
                            if (vtpValue.Values) {
                                for (const vtpEntry of vtpValue.Values) {
                                    if (vtpEntry.Key === RecorderRecordKey.TechnicalProfileId) {
                                        if (!validationTps.includes(vtpEntry.Value)) {
                                            validationTps.push(vtpEntry.Value);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return validationTps;
    }

    /**
     * Extracts claim mappings from handler result.
     *
     * Pattern: MappingFromPartnerClaimType entries within ValidationTechnicalProfile
     * Maps external provider claims to policy claims.
     */
    private extractClaimMappings(handlerResult: HandlerResultContent | null): ClaimMapping[] {
        const mappings: ClaimMapping[] = [];

        if (!handlerResult?.RecorderRecord?.Values) {
            return mappings;
        }

        for (const entry of handlerResult.RecorderRecord.Values) {
            if (entry.Key === RecorderRecordKey.Validation && entry.Value) {
                const validationValue = entry.Value as {
                    Values?: Array<{ Key: string; Value: unknown }>;
                };
                if (validationValue.Values) {
                    for (const innerEntry of validationValue.Values) {
                        if (innerEntry.Key === RecorderRecordKey.ValidationTechnicalProfile) {
                            const vtpValue = innerEntry.Value as {
                                Values?: Array<{ Key: string; Value: unknown }>;
                            };
                            if (vtpValue.Values) {
                                for (const vtpEntry of vtpValue.Values) {
                                    if (vtpEntry.Key === "MappingFromPartnerClaimType") {
                                        const mappingValue = vtpEntry.Value as {
                                            PartnerClaimType?: string;
                                            PolicyClaimType?: string;
                                        };
                                        if (mappingValue.PartnerClaimType && mappingValue.PolicyClaimType) {
                                            mappings.push({
                                                partnerClaimType: mappingValue.PartnerClaimType,
                                                policyClaimType: mappingValue.PolicyClaimType,
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return mappings;
    }

    /**
     * Extracts validation error information from handler result.
     *
     * The exception can appear in multiple locations:
     * 1. handlerResult.Exception (top level)
     * 2. handlerResult.RecorderRecord.Values[Validation].Values[Exception]
     *
     * This is typically seen in SelfAssertedMessageValidationHandler when
     * validation fails (e.g., "A user with the specified credential could not be found.")
     */
    private extractValidationError(handlerResult: HandlerResultContent | null): { message?: string; hResult?: string } {
        if (!handlerResult) {
            return {};
        }

        // First check for direct Exception at the top level of HandlerResult
        if (handlerResult.Exception?.Message) {
            return {
                message: handlerResult.Exception.Message,
                hResult: handlerResult.Exception.HResult,
            };
        }

        // Then check inside RecorderRecord.Values for Exception entries
        if (!handlerResult.RecorderRecord?.Values) {
            return {};
        }

        for (const entry of handlerResult.RecorderRecord.Values) {
            // Check for Exception in Validation.Values
            if (entry.Key === RecorderRecordKey.Validation && entry.Value) {
                const validationValue = entry.Value as {
                    Values?: Array<{ Key: string; Value: unknown }>;
                };
                if (validationValue.Values) {
                    for (const innerEntry of validationValue.Values) {
                        if (innerEntry.Key === "Exception" && typeof innerEntry.Value === "object") {
                            const exception = innerEntry.Value as { Message?: string; HResult?: string; Kind?: string };
                            if (exception.Message) {
                                return {
                                    message: exception.Message,
                                    hResult: exception.HResult,
                                };
                            }
                        }
                    }
                }
            }

            // Also check for direct Exception entry in RecorderRecord
            if (entry.Key === "Exception" && typeof entry.Value === "object") {
                const exception = entry.Value as { Message?: string; HResult?: string };
                if (exception.Message) {
                    return {
                        message: exception.Message,
                        hResult: exception.HResult,
                    };
                }
            }
        }

        return {};
    }
}

/**
 * Factory function for creating SelfAssertedValidationInterpreter instances.
 */
export function createSelfAssertedValidationInterpreter(): SelfAssertedValidationInterpreter {
    return new SelfAssertedValidationInterpreter();
}
