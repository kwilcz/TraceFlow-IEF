/**
 * Global Exception Interpreter
 *
 * Handles NoOpHandler clips that fire after a global B2C exception state
 * transition (EventName: "Global", StateName: "...SomeException").
 *
 * When ctx.pendingGlobalError is set, this interpreter captures the
 * Complex-API_RESULT diagnostics from the statebag and merges them into
 * the result's globalError field so they accumulate onto the flow-level error.
 *
 * When ctx.pendingGlobalError is NOT set, this is a normal NoOpHandler
 * invocation and the interpreter falls through to vanilla successNoOp behavior.
 */

import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import { NO_OP_HANDLER } from "../constants/handlers";

/**
 * Interprets NoOpHandler clips in the context of a global exception flow.
 */
export class GlobalExceptionInterpreter extends BaseInterpreter {
    readonly handlerNames = [NO_OP_HANDLER] as const;

    canHandle(handlerName: string): boolean {
        return handlerName === NO_OP_HANDLER;
    }

    interpret(context: InterpretContext): InterpretResult {
        const statebagUpdates = context.handlerResult
            ? this.extractStatebagFromResult(context.handlerResult)
            : {};
        const claimsUpdates = context.handlerResult
            ? this.extractClaimsFromResult(context.handlerResult)
            : {};

        // GUARD: If no pending global error, behave as a normal NoOpHandler
        if (!context.pendingGlobalError) {
            return this.successNoOp({ statebagUpdates, claimsUpdates });
        }

        // Extract Complex-API_RESULT from statebag — it is a plain object, NOT a {v,k,c} wrapper
        const apiResult = context.handlerResult?.Statebag?.["Complex-API_RESULT"] as
            | Record<string, string | undefined>
            | undefined;

        const errorCode   = apiResult?.["code"];
        const description = apiResult?.["desc"];
        const diagnostics = apiResult?.["diags"];
        const csrfToken   = apiResult?.["csrf_token"];

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            globalError: {
                ...context.pendingGlobalError,
                ...(errorCode   !== undefined && { errorCode }),
                ...(description !== undefined && { description }),
                ...(diagnostics !== undefined && { diagnostics }),
                ...(csrfToken   !== undefined && { csrfToken }),
            },
        });
    }
}

/**
 * Factory function for creating GlobalExceptionInterpreter instances.
 */
export function createGlobalExceptionInterpreter(): GlobalExceptionInterpreter {
    return new GlobalExceptionInterpreter();
}
