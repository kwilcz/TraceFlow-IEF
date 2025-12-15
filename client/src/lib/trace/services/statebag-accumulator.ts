/**
 * Statebag Accumulator Service
 *
 * Accumulates and maintains statebag state across multiple clips and logs.
 * Provides immutable snapshots for trace steps.
 *
 * The statebag is B2C's internal state container that tracks:
 * - Current orchestration step (ORCH_CS)
 * - Machine state (MACHSTATE)
 * - Claims and tokens
 * - Journey configuration
 */

import type { Statebag, StatebagEntry, HandlerResultContent } from "@/types/journey-recorder";

/** Keys that could lead to prototype pollution. */
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** Validates that a key is safe to use. */
function isSafeKey(key: string): boolean {
    return !DANGEROUS_KEYS.has(key);
}

/**
 * Accumulated state with both raw and simplified views.
 */
export interface AccumulatedState {
    /** Simplified key-value statebag */
    statebag: Record<string, string>;

    /** Claims extracted from Complex-CLMS */
    claims: Record<string, string>;

    /** Current orchestration step */
    orchStep: number;

    /** Current machine state */
    machState: string;
}

/**
 * Accumulates statebag state across clips.
 */
export class StatebagAccumulator {
    private readonly statebag: Map<string, string> = new Map();
    private readonly claims: Map<string, string> = new Map();
    private orchStep = 0;
    private machState = "";

    /**
     * Applies updates from a handler result.
     */
    applyHandlerResult(result: HandlerResultContent): void {
        if (!result.Statebag) {
            return;
        }

        this.applyStatebag(result.Statebag);
    }

    /**
     * Applies a full statebag update.
     */
    applyStatebag(statebag: Statebag): void {
        for (const [key, value] of Object.entries(statebag)) {
            if (!isSafeKey(key)) {
                continue;
            }

            if (key === "Complex-CLMS") {
                this.applyClaims(value as Record<string, string>);
                continue;
            }

            if (key === "ComplexItems") {
                continue;
            }

            if (this.isStatebagEntry(value)) {
                this.statebag.set(key, value.v);
                this.updateSpecialKeys(key, value.v);
            }
        }
    }

    /**
     * Applies claims updates.
     */
    applyClaims(claims: Record<string, string>): void {
        for (const [key, value] of Object.entries(claims)) {
            if (!isSafeKey(key)) {
                continue;
            }
            if (typeof value === "string") {
                this.claims.set(key, value);
            }
        }
    }

    /**
     * Applies a key-value update directly.
     */
    applyUpdate(key: string, value: string): void {
        if (!isSafeKey(key)) {
            return;
        }
        this.statebag.set(key, value);
        this.updateSpecialKeys(key, value);
    }

    /**
     * Applies multiple key-value updates.
     */
    applyUpdates(updates: Record<string, string>): void {
        for (const [key, value] of Object.entries(updates)) {
            if (!isSafeKey(key)) {
                continue;
            }
            this.applyUpdate(key, value);
        }
    }

    /**
     * Applies claims updates from a simple object.
     */
    applyClaimsUpdates(updates: Record<string, string>): void {
        for (const [key, value] of Object.entries(updates)) {
            if (!isSafeKey(key)) {
                continue;
            }
            this.claims.set(key, value);
        }
    }

    /**
     * Gets the current accumulated state.
     */
    getState(): AccumulatedState {
        return {
            statebag: Object.fromEntries(this.statebag),
            claims: Object.fromEntries(this.claims),
            orchStep: this.orchStep,
            machState: this.machState,
        };
    }

    /**
     * Gets an immutable snapshot of the current statebag.
     */
    getStatebagSnapshot(): Record<string, string> {
        return Object.fromEntries(this.statebag);
    }

    /**
     * Gets an immutable snapshot of the current claims.
     */
    getClaimsSnapshot(): Record<string, string> {
        return Object.fromEntries(this.claims);
    }

    /**
     * Gets the current orchestration step.
     */
    getOrchStep(): number {
        return this.orchStep;
    }

    /**
     * Gets the current machine state.
     */
    getMachState(): string {
        return this.machState;
    }

    /**
     * Gets a specific statebag value.
     */
    get(key: string): string | undefined {
        return this.statebag.get(key);
    }

    /**
     * Gets a specific claim value.
     */
    getClaim(key: string): string | undefined {
        return this.claims.get(key);
    }

    /**
     * Checks if a statebag key exists.
     */
    has(key: string): boolean {
        return this.statebag.has(key);
    }

    /**
     * Checks if a claim exists.
     */
    hasClaim(key: string): boolean {
        return this.claims.has(key);
    }

    /**
     * Resets the accumulator to initial state.
     */
    reset(): void {
        this.statebag.clear();
        this.claims.clear();
        this.orchStep = 0;
        this.machState = "";
    }

    /**
     * Clears the statebag but preserves claims.
     * This should be called when a new orchestration step starts,
     * as B2C statebag is step-scoped but claims persist across steps.
     */
    clearStatebagKeepClaims(): void {
        this.statebag.clear();
        // Preserve orchStep and machState as they're tracked separately
        // and updated explicitly when they change
    }

    /**
     * Creates a deep copy of the accumulator.
     */
    clone(): StatebagAccumulator {
        const copy = new StatebagAccumulator();

        this.statebag.forEach((value, key) => {
            copy.statebag.set(key, value);
        });

        this.claims.forEach((value, key) => {
            copy.claims.set(key, value);
        });

        copy.orchStep = this.orchStep;
        copy.machState = this.machState;

        return copy;
    }

    /**
     * Updates special tracked keys.
     */
    private updateSpecialKeys(key: string, value: string): void {
        if (key === "ORCH_CS") {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed)) {
                this.orchStep = parsed;
            }
        } else if (key === "MACHSTATE") {
            this.machState = value;
        }
    }

    /**
     * Type guard for statebag entries.
     */
    private isStatebagEntry(value: unknown): value is StatebagEntry {
        return (
            typeof value === "object" &&
            value !== null &&
            "v" in value &&
            typeof (value as StatebagEntry).v === "string"
        );
    }
}

/**
 * Factory function for creating StatebagAccumulator instances.
 */
export function createStatebagAccumulator(): StatebagAccumulator {
    return new StatebagAccumulator();
}
