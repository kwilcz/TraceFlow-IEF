/**
 * Base Interpreter
 *
 * Defines the interface and shared functionality for all clip interpreters.
 * Each interpreter is responsible for handling a specific type of B2C action handler.
 *
 * IMPORTANT: This base class should ONLY contain:
 * - Result builder methods (successNoOp, successCreateStep, etc.)
 * - Core statebag/claims extraction used by ALL interpreters
 * - Utility methods for clip navigation
 *
 * Domain-specific extraction logic belongs in the dedicated interpreters.
 */

import type { Clip, ClipsArray, HandlerResultContent } from "@/types/journey-recorder";
import type {
    StepResult,
} from "@/types/trace";
import type { FlowNodeChild, StepError } from "@/types/flow-node";
import type { JourneyStack } from "../domain/journey-stack";
import type { PendingStepData } from "../pipeline/clip-processing-context";
import { ClipKind, StatebagKey } from "../constants/keys";

/**
 * Context provided to interpreters during clip processing.
 */
export interface InterpretContext {
    /** The current clip being processed */
    clip: Clip;

    /** Index of the clip in the clips array */
    clipIndex: number;

    /** Full clips array for lookahead */
    clips: ClipsArray;

    /** The action handler name (from Action clip) */
    handlerName: string;

    /** Handler result content (from HandlerResult clip) */
    handlerResult: HandlerResultContent | null;

    /** Current journey stack */
    journeyStack: JourneyStack;

    /** Mutable step data accumulated during interpretation. Replaces TraceStepBuilder. */
    pendingStepData: PendingStepData;

    /** Current sequence number */
    sequenceNumber: number;

    /** Timestamp of the current log */
    timestamp: Date;

    /** ID of the log entry for syncing with log viewer */
    logId: string;

    /** Accumulated statebag state */
    statebag: Record<string, string>;

    /** Accumulated claims state */
    claims: Record<string, string>;
}

/**
 * Result of clip interpretation.
 */
export interface InterpretResult {
    /** Whether interpretation was successful */
    success: boolean;

    /** Whether a new step should be created */
    createStep: boolean;

    /** Whether to finalize the current step */
    finalizeStep: boolean;

    /** Updated statebag entries */
    statebagUpdates?: Record<string, string>;

    /** Updated claims entries */
    claimsUpdates?: Record<string, string>;

    /** SubJourney to push onto stack */
    pushSubJourney?: { journeyId: string; journeyName: string };

    /** Number of SubJourney levels to pop from the stack (0 or undefined = no pop) */
    popSubJourney?: number;

    /** Error message if interpretation failed */
    error?: string;

    /** HResult error code (hex string without 0x prefix) */
    errorHResult?: string;

    /** Step result override */
    stepResult?: StepResult;

    /** Action handler name for the step */
    actionHandler?: string;

    /** FlowNode children to attach when step is finalized */
    flowChildren?: FlowNodeChild[];

    /** Structured step errors (new model, alongside legacy error/errorHResult) */
    stepErrors?: StepError[];
}

/**
 * Interface for all clip interpreters.
 * Each interpreter handles specific B2C action handlers.
 */
export interface IClipInterpreter {
    /**
     * The handler names this interpreter can process.
     */
    readonly handlerNames: readonly string[];

    /**
     * Checks if this interpreter can handle the given handler name.
     */
    canHandle(handlerName: string): boolean;

    /**
     * Interprets the clip and returns the result.
     */
    interpret(context: InterpretContext): InterpretResult;

    /**
     * Optional cleanup after interpretation cycle.
     */
    reset?(): void;
}

/**
 * Abstract base class providing common functionality for interpreters.
 *
 * Contains ONLY truly shared functionality:
 * - Result builders
 * - Core statebag/claims extraction
 * - Clip navigation utilities
 */
export abstract class BaseInterpreter implements IClipInterpreter {
    abstract readonly handlerNames: readonly string[];

    canHandle(handlerName: string): boolean {
        return this.handlerNames.includes(handlerName);
    }

    abstract interpret(context: InterpretContext): InterpretResult;

    // =========================================================================
    // Result Builders - Used by all interpreters
    // =========================================================================

    /**
     * Creates a successful result with no changes.
     */
    protected successNoOp(
        options: Partial<Omit<InterpretResult, "success" | "createStep" | "finalizeStep">> = {}
    ): InterpretResult {
        return { success: true, createStep: false, finalizeStep: false, ...options };
    }

    /**
     * Creates a successful result that creates a new step.
     */
    protected successCreateStep(
        options: Partial<Omit<InterpretResult, "success" | "createStep">> = {}
    ): InterpretResult {
        return { success: true, createStep: true, finalizeStep: false, ...options };
    }

    /**
     * Creates a successful result that finalizes the current step.
     */
    protected successFinalizeStep(
        options: Partial<Omit<InterpretResult, "success" | "finalizeStep">> = {}
    ): InterpretResult {
        return { success: true, createStep: false, finalizeStep: true, ...options };
    }

    /**
     * Creates a failed result with an error message.
     */
    protected failure(error: string): InterpretResult {
        return { success: false, createStep: false, finalizeStep: false, error };
    }

    // =========================================================================
    // Core Extraction - Used by ALL interpreters
    // =========================================================================

    /**
     * Extracts orchestration step from statebag.
     */
    protected extractOrchStep(statebag: Record<string, string>): number {
        const orchCs = statebag[StatebagKey.ORCH_CS];
        return orchCs ? parseInt(orchCs, 10) : 0;
    }

