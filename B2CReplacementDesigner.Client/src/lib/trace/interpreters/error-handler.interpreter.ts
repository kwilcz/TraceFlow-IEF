/**
 * Error Handler Interpreter
 *
 * Handles early validation errors and error sending handlers:
 * - InitiatingMessageValidationHandler: Validates incoming OAuth/OIDC requests
 * - SendErrorHandler: Sends error responses back to relying party
 *
 * These handlers fire during early flow failures (invalid redirect URI, client ID, etc.)
 * and may not have a corresponding orchestration step.
 */

import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import type { HandlerResultContent, RecorderRecordEntry } from "@/types/journey-recorder";

/**
 * Handler names for error-related handlers.
 */
const ERROR_HANDLER_NAMES = [
    "Web.TPEngine.StateMachineHandlers.InitiatingMessageValidationHandler",
    "Web.TPEngine.StateMachineHandlers.SendErrorHandler",
] as const;

/**
 * Interpreter for error handlers that may fail early in the flow.
 * Creates an error step when validation fails or errors are sent.
 */
export class ErrorHandlerInterpreter extends BaseInterpreter {
    readonly handlerNames = ERROR_HANDLER_NAMES;

    canHandle(handlerName: string): boolean {
        return ERROR_HANDLER_NAMES.some(
            (name) => name === handlerName || handlerName.includes(name)
        );
    }

    interpret(context: InterpretContext): InterpretResult {
        const { handlerResult, handlerName } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        // Extract statebag and claims updates
        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        // Check if this is a validation failure (Result: false) or error sending
        const isValidationFailure = handlerResult.Result === false;
        const isErrorHandler = handlerName.includes("SendErrorHandler");
        const exception = handlerResult.Exception;

        if (isValidationFailure || isErrorHandler) {
            // Extract error message and HResult from Exception or RecorderRecord
            const errorInfo = this.extractErrorInfo(handlerResult);

            if (errorInfo.message) {
                // Mark current step as error if one exists
                // The error step will be created by the parser's handleFatalException equivalent
                return {
                    success: true,
                    createStep: true,
                    finalizeStep: false,
                    statebagUpdates,
                    claimsUpdates,
                    stepResult: "Error",
                    error: errorInfo.message,
                    errorHResult: errorInfo.hResult,
                    actionHandler: this.getActionHandlerName(handlerName),
                };
            }
        }

        // No error, just extract statebag/claims
        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
        });
    }

    /**
     * Extracts error information (message and HResult) from handler result.
     */
    private extractErrorInfo(result: HandlerResultContent): { message?: string; hResult?: string } {
        // First check for direct Exception
        if (result.Exception?.Message) {
            return {
                message: result.Exception.Message,
                hResult: result.Exception.HResult,
            };
        }

        // Check RecorderRecord for exception details
        if (result.RecorderRecord?.Values) {
            for (const entry of result.RecorderRecord.Values) {
                if (entry.Key === "Validation" && typeof entry.Value === "object") {
                    const validationValues = (entry.Value as { Values?: RecorderRecordEntry[] }).Values;
                    if (validationValues) {
                        for (const v of validationValues) {
                            if (v.Key === "Exception" && typeof v.Value === "object") {
                                const exception = v.Value as { Message?: string; HResult?: string };
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

                // Check for direct Exception entry
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
        }

        return {};
    }

    /**
     * Gets a cleaner action handler name for display.
     */
    private getActionHandlerName(handlerName: string): string {
        if (handlerName.includes("InitiatingMessageValidationHandler")) {
            return "InitiatingMessageValidationHandler";
        }
        if (handlerName.includes("SendErrorHandler")) {
            return "SendErrorHandler";
        }
        return handlerName.split(".").pop() ?? handlerName;
    }
}

/**
 * Factory function for creating the error handler interpreter.
 */
export function createErrorHandlerInterpreter(): ErrorHandlerInterpreter {
    return new ErrorHandlerInterpreter();
}
