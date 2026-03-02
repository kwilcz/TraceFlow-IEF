/**
 * ValidateApiResponse Interpreter
 *
 * Handles the ValidateApiResponseHandler which fires after user interactions
 * such as HRD (Home Realm Discovery) selection. This handler contains the
 * TAGE (Target Entity) statebag entry with the ClaimsExchange ID that the
 * user selected.
 *
 * Key insight from log analysis:
 * - TAGE contains the ClaimsExchange ID (e.g., "ForgotPasswordExchange")
 * - Complex-API_RESULT.claimsexchange contains the same value
 * - This is the user's selection, not a technical profile ID
 *
 * Responsibilities:
 * - Extracts TAGE (Target Entity) from statebag
 * - Sets the selectedOption on the step builder
 * - Allows "invoked components" to show the user's selection
 */

import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import { VALIDATE_API_RESPONSE } from "../constants/handlers";
import { StatebagKey } from "../constants/keys";

/**
 * Interprets ValidateApiResponseHandler clips.
 *
 * This handler fires after user interactions and contains:
 * 1. TAGE (Target Entity) - The ClaimsExchange ID selected
 * 2. Complex-API_RESULT - Contains claimsexchange, IsContinue, etc.
 *
 * @example From logs:
 * ```json
 * {
 *   "Kind": "Predicate",
 *   "Content": "Web.TPEngine.StateMachineHandlers.ValidateApiResponseHandler"
 * },
 * {
 *   "Kind": "HandlerResult",
 *   "Content": {
 *     "Result": true,
 *     "Statebag": {
 *       "TAGE": { "v": "ForgotPasswordExchange", "p": true },
 *       "Complex-API_RESULT": {
 *         "IsContinue": "True",
 *         "claimsexchange": "ForgotPasswordExchange"
 *       }
 *     },
 *     "PredicateResult": "True"
 *   }
 * }
 * ```
 */
export class ValidateApiResponseInterpreter extends BaseInterpreter {
    readonly handlerNames = [VALIDATE_API_RESPONSE] as const;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerResult, pendingStepData } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        // Extract TAGE (Target Entity) - the ClaimsExchange ID selected by user
        const selectedOption = this.extractTargetEntity(handlerResult);

        if (selectedOption) {
            pendingStepData.selectedOption = selectedOption;
        }

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
        });
    }

    /**
     * Extracts the TAGE (Target Entity) from the handler result.
     * This represents the ClaimsExchange ID selected by the user in HRD flow.
     */
    private extractTargetEntity(handlerResult: { Statebag?: Record<string, unknown> }): string | null {
        if (!handlerResult.Statebag) {
            return null;
        }

        const tage = handlerResult.Statebag[StatebagKey.TAGE];
        return this.extractStatebagEntryValue(tage);
    }
}

/**
 * Factory function for creating ValidateApiResponseInterpreter instances.
 */
export function createValidateApiResponseInterpreter(): ValidateApiResponseInterpreter {
    return new ValidateApiResponseInterpreter();
}
