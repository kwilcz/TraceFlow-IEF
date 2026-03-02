/**
 * Self-Asserted Action Interpreter
 *
 * Handles the SelfAssertedAttributeProviderActionHandler which fires
 * to finalize the self-asserted step after the user completes the form.
 *
 * Responsibilities:
 * - Captures statebag and claims updates from the action
 * - Finalizes the self-asserted step with a "Success" result
 * - Sets actionHandler to SELF_ASSERTED_ACTION
 */

import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import { SELF_ASSERTED_ACTION } from "../constants/handlers";

/**
 * Interprets SelfAssertedAttributeProviderActionHandler clips.
 *
 * This handler fires when the user has completed the self-asserted form
 * and the step is being finalized. It marks the step as successfully
 * completed and captures any final statebag/claims updates.
 */
export class SelfAssertedActionInterpreter extends BaseInterpreter {
    readonly handlerNames = [SELF_ASSERTED_ACTION] as const;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerResult, pendingStepData } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        pendingStepData.actionHandler = SELF_ASSERTED_ACTION;

        return this.successFinalizeStep({
            statebagUpdates,
            claimsUpdates,
            stepResult: "Success",
        });
    }
}

/**
 * Factory function for creating SelfAssertedActionInterpreter instances.
 */
export function createSelfAssertedActionInterpreter(): SelfAssertedActionInterpreter {
    return new SelfAssertedActionInterpreter();
}
