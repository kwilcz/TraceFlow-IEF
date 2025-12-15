/**
 * Step Invoke Interpreter
 *
 * Handles ShouldOrchestrationStepBeInvokedHandler which determines
 * if an orchestration step should be executed.
 *
 * Also handles IsClaimsExchangeProtocolAServiceCallHandler which contains
 * InitiatingClaimsExchange data with TechnicalProfileId and ProtocolProviderType.
 *
 * Key insight from log analysis:
 * - Single TechnicalProfileEnabled = orchestration step with specific TP (e.g., AAD-UserReadUsingObjectId)
 * - Multiple TechnicalProfileEnabled = HRD-style selection (handled by HomeRealmDiscoveryInterpreter)
 * - TechnicalProfileEnabled in SendClaims transition = token issuer TP (e.g., JwtIssuer)
 * - InitiatingClaimsExchange = service call with TP and provider type info
 *
 * Responsibilities:
 * - Extracts single triggered TP for non-HRD steps
 * - Extracts multiple available TPs for HRD-style steps
 * - Captures current step number
 * - Extracts TP and provider type from InitiatingClaimsExchange
 */

import type { HandlerResultContent } from "@/types/journey-recorder";
import type { TechnicalProfileDetail } from "@/types/trace";
import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import { SHOULD_STEP_BE_INVOKED, CLAIMS_EXCHANGE_SERVICE_CALL, CLAIMS_EXCHANGE_API } from "../constants/handlers";
import { RecorderRecordKey } from "../constants/keys";

/**
 * Interprets ShouldOrchestrationStepBeInvokedHandler clips.
 *
 * This handler runs before each orchestration step to determine
 * which technical profiles are enabled and available.
 *
 * Also handles IsClaimsExchangeProtocolAnApiHandler which fires for
 * SelfAsserted (API-style) TPs and contains InitiatingClaimsExchange
 * with full TP details including ProtocolProviderType.
 *
 * @example Single TP (non-HRD):
 * ```json
 * { "Key": "EnabledForUserJourneysTrue", "Value": { "Values": [
 *   { "Key": "CurrentStep", "Value": 13 },
 *   { "Key": "TechnicalProfileEnabled", "Value": { "TechnicalProfile": "AAD-UserReadUsingObjectId" } }
 * ] } }
 * ```
 *
 * @example SendClaims (token issuance):
 * ```json
 * { "Key": "EnabledForUserJourneysTrue", "Value": { "Values": [
 *   { "Key": "CurrentStep", "Value": 19 },
 *   { "Key": "TechnicalProfileEnabled", "Value": { "TechnicalProfile": "JwtIssuer" } }
 * ] } }
 * ```
 *
 * @example IsClaimsExchangeProtocolAnApiHandler (SelfAsserted):
 * ```json
 * { "Key": "InitiatingClaimsExchange", "Value": {
 *   "ProtocolType": "Identity Experience Engine API",
 *   "TargetEntity": "UserJourneySelection",
 *   "TechnicalProfileId": "EmailVerification",
 *   "ProtocolProviderType": "SelfAssertedAttributeProvider"
 * } }
 * ```
 */
export class StepInvokeInterpreter extends BaseInterpreter {
    readonly handlerNames = [SHOULD_STEP_BE_INVOKED, CLAIMS_EXCHANGE_SERVICE_CALL, CLAIMS_EXCHANGE_API] as const;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerResult, stepBuilder } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        // Extract available technical profiles from EnabledForUserJourneysTrue
        const { technicalProfiles: selectableOptions, currentStep } = this.extractEnabledTechnicalProfiles(handlerResult);

        // Extract from InitiatingClaimsExchange (used by IsClaimsExchangeProtocolAServiceCallHandler)
        const initiatingExchange = this.extractInitiatingClaimsExchange(handlerResult);

        // Determine triggered TP based on number of options:
        // - Single option = that's the triggered TP
        // - Multiple options = HRD step, no single triggered TP yet
        // - InitiatingClaimsExchange provides TP directly
        const isSingleTpStep = selectableOptions.length === 1;
        const technicalProfiles = initiatingExchange?.id
            ? [initiatingExchange.id]
            : isSingleTpStep
                ? selectableOptions
                : [];

        // Multiple selectable options = interactive (HRD) step
        const isInteractive = selectableOptions.length > 1;

        // For single-TP steps, add the TP to the step builder
        if (technicalProfiles.length > 0) {
            stepBuilder.addTechnicalProfiles(technicalProfiles);
        }

        // Add technical profile details if we have provider type info
        if (initiatingExchange) {
            stepBuilder.addTechnicalProfileDetail(initiatingExchange);
        }

        // For multi-TP (HRD) steps, add as selectable options
        if (isInteractive) {
            stepBuilder.addSelectableOptions(selectableOptions).asInteractiveStep();
        }

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            selectableOptions: isInteractive ? selectableOptions : undefined,
            technicalProfiles: technicalProfiles.length > 0 ? technicalProfiles : undefined,
            technicalProfileDetails: initiatingExchange ? [initiatingExchange] : undefined,
            isInteractive,
        });
    }

    /**
     * Extracts technical profiles marked as EnabledForUserJourneysTrue.
     */
    private extractEnabledTechnicalProfiles(
        handlerResult: HandlerResultContent | null
    ): { technicalProfiles: string[]; currentStep: number | null } {
        const result = { technicalProfiles: [] as string[], currentStep: null as number | null };

        if (!handlerResult?.RecorderRecord?.Values) {
            return result;
        }

        for (const entry of handlerResult.RecorderRecord.Values) {
            if (entry.Key === RecorderRecordKey.EnabledForUserJourneysTrue && entry.Value) {
                const value = entry.Value as {
                    Values?: Array<{ Key: string; Value: unknown }>;
                };
                if (value.Values) {
                    for (const innerEntry of value.Values) {
                        if (innerEntry.Key === RecorderRecordKey.CurrentStep) {
                            result.currentStep = innerEntry.Value as number;
                        }
                        if (innerEntry.Key === RecorderRecordKey.TechnicalProfileEnabled) {
                            const tp = innerEntry.Value as { TechnicalProfile?: string };
                            if (tp.TechnicalProfile && !result.technicalProfiles.includes(tp.TechnicalProfile)) {
                                result.technicalProfiles.push(tp.TechnicalProfile);
                            }
                        }
                    }
                }
            }
        }

        return result;
    }

    /**
     * Extracts technical profile details from InitiatingClaimsExchange record.
     * This is used by IsClaimsExchangeProtocolAServiceCallHandler predicate.
     *
     * @example From logs:
     * ```json
     * { "Key": "InitiatingClaimsExchange", "Value": {
     *   "ProtocolType": "backend protocol",
     *   "TargetEntity": "ClaimsExchange",
     *   "TechnicalProfileId": "AAD-UserReadUsingObjectId",
     *   "ProtocolProviderType": "AzureActiveDirectoryProvider"
     * } }
     * ```
     */
    private extractInitiatingClaimsExchange(
        handlerResult: HandlerResultContent | null
    ): TechnicalProfileDetail | null {
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
                        providerType: value.ProtocolProviderType ?? "",
                        protocolType: value.ProtocolType,
                    };
                }
            }
        }

        return null;
    }
}

/**
 * Factory function for creating StepInvokeInterpreter instances.
 */
export function createStepInvokeInterpreter(): StepInvokeInterpreter {
    return new StepInvokeInterpreter();
}
