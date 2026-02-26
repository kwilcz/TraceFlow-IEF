/**
 * Home Realm Discovery (HRD) Interpreter
 *
 * Handles the HomeRealmDiscoveryHandler which manages identity
 * provider selection in multi-provider scenarios.
 *
 * Key insight from log analysis:
 * - HRD shows AVAILABLE TPs (multiple TechnicalProfileEnabled entries)
 * - User hasn't selected yet at this point
 * - CTP statebag appears AFTER user selection in a subsequent event batch
 *
 * Responsibilities:
 * - Extracts AVAILABLE identity providers (not the selected one)
 * - Marks steps as interactive (requiring user selection)
 * - Does NOT try to determine triggered TP (that comes later via CTP)
 */

import type { HandlerResultContent } from "@/types/journey-recorder";
import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import { HOME_REALM_DISCOVERY_ACTION, HRD_HANDLERS } from "../constants/handlers";
import { RecorderRecordKey } from "../constants/keys";

/**
 * Interprets HomeRealmDiscoveryHandler clips.
 *
 * HRD is used when:
 * 1. Multiple IdPs are available (social + local)
 * 2. User needs to select their identity provider
 * 3. CombinedSignInAndSignUp presents login options
 *
 * @example From logs:
 * ```json
 * { "Key": "HomeRealmDiscovery", "Value": { "Values": [
 *   { "Key": "CurrentStep", "Value": 4 },
 *   { "Key": "TechnicalProfileEnabled", "Value": { "TechnicalProfile": "SelfAsserted-LocalAccountSigninOnly" } },
 *   { "Key": "TechnicalProfileEnabled", "Value": { "TechnicalProfile": "Google-OAuth2" } },
 *   { "Key": "TechnicalProfileEnabled", "Value": { "TechnicalProfile": "LinkedIn-OAuth2" } }
 * ] } }
 * ```
 */
export class HomeRealmDiscoveryInterpreter extends BaseInterpreter {
    readonly handlerNames = HRD_HANDLERS;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerResult, stepBuilder } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        // Extract AVAILABLE providers - these are options, not the selected TP
        const selectableOptions = this.extractAvailableProviders(handlerResult);

        // HRD steps are interactive selection steps.
        // The technical profile (CTP) is only set AFTER user selection in a subsequent event.
        // We should NOT add any technical profiles here - only selectable options.
        // If we add TPs here, they will leak to subsequent steps since the step builder
        // is reused until a new step is created.

        stepBuilder
            .withActionHandler(HOME_REALM_DISCOVERY_ACTION)
            .addSelectableOptions(selectableOptions)
            .asInteractiveStep();

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
        });
    }

    // =========================================================================
    // Extraction Methods - HRD specific
    // =========================================================================

    /**
     * Extracts AVAILABLE identity providers from HRD handler result.
     *
     * Note: These are OPTIONS, not the triggered/selected TP.
     * The triggered TP will appear in CTP statebag after user selection.
     */
    private extractAvailableProviders(
        handlerResult: HandlerResultContent
    ): string[] {
        if (!handlerResult.RecorderRecord?.Values) {
            return [];
        }

        const providers: string[] = [];

        for (const entry of handlerResult.RecorderRecord.Values) {
            // HomeRealmDiscovery record contains available TPs
            if (entry.Key === RecorderRecordKey.HomeRealmDiscovery && entry.Value) {
                const value = entry.Value as {
                    Values?: Array<{ Key: string; Value: unknown }>;
                };
                if (value.Values) {
                    for (const innerEntry of value.Values) {
                        if (innerEntry.Key === RecorderRecordKey.TechnicalProfileEnabled) {
                            const tp = innerEntry.Value as {
                                TechnicalProfile?: string;
                                EnabledResult?: boolean;
                            };
                            // Only include enabled TPs
                            if (tp.TechnicalProfile && tp.EnabledResult !== false) {
                                providers.push(tp.TechnicalProfile);
                            }
                        }
                    }
                }
            }
        }

        return Array.from(new Set(providers));
    }
}

/**
 * Factory function for creating HomeRealmDiscoveryInterpreter instances.
 */
export function createHomeRealmDiscoveryInterpreter(): HomeRealmDiscoveryInterpreter {
    return new HomeRealmDiscoveryInterpreter();
}
