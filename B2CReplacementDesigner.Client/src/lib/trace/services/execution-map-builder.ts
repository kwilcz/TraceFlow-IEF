/**
 * Execution Map Builder Service
 *
 * Builds the execution map that tracks node visit status for graph highlighting.
 * Maps graph node IDs to their execution status (Success, Skipped, Error, etc.).
 */

import type { TraceStep, TraceExecutionMap, NodeExecutionStatus, StepResult } from "@/types/trace";

/**
 * Builds and maintains the execution map.
 */
export class ExecutionMapBuilder {
    private readonly map: Map<string, NodeExecutionStatus> = new Map();

    /**
     * Adds a trace step to the execution map.
     */
    addStep(step: TraceStep): void {
        const nodeId = step.graphNodeId;

        if (!nodeId) {
            return;
        }

        const existing = this.map.get(nodeId);

        if (existing) {
            existing.visitCount++;
            existing.stepIndices.push(step.sequenceNumber);
            existing.status = this.mergeStatus(existing.status, step.result);
        } else {
            this.map.set(nodeId, {
                status: step.result,
                visitCount: 1,
                stepIndices: [step.sequenceNumber],
            });
        }
    }

    /**
     * Adds multiple steps to the execution map.
     */
    addSteps(steps: TraceStep[]): void {
        for (const step of steps) {
            this.addStep(step);
        }
    }

    /**
     * Gets the execution status for a node.
     */
    getStatus(nodeId: string): NodeExecutionStatus | undefined {
        return this.map.get(nodeId);
    }

    /**
     * Checks if a node has been visited.
     */
    hasVisited(nodeId: string): boolean {
        return this.map.has(nodeId);
    }

    /**
     * Gets the visit count for a node.
     */
    getVisitCount(nodeId: string): number {
        return this.map.get(nodeId)?.visitCount ?? 0;
    }

    /**
     * Builds and returns the final execution map.
     */
    build(): TraceExecutionMap {
        const result: TraceExecutionMap = {};

        this.map.forEach((status, nodeId) => {
            result[nodeId] = { ...status };
        });

        return result;
    }

    /**
     * Gets all visited node IDs.
     */
    getVisitedNodes(): string[] {
        return Array.from(this.map.keys());
    }

    /**
     * Gets all nodes with a specific status.
     */
    getNodesByStatus(status: StepResult): string[] {
        const result: string[] = [];

        this.map.forEach((nodeStatus, nodeId) => {
            if (nodeStatus.status === status) {
                result.push(nodeId);
            }
        });

        return result;
    }

    /**
     * Gets statistics about the execution.
     */
    getStats(): ExecutionStats {
        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        let pendingCount = 0;
        let totalVisits = 0;

        this.map.forEach((status) => {
            totalVisits += status.visitCount;

            switch (status.status) {
                case "Success":
                    successCount++;
                    break;
                case "Error":
                    errorCount++;
                    break;
                case "Skipped":
                    skippedCount++;
                    break;
                case "PendingInput":
                    pendingCount++;
                    break;
            }
        });

        return {
            uniqueNodes: this.map.size,
            totalVisits,
            successCount,
            errorCount,
            skippedCount,
            pendingCount,
        };
    }

    /**
     * Resets the builder.
     */
    reset(): void {
        this.map.clear();
    }

    /**
     * Merges two statuses, preferring Error > PendingInput > Success > Skipped.
     */
    private mergeStatus(existing: StepResult, incoming: StepResult): StepResult {
        const priority: Record<StepResult, number> = {
            Error: 3,
            PendingInput: 2,
            Success: 1,
            Skipped: 0,
        };

        return priority[incoming] > priority[existing] ? incoming : existing;
    }
}

/**
 * Statistics about execution.
 */
export interface ExecutionStats {
    uniqueNodes: number;
    totalVisits: number;
    successCount: number;
    errorCount: number;
    skippedCount: number;
    pendingCount: number;
}

/**
 * Factory function for creating ExecutionMapBuilder instances.
 */
export function createExecutionMapBuilder(): ExecutionMapBuilder {
    return new ExecutionMapBuilder();
}
