/**
 * SSO Session Interpreter
 *
 * Handles SSO-related handlers in B2C traces:
 * - IsSSOSessionParticipantHandler: Checks if SSO session exists
 * - SSOSessionHandler: Manages SSO session state
 * - ActivateSSOSessionHandler: Activates SSO session after successful auth
 * - ResetSSOSessionHandler: Resets SSO session
 *
 * Key behaviors:
 * - SSO participant detection indicates if the step can use existing session
 * - SSO activation marks when a new session is established
 * - Claims can be restored from existing SSO sessions
 */

import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import {
    SSO_PARTICIPANT,
    SSO_SESSION,
    SSO_ACTIVATE,
    SSO_RESET,
    SSO_HANDLERS,
} from "../constants/handlers";

/**
 * Interprets SSO-related handler clips.
 */
export class SsoSessionInterpreter extends BaseInterpreter {
    readonly handlerNames = SSO_HANDLERS;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerName, handlerResult } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        switch (handlerName) {
            case SSO_PARTICIPANT:
            case SSO_SESSION:
            case SSO_ACTIVATE:
            case SSO_RESET:
            default:
                return this.successNoOp({ statebagUpdates, claimsUpdates });
        }
    }

    // SSO-specific stepBuilder calls (withSsoSessionParticipant, withSsoSessionActivated)
    // have been removed. SSO data is now statebag-only; no flowChildren needed.
}

/**
 * Factory function for creating SsoSessionInterpreter instances.
 */
export function createSsoSessionInterpreter(): SsoSessionInterpreter {
    return new SsoSessionInterpreter();
}
