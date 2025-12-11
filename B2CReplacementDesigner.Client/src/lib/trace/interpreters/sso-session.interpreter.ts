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

import type { HandlerResultContent } from "@/types/journey-recorder";
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
                return this.handleSsoParticipant(handlerResult, statebagUpdates, claimsUpdates);

            case SSO_SESSION:
                return this.handleSsoSession(handlerResult, statebagUpdates, claimsUpdates);

            case SSO_ACTIVATE:
                return this.handleSsoActivate(handlerResult, statebagUpdates, claimsUpdates);

            case SSO_RESET:
                return this.handleSsoReset(handlerResult, statebagUpdates, claimsUpdates);

            default:
                return this.successNoOp({ statebagUpdates, claimsUpdates });
        }
    }

    /**
     * Handles IsSSOSessionParticipantHandler - predicate that checks SSO participation.
     * PredicateResult "True" means SSO session exists and can be used.
     * PredicateResult "False" means no valid SSO session.
     */
    private handleSsoParticipant(
        handlerResult: HandlerResultContent,
        statebagUpdates: Record<string, string>,
        claimsUpdates: Record<string, string>
    ): InterpretResult {
        const predicateResult = handlerResult.PredicateResult;
        const isParticipant = predicateResult === "True";

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            ssoSessionParticipant: isParticipant,
        });
    }

    /**
     * Handles SSOSessionHandler - manages SSO session state.
     */
    private handleSsoSession(
        handlerResult: HandlerResultContent,
        statebagUpdates: Record<string, string>,
        claimsUpdates: Record<string, string>
    ): InterpretResult {
        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
        });
    }

    /**
     * Handles ActivateSSOSessionHandler - activates SSO session after auth.
     */
    private handleSsoActivate(
        handlerResult: HandlerResultContent,
        statebagUpdates: Record<string, string>,
        claimsUpdates: Record<string, string>
    ): InterpretResult {
        // SSO activation is marked by a successful Result
        const isActivated = handlerResult.Result === true;

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            ssoSessionActivated: isActivated,
        });
    }

    /**
     * Handles ResetSSOSessionHandler - resets SSO session.
     */
    private handleSsoReset(
        handlerResult: HandlerResultContent,
        statebagUpdates: Record<string, string>,
        claimsUpdates: Record<string, string>
    ): InterpretResult {
        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            // Reset implies session was invalidated
            ssoSessionParticipant: false,
        });
    }
}

/**
 * Factory function for creating SsoSessionInterpreter instances.
 */
export function createSsoSessionInterpreter(): SsoSessionInterpreter {
    return new SsoSessionInterpreter();
}
