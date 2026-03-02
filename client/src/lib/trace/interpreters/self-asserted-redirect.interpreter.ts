/**
 * Self-Asserted Redirect Interpreter
 *
 * Handles the SelfAssertedAttributeProviderRedirectHandler which fires when
 * the B2C engine redirects to a self-asserted user-facing form.
 *
 * Responsibilities:
 * - Captures statebag and claims updates from the redirect
 * - Marks the step as interactive (awaiting user input)
 * - Sets actionHandler to SELF_ASSERTED_REDIRECT
 */

import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import { SELF_ASSERTED_REDIRECT } from "../constants/handlers";

/**
 * Interprets SelfAssertedAttributeProviderRedirectHandler clips.
 *
 * This handler fires when the B2C engine redirects the user to a
 * self-asserted form (e.g., registration, profile edit, password entry).
 * It marks the step as interactive and awaiting user input.
 */
export class SelfAssertedRedirectInterpreter extends BaseInterpreter {
    readonly handlerNames = [SELF_ASSERTED_REDIRECT] as const;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerResult, pendingStepData } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        pendingStepData.actionHandler = SELF_ASSERTED_REDIRECT;

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
        });
    }
}

/**
 * Factory function for creating SelfAssertedRedirectInterpreter instances.
 */
export function createSelfAssertedRedirectInterpreter(): SelfAssertedRedirectInterpreter {
    return new SelfAssertedRedirectInterpreter();
}
