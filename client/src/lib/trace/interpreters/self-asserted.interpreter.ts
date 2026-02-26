/**
 * Self-Asserted Interpreter
 *
 * Handles self-asserted technical profile handlers that manage user
 * input forms and validation in B2C policies.
 *
 * Key insight from log analysis:
 * - SelfAssertedMessageValidationHandler contains ValidationTechnicalProfile
 * - ValidationTechnicalProfile.TechnicalProfileId shows the validation TP (e.g., "login-NonInteractive")
 * - CTP statebag shows the self-asserted TP itself (e.g., "SelfAsserted-LocalAccountSignin-Email:1")
 * - Exception in RecorderRecord.Values.Validation indicates validation failure
 *
 * Responsibilities:
 * - Tracks form submissions and validation
 * - Marks steps as interactive
 * - Captures both self-asserted TP (from CTP) and validation TP (from ValidationTechnicalProfile)
 * - Detects and reports validation errors from Exception in handler result
 */

import type { HandlerResultContent, RecorderRecordEntry } from "@/types/journey-recorder";
import type { ClaimsTransformationDetail, ClaimMapping } from "@/types/trace";
import type { TraceStepBuilder } from "../domain/trace-step-builder";
import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import {
    SELF_ASSERTED_ACTION,
    SELF_ASSERTED_REDIRECT,
    SELF_ASSERTED_VALIDATION,
    SELF_ASSERTED_HANDLERS,
} from "../constants/handlers";
import { RecorderRecordKey, StatebagKey, extractTechnicalProfileFromCTP } from "../constants/keys";

/**
 * Interprets SelfAsserted handler clips.
 *
 * Self-asserted steps are used for:
 * 1. User registration forms
 * 2. Profile edit pages
 * 3. Password entry screens
 * 4. Any step requiring user input
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
export class SelfAssertedInterpreter extends BaseInterpreter {
    readonly handlerNames = SELF_ASSERTED_HANDLERS;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerName, handlerResult, stepBuilder } = context;

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

        // Main technical profile from CTP
        const technicalProfiles: string[] = [];
        if (selfAssertedTp) technicalProfiles.push(selfAssertedTp);

        // Add validation TPs to the builder separately
        for (const vtp of validationTps) {
            stepBuilder.addValidationTechnicalProfile(vtp);
        }

        // Add claim mappings
        for (const mapping of claimMappings) {
            stepBuilder.addClaimMapping(mapping);
        }

        const claimsTransformations = this.extractClaimsTransformations(handlerResult);

        switch (handlerName) {
            case SELF_ASSERTED_REDIRECT:
                return this.handleRedirect(stepBuilder, statebagUpdates, claimsUpdates, technicalProfiles);

            case SELF_ASSERTED_VALIDATION:
                return this.handleValidation(
                    stepBuilder,
                    statebagUpdates,
                    claimsUpdates,
                    technicalProfiles,
                    handlerResult
                );

            case SELF_ASSERTED_ACTION:
            default:
                return this.handleAction(
                    stepBuilder,
                    statebagUpdates,
                    claimsUpdates,
                    technicalProfiles,
                    claimsTransformations
                );
        }
    }

    // =========================================================================
    // Handler Methods
    // =========================================================================

    /**
     * Handles redirect to self-asserted form.
     * Marks the step as interactive and awaiting user input.
     */
    private handleRedirect(
        stepBuilder: TraceStepBuilder,
        statebagUpdates: Record<string, string>,
        claimsUpdates: Record<string, string>,
        technicalProfiles: string[]
    ): InterpretResult {
        stepBuilder
            .withEventType("SELFASSERTED")
            .withActionHandler(SELF_ASSERTED_REDIRECT)
            .addTechnicalProfiles(technicalProfiles)
            .asInteractiveStep();

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
        });
    }

    /**
     * Handles self-asserted form validation.
     * This is when the validation TP is called to validate user input.
     * Checks for exceptions in handler result which indicate validation failures.
     */
    private handleValidation(
        stepBuilder: TraceStepBuilder,
        statebagUpdates: Record<string, string>,
        claimsUpdates: Record<string, string>,
        technicalProfiles: string[],
        handlerResult: HandlerResultContent | null
    ): InterpretResult {
        stepBuilder
            .withEventType("SELFASSERTED")
            .withActionHandler(SELF_ASSERTED_VALIDATION)
            .addTechnicalProfiles(technicalProfiles)
            .asInteractiveStep();

        // Check for validation errors (Exception in handler result)
        const errorInfo = this.extractValidationError(handlerResult);

        if (errorInfo.message) {
            return this.successNoOp({
                statebagUpdates,
                claimsUpdates,
                stepResult: "Error",
                error: errorInfo.message,
                errorHResult: errorInfo.hResult,
            });
        }

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
        });
    }

    /**
     * Handles self-asserted form submission.
     * This is when the user has completed the form.
     */
    private handleAction(
        stepBuilder: TraceStepBuilder,
        statebagUpdates: Record<string, string>,
        claimsUpdates: Record<string, string>,
        technicalProfiles: string[],
        claimsTransformations: ClaimsTransformationDetail[]
    ): InterpretResult {
        stepBuilder
            .withEventType("SELFASSERTED")
            .withActionHandler(SELF_ASSERTED_ACTION)
            .addTechnicalProfiles(technicalProfiles)
            .asInteractiveStep();

        for (const transformation of claimsTransformations) {
            stepBuilder.addClaimsTransformationDetail(transformation);
        }

        return this.successFinalizeStep({
            statebagUpdates,
            claimsUpdates,
            stepResult: "Success",
        });
    }

    // =========================================================================
    // Extraction Methods - SelfAsserted specific
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
     * Extracts claims transformation details from handler result.
     *
     * Used for self-asserted steps that include output claims transformations.
     */
    private extractClaimsTransformations(handlerResult: HandlerResultContent | null): ClaimsTransformationDetail[] {
        if (!handlerResult?.RecorderRecord?.Values) {
            return [];
        }

        const transformations: ClaimsTransformationDetail[] = [];

        for (const entry of handlerResult.RecorderRecord.Values) {
            if (entry.Key === RecorderRecordKey.GettingClaims && entry.Value) {
                const gettingClaims = entry.Value as {
                    InitiatingOutputClaimsTransformation?: {
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
            }
        }

        return transformations;
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
 * Factory function for creating SelfAssertedInterpreter instances.
 */
export function createSelfAssertedInterpreter(): SelfAssertedInterpreter {
    return new SelfAssertedInterpreter();
}
