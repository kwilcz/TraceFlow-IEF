/**
 * Interpreter Registry
 *
 * Factory and registry for clip interpreters.
 * Matches B2C action handler names to their corresponding interpreter.
 *
 * Pattern mirrors backend's EntityExtractorFactory:
 * - RegisterInterpreter() → Register()
 * - GetInterpreter() → GetExtractor()
 * - Clear() → Reset()
 *
 * @example
 * ```ts
 * const registry = InterpreterRegistry.getInstance();
 * const interpreter = registry.getInterpreter("OrchestrationActionHandler");
 * const result = interpreter.interpret(context);
 * ```
 */

import { IClipInterpreter, DefaultInterpreter } from "./base-interpreter";

/**
 * Registry options for initialization.
 */
export interface InterpreterRegistryOptions {
    /** Whether to use the default interpreter as fallback */
    useDefaultFallback?: boolean;
    /** Custom default interpreter */
    defaultInterpreter?: IClipInterpreter;
}

/**
 * Registry entry with metadata.
 */
interface RegistryEntry {
    interpreter: IClipInterpreter;
    handlerNames: Set<string>;
}

/**
 * Registry for clip interpreters.
 * Singleton pattern for global access.
 */
export class InterpreterRegistry {
    private static instance: InterpreterRegistry | null = null;

    private readonly interpreters: RegistryEntry[] = [];
    private readonly handlerToInterpreter = new Map<string, IClipInterpreter>();
    private readonly defaultInterpreter: IClipInterpreter;
    private readonly useDefaultFallback: boolean;

    private constructor(options: InterpreterRegistryOptions = {}) {
        this.useDefaultFallback = options.useDefaultFallback ?? true;
        this.defaultInterpreter = options.defaultInterpreter ?? new DefaultInterpreter();
    }

    /**
     * Gets or creates the singleton instance.
     */
    static getInstance(options?: InterpreterRegistryOptions): InterpreterRegistry {
        if (!InterpreterRegistry.instance) {
            InterpreterRegistry.instance = new InterpreterRegistry(options);
        }
        return InterpreterRegistry.instance;
    }

    /**
     * Resets the singleton instance (for testing).
     */
    static resetInstance(): void {
        if (InterpreterRegistry.instance) {
            InterpreterRegistry.instance.clear();
        }
        InterpreterRegistry.instance = null;
    }

    /**
     * Registers an interpreter with the registry.
     */
    register(interpreter: IClipInterpreter): this {
        const handlerNames = new Set(interpreter.handlerNames);

        this.interpreters.push({ interpreter, handlerNames });

        for (const handlerName of Array.from(handlerNames)) {
            this.handlerToInterpreter.set(handlerName, interpreter);
        }

        return this;
    }

    /**
     * Registers multiple interpreters at once.
     */
    registerAll(interpreters: IClipInterpreter[]): this {
        for (const interpreter of interpreters) {
            this.register(interpreter);
        }
        return this;
    }

    /**
     * Gets the interpreter for a handler name.
     * Returns default interpreter if no match and fallback is enabled.
     */
    getInterpreter(handlerName: string): IClipInterpreter | null {
        const cached = this.handlerToInterpreter.get(handlerName);
        if (cached) {
            return cached;
        }

        for (const entry of this.interpreters) {
            if (entry.interpreter.canHandle(handlerName)) {
                this.handlerToInterpreter.set(handlerName, entry.interpreter);
                return entry.interpreter;
            }
        }

        if (this.useDefaultFallback) {
            return this.defaultInterpreter;
        }

        return null;
    }

    /**
     * Checks if a handler has a registered interpreter.
     */
    hasInterpreter(handlerName: string): boolean {
        return this.handlerToInterpreter.has(handlerName) ||
            this.interpreters.some((entry) => entry.interpreter.canHandle(handlerName));
    }

    /**
     * Gets all registered interpreters.
     */
    getAll(): IClipInterpreter[] {
        return this.interpreters.map((entry) => entry.interpreter);
    }

    /**
     * Gets all registered handler names.
     */
    getRegisteredHandlerNames(): string[] {
        const names = new Set<string>();
        for (const entry of this.interpreters) {
            for (const name of Array.from(entry.handlerNames)) {
                names.add(name);
            }
        }
        return Array.from(names);
    }

    /**
     * Removes an interpreter by handler name.
     */
    unregister(handlerName: string): boolean {
        const index = this.interpreters.findIndex((entry) =>
            entry.handlerNames.has(handlerName)
        );

        if (index === -1) {
            return false;
        }

        const entry = this.interpreters[index];
        for (const name of Array.from(entry.handlerNames)) {
            this.handlerToInterpreter.delete(name);
        }
        this.interpreters.splice(index, 1);

        return true;
    }

    /**
     * Clears all registered interpreters.
     */
    clear(): void {
        this.interpreters.length = 0;
        this.handlerToInterpreter.clear();
    }

    /**
     * Resets all interpreters' internal state.
     */
    resetInterpreters(): void {
        for (const entry of this.interpreters) {
            entry.interpreter.reset?.();
        }
    }

    /**
     * Gets the default/fallback interpreter.
     */
    getDefaultInterpreter(): IClipInterpreter {
        return this.defaultInterpreter;
    }

    /**
     * Returns statistics about registered interpreters.
     */
    getStats(): InterpreterRegistryStats {
        return {
            interpreterCount: this.interpreters.length,
            handlerCount: this.handlerToInterpreter.size,
            handlerNames: this.getRegisteredHandlerNames(),
            interpreterDetails: this.interpreters.map((entry) => ({
                name: entry.interpreter.constructor.name,
                handlers: Array.from(entry.handlerNames),
            })),
        };
    }
}

/**
 * Statistics about the registry.
 */
export interface InterpreterRegistryStats {
    interpreterCount: number;
    handlerCount: number;
    handlerNames: string[];
    interpreterDetails: Array<{
        name: string;
        handlers: string[];
    }>;
}

/**
 * Creates a new registry instance (non-singleton, for testing).
 */
export function createInterpreterRegistry(
    options?: InterpreterRegistryOptions
): InterpreterRegistry {
    return InterpreterRegistry.getInstance(options);
}

/**
 * Helper to register all interpreters from a module.
 */
export function registerInterpreters(
    registry: InterpreterRegistry,
    interpreterFactories: Array<() => IClipInterpreter>
): void {
    for (const factory of interpreterFactories) {
        registry.register(factory());
    }
}