    /**
     * Extracts the value from a statebag entry, handling both { v: string } object and plain string formats.
     * @param entry - The statebag entry which can be object or plain string
     * @returns The extracted value string or null if not found
     */
    protected extractStatebagEntryValue(entry: unknown): string | null {
        if (!entry) {
            return null;
        }

        // Handle full statebag entry format: { v: "...", k: "...", c: "...", p: boolean }
        if (typeof entry === "object" && "v" in entry) {
            const entryObj = entry as { v?: string };
            return entryObj.v ?? null;
        }

        // Handle flattened format: just the value string
        if (typeof entry === "string") {
            return entry;
        }

        return null;
    }

    /**
     * Extracts claims from Complex-CLMS in handler result.
     * This is shared because ALL handlers can update claims.
     */
    protected extractClaimsFromResult(
        handlerResult: HandlerResultContent | null
    ): Record<string, string> {
        if (!handlerResult?.Statebag?.[StatebagKey.ComplexClaims]) {
            return {};
        }

        const complexClms = handlerResult.Statebag[StatebagKey.ComplexClaims];
        if (typeof complexClms === "object" && complexClms !== null) {
            return { ...complexClms } as Record<string, string>;
        }

        return {};
    }

    /**
     * Extracts statebag entries from handler result.
     * This is shared because ALL handlers can update statebag.
     */
    protected extractStatebagFromResult(
        handlerResult: HandlerResultContent | null
    ): Record<string, string> {
        if (!handlerResult?.Statebag) {
            return {};
        }

        const result: Record<string, string> = {};
        const statebag = handlerResult.Statebag;

        for (const [key, entry] of Object.entries(statebag)) {
            if (key === StatebagKey.ComplexClaims || key === StatebagKey.ComplexItems) {
                continue;
            }
            if (entry && typeof entry === "object" && "v" in entry) {
                result[key] = (entry as { v: string }).v;
            }
        }

        return result;
    }

    // =========================================================================
    // Clip Navigation Utilities
    // =========================================================================

    /**
     * Finds the next HandlerResult clip after the current index.
     */
    protected findNextHandlerResult(
        clips: ClipsArray,
        startIndex: number
    ): HandlerResultContent | null {
        for (let i = startIndex; i < clips.length; i++) {
            const clip = clips[i];
            if (clip.Kind === ClipKind.HandlerResult) {
                return clip.Content as HandlerResultContent;
            }
            if (clip.Kind === ClipKind.Action || clip.Kind === ClipKind.Predicate) {
                break;
            }
        }
        return null;
    }

    // =========================================================================
    // RecorderRecord Extraction Utilities - Shared patterns for nested data
    // =========================================================================

    /**
     * Extracts values from nested RecorderRecord structure.
     * @param handlerResult - The handler result containing RecorderRecord
     * @param outerKey - The key to find in the outer Values array
     * @param innerKey - Optional key to find in nested Values array (null to skip)
     * @param mapper - Function to transform the found value
     * @returns Array of mapped values
     */
    protected extractNestedRecordValues<T>(
        handlerResult: HandlerResultContent | null,
        outerKey: string,
        innerKey: string | null,
        mapper: (value: unknown) => T | null
    ): T[] {
        const results: T[] = [];

        if (!handlerResult?.RecorderRecord?.Values) {
            return results;
        }

        for (const entry of handlerResult.RecorderRecord.Values) {
            if (entry.Key === outerKey && entry.Value) {
                const value = entry.Value as { Values?: Array<{ Key: string; Value: unknown }> };

                if (value.Values) {
                    for (const innerEntry of value.Values) {
                        if (innerKey === null || innerEntry.Key === innerKey) {
                            const mapped = mapper(innerEntry.Value);
                            if (mapped !== null) {
                                results.push(mapped);
                            }
                        }
                    }
                } else if (innerKey === null) {
                    // No inner key required, map the outer value directly
                    const mapped = mapper(entry.Value);
                    if (mapped !== null) {
                        results.push(mapped);
                    }
                }
            }
        }

        return results;
    }

    /**
     * Extracts a single value from RecorderRecord by key.
     * @param handlerResult - The handler result containing RecorderRecord
     * @param key - The key to search for
     * @param mapper - Function to transform the found value
     * @returns The mapped value or null if not found
     */
    protected extractRecordValue<T>(
        handlerResult: HandlerResultContent | null,
        key: string,
        mapper: (value: unknown) => T | null
    ): T | null {
        if (!handlerResult?.RecorderRecord?.Values) {
            return null;
        }

        for (const entry of handlerResult.RecorderRecord.Values) {
            if (entry.Key === key && entry.Value) {
                return mapper(entry.Value);
            }
        }

        return null;
    }

    reset(): void {
        // Default no-op, subclasses can override
    }
}

/**
 * Default/fallback interpreter for unknown handlers.
 * Used by the registry when no specific interpreter matches.
 */
export class DefaultInterpreter extends BaseInterpreter {
    readonly handlerNames: readonly string[] = [];

    canHandle(_handlerName: string): boolean {
        return false;
    }

    interpret(context: InterpretContext): InterpretResult {
        if (context.handlerResult) {
            const statebagUpdates = this.extractStatebagFromResult(context.handlerResult);
            const claimsUpdates = this.extractClaimsFromResult(context.handlerResult);

            return this.successNoOp({
                statebagUpdates,
                claimsUpdates,
            });
        }

        return this.successNoOp();
    }
}
