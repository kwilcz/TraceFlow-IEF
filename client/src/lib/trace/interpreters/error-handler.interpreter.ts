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
import type { ExceptionContent, HandlerResultContent, RecorderRecordEntry } from "@/types/journey-recorder";
import type { StepError } from "@/types/flow-node";

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

        if (isValidationFailure || isErrorHandler) {
            // Extract error message and HResult from Exception or RecorderRecord
            const errorInfo = this.extractErrorInfo(handlerResult);

            // When SendErrorHandler fires during a global exception context — surface as
            // flow-level globalError rather than creating a step-level error node.
            if (isErrorHandler && context.pendingGlobalError) {
                const stepErrorEntry = errorInfo.message
                    ? [{
                        kind: "Handled" as const,
                        hResult: errorInfo.hResult ?? "",
                        message: errorInfo.message,
                        data: errorInfo.data,
                        innerExceptions: errorInfo.innerExceptions,
                    }]
                    : undefined;

                return {
                    success: true,
                    createStep: false,
                    finalizeStep: false,
                    statebagUpdates,
                    claimsUpdates,
                    ...(errorInfo.message !== undefined && {
                        stepResult: "Error" as const,
                        error: errorInfo.message,
                        errorHResult: errorInfo.hResult,
                        stepErrors: stepErrorEntry,
                    }),
                    globalError: {
                        ...context.pendingGlobalError,
                        ...(errorInfo.message !== undefined && { message: errorInfo.message }),
                        ...(errorInfo.hResult !== undefined && { hResult: errorInfo.hResult }),
                        ...(errorInfo.data !== undefined && { data: errorInfo.data }),
                        ...(errorInfo.innerExceptions !== undefined && { innerExceptions: errorInfo.innerExceptions }),
                    },
                };
            }

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
                    stepErrors: [{
                        kind: "Unhandled",
                        hResult: errorInfo.hResult ?? "",
                        message: errorInfo.message!,
                        data: errorInfo.data,
                        innerExceptions: errorInfo.innerExceptions,
                    }],
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
     * Extracts error information (message, HResult, Data, and inner exception chain) from handler result.
     */
    private extractErrorInfo(result: HandlerResultContent): { message?: string; hResult?: string; data?: Record<string, unknown>; innerExceptions?: readonly StepError[] } {
        // First check for direct Exception
        if (result.Exception?.Message) {
            const specific = this.findMostSpecificException(result.Exception);
            return {
                message: specific.Message,
                hResult: specific.HResult,
                data: specific.Data as Record<string, unknown> | undefined,
                innerExceptions: this.buildInnerExceptionChain(specific.Exception),
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
                                const exception = v.Value as ExceptionContent;
                                if (exception.Message) {
                                    const specific = this.findMostSpecificException(exception);
                                    return {
                                        message: specific.Message,
                                        hResult: specific.HResult,
                                        data: specific.Data as Record<string, unknown> | undefined,
                                        innerExceptions: this.buildInnerExceptionChain(specific.Exception),
                                    };
                                }
                            }
                        }
                    }
                }

                // Check for direct Exception entry
                if (entry.Key === "Exception" && typeof entry.Value === "object") {
                    const exception = entry.Value as ExceptionContent;
                    if (exception.Message) {
                        const specific = this.findMostSpecificException(exception);
                        return {
                            message: specific.Message,
                            hResult: specific.HResult,
                            data: specific.Data as Record<string, unknown> | undefined,
                            innerExceptions: this.buildInnerExceptionChain(specific.Exception),
                        };
                    }
                }
            }
        }

        return {};
    }

    /**
     * Traverses a nested exception chain and returns the most specific exception.
     * Prefers the first nested exception that has "technicalProfile.Id" in its Data.
     * Falls back to the first nested exception, then to the root exception.
     */
    private findMostSpecificException(exception: ExceptionContent): ExceptionContent {
        let current: ExceptionContent | undefined = exception.Exception;
        let withTpId: ExceptionContent | undefined;
        let firstNested: ExceptionContent | undefined;

        while (current) {
            if (firstNested === undefined) {
                firstNested = current;
            }
            if (current.Data && "technicalProfile.Id" in current.Data) {
                withTpId = current;
                break;
            }
            current = current.Exception;
        }

        return withTpId ?? firstNested ?? exception;
    }

    /**
     * Recursively builds an inner exception chain from a nested ExceptionContent.
     * Returns a single-element array containing the exception and its descendants,
     * or undefined if the exception is absent.
     * The chain starts at the exception BELOW the most-specific primary exception.
     */
    private buildInnerExceptionChain(exception: ExceptionContent | undefined): readonly StepError[] | undefined {
        if (!exception) return undefined;
        return [{
            kind: (exception.Kind ?? "Unhandled") as "Handled" | "Unhandled",
            hResult: exception.HResult ?? "",
            message: exception.Message,
            data: exception.Data as Record<string, unknown> | undefined,
            innerExceptions: this.buildInnerExceptionChain(exception.Exception),
        }];
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
