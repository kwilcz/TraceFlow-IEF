/**
 * Journey Stack
 *
 * Manages the SubJourney context stack during trace parsing.
 * B2C user journeys can invoke SubJourneys which can themselves invoke
 * other SubJourneys. This domain object tracks the current context.
 *
 * @example
 * ```ts
 * const stack = new JourneyStack("SignUpOrSignIn", "Sign Up Or Sign In");
 *
 * // Enter a SubJourney
 * stack.push({ journeyId: "PasswordReset", journeyName: "Password Reset Flow" });
 *
 * // Get current context
 * const current = stack.current(); // { journeyId: "PasswordReset", ... }
 *
 * // Exit SubJourney
 * stack.pop();
 * ```
 */

import type { JourneyContext } from "@/types/trace";

/**
 * Entry for the journey stack.
 */
export interface JourneyStackEntry extends JourneyContext {
    /** Depth in the stack (0 = root journey) */
    depth: number;
}

/**
 * Parameters for creating a new stack entry.
 */
export interface JourneyStackEntryParams {
    journeyId: string;
    journeyName: string;
    timestamp?: Date;
    lastOrchStep?: number;
}

/**
 * Manages the journey/subjourney context stack.
 */
export class JourneyStack {
    private readonly stack: JourneyStackEntry[] = [];

    /**
     * Creates a new JourneyStack with the root journey.
     */
    constructor(rootJourneyId: string, rootJourneyName: string) {
        this.stack.push({
            journeyId: rootJourneyId,
            journeyName: rootJourneyName,
            lastOrchStep: 0,
            entryTimestamp: new Date(),
            depth: 0,
        });
    }

    /**
     * Pushes a new SubJourney onto the stack.
     */
    push(params: JourneyStackEntryParams): JourneyStackEntry {
        const entry: JourneyStackEntry = {
            journeyId: params.journeyId,
            journeyName: params.journeyName,
            lastOrchStep: params.lastOrchStep ?? 0,
            entryTimestamp: params.timestamp ?? new Date(),
            depth: this.stack.length,
        };
        this.stack.push(entry);
        return entry;
    }

    /**
     * Pops the current SubJourney from the stack.
     * Returns undefined if only the root journey remains.
     */
    pop(): JourneyStackEntry | undefined {
        if (this.stack.length <= 1) {
            return undefined;
        }
        return this.stack.pop();
    }

    /**
     * Returns the current journey context without removing it.
     */
    current(): JourneyStackEntry {
        return this.stack[this.stack.length - 1];
    }

    /**
     * Returns the root (main) journey context.
     */
    root(): JourneyStackEntry {
        return this.stack[0];
    }

    /**
     * Returns the parent journey context (one level up).
     * Returns undefined if already at root.
     */
    parent(): JourneyStackEntry | undefined {
        if (this.stack.length <= 1) {
            return undefined;
        }
        return this.stack[this.stack.length - 2];
    }

    /**
     * Current depth in the journey stack.
     * 0 = root journey, 1+ = SubJourney depth.
     */
    depth(): number {
        return this.stack.length - 1;
    }

    /**
     * Whether we're currently in a SubJourney.
     */
    isInSubJourney(): boolean {
        return this.stack.length > 1;
    }

    /**
     * Updates the last orchestration step for the current context.
     */
    updateOrchStep(step: number): void {
        if (this.stack.length > 0) {
            this.stack[this.stack.length - 1].lastOrchStep = step;
        }
    }

    /**
     * Returns all SubJourney IDs that have been visited.
     */
    getVisitedSubJourneys(): string[] {
        return this.stack.slice(1).map((entry) => entry.journeyId);
    }

    /**
     * Returns all entries in the stack (for debugging).
     */
    getFullStack(): readonly JourneyStackEntry[] {
        return [...this.stack];
    }

    /**
     * Builds the path from root to current context.
     * Useful for breadcrumb-style display.
     *
     * @example
     * // Returns: ["SignUpOrSignIn", "PasswordReset", "MfaSetup"]
     */
    getJourneyPath(): string[] {
        return this.stack.map((entry) => entry.journeyId);
    }

    /**
     * Builds a display-friendly path with names.
     *
     * @example
     * // Returns: "Sign Up Or Sign In > Password Reset > MFA Setup"
     */
    getDisplayPath(separator = " > "): string {
        return this.stack.map((entry) => entry.journeyName).join(separator);
    }

    /**
     * Finds a journey by ID anywhere in the stack.
     */
    findByJourneyId(journeyId: string): JourneyStackEntry | undefined {
        return this.stack.find((entry) => entry.journeyId === journeyId);
    }

    /**
     * Checks if a specific journey is currently in the stack.
     */
    containsJourney(journeyId: string): boolean {
        return this.stack.some((entry) => entry.journeyId === journeyId);
    }

    /**
     * Pops the stack until reaching a specific journey.
     * Useful for handling SubJourney exits that skip intermediate levels.
     */
    popUntil(journeyId: string): JourneyStackEntry[] {
        const popped: JourneyStackEntry[] = [];

        while (
            this.stack.length > 1 &&
            this.current().journeyId !== journeyId
        ) {
            const entry = this.stack.pop();
            if (entry) {
                popped.push(entry);
            }
        }

        return popped;
    }

    /**
     * Creates a snapshot of the current state.
     */
    snapshot(): JourneyStackSnapshot {
        return {
            entries: structuredClone(this.stack),
            currentJourneyId: this.current().journeyId,
            depth: this.depth(),
        };
    }

    /**
     * Restores state from a snapshot.
     */
    restore(snapshot: JourneyStackSnapshot): void {
        this.stack.length = 0;
        this.stack.push(...structuredClone(snapshot.entries));
    }
}

/**
 * Snapshot of the journey stack state.
 */
export interface JourneyStackSnapshot {
    entries: JourneyStackEntry[];
    currentJourneyId: string;
    depth: number;
}

/**
 * Factory for creating journey stacks with common patterns.
 */
export const JourneyStackFactory = {
    /**
     * Creates a stack from a known journey hierarchy.
     */
    fromHierarchy(
        journeys: Array<{ id: string; name: string }>
    ): JourneyStack {
        if (journeys.length === 0) {
            throw new Error("Journey hierarchy cannot be empty");
        }

        const [root, ...subJourneys] = journeys;
        const stack = new JourneyStack(root.id, root.name);

        for (const subJourney of subJourneys) {
            stack.push({
                journeyId: subJourney.id,
                journeyName: subJourney.name,
            });
        }

        return stack;
    },

    /**
     * Creates a stack with just the root journey.
     */
    withRoot(journeyId: string, journeyName: string): JourneyStack {
        return new JourneyStack(journeyId, journeyName);
    },
};
