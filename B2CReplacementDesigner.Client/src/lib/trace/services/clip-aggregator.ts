/**
 * Clip Aggregator Service
 *
 * Aggregates related clips into logical groups for processing.
 * Groups Action clips with their corresponding HandlerResult clips.
 *
 * This service handles the low-level clip organization, extracting
 * the handler name and result pairing that interpreters need.
 */

import type {
    Clip,
    ClipsArray,
    HandlerResultContent,
    HeadersContent,
    FatalExceptionContent,
} from "@/types/journey-recorder";
import { ClipKind } from "../constants/keys";

/**
 * A group of related clips centered around an Action.
 */
export interface ClipGroup {
    /** Index of the Action clip in the original array */
    actionIndex: number;

    /** The action handler name */
    handlerName: string;

    /** The Predicate clip before this action, if any */
    predicate: string | null;

    /** The HandlerResult for this action */
    result: HandlerResultContent | null;

    /** All clips in this group (for advanced processing) */
    clips: Clip[];

    /** Start and end indices in the original array */
    range: { start: number; end: number };
}

/**
 * Result of clip aggregation.
 */
export interface ClipAggregationResult {
    /** Grouped clips by action */
    groups: ClipGroup[];

    /** Fatal exception if the journey failed */
    fatalException: FatalExceptionContent | null;

    /** Header information */
    headers: HeadersContent | null;

    /** All transition events */
    transitions: Array<{ eventName: string; stateName: string; index: number }>;
}

/**
 * Aggregates clips into logical groups for interpretation.
 */
export class ClipAggregator {
    /**
     * Aggregates clips from a single log into groups.
     */
    aggregate(clips: ClipsArray): ClipAggregationResult {
        const result: ClipAggregationResult = {
            groups: [],
            fatalException: null,
            headers: null,
            transitions: [],
        };

        let currentPredicate: string | null = null;
        let groupStartIndex = 0;

        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];

            switch (clip.Kind) {
                case ClipKind.Headers:
                    result.headers = clip.Content as HeadersContent;
                    break;

                case "Transition":
                    result.transitions.push({
                        eventName: (clip.Content as { EventName: string }).EventName,
                        stateName: (clip.Content as { StateName: string }).StateName,
                        index: i,
                    });
                    break;

                case ClipKind.Predicate:
                    currentPredicate = clip.Content as string;
                    groupStartIndex = i;
                    break;

                case ClipKind.Action: {
                    const handlerName = clip.Content as string;
                    const handlerResult = this.findNextHandlerResult(clips, i + 1);
                    const groupEndIndex = this.findGroupEnd(clips, i);

                    result.groups.push({
                        actionIndex: i,
                        handlerName,
                        predicate: currentPredicate,
                        result: handlerResult,
                        clips: clips.slice(groupStartIndex, groupEndIndex + 1),
                        range: { start: groupStartIndex, end: groupEndIndex },
                    });

                    currentPredicate = null;
                    groupStartIndex = groupEndIndex + 1;
                    break;
                }

                case ClipKind.HandlerResult: {
                    // If we have a predicate but no action, create a group for the predicate
                    if (currentPredicate) {
                        const handlerResult = clip.Content as HandlerResultContent;
                        result.groups.push({
                            actionIndex: groupStartIndex,
                            handlerName: currentPredicate,
                            predicate: currentPredicate,
                            result: handlerResult,
                            clips: clips.slice(groupStartIndex, i + 1),
                            range: { start: groupStartIndex, end: i },
                        });
                        currentPredicate = null;
                        groupStartIndex = i + 1;
                    }
                    break;
                }

                case ClipKind.Exception:
                    result.fatalException = clip.Content as FatalExceptionContent;
                    break;
            }
        }

        return result;
    }

    /**
     * Aggregates clips from multiple logs in order.
     */
    aggregateMultiple(
        logs: Array<{ clips: ClipsArray; timestamp: Date; id: string }>
    ): ClipAggregationResult {
        const combined: ClipAggregationResult = {
            groups: [],
            fatalException: null,
            headers: null,
            transitions: [],
        };

        for (const log of logs) {
            const logResult = this.aggregate(log.clips);

            if (logResult.headers && !combined.headers) {
                combined.headers = logResult.headers;
            }

            combined.groups.push(...logResult.groups);
            combined.transitions.push(...logResult.transitions);

            if (logResult.fatalException) {
                combined.fatalException = logResult.fatalException;
            }
        }

        return combined;
    }

    /**
     * Finds the next HandlerResult clip after the given index.
     */
    private findNextHandlerResult(
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

    /**
     * Finds where a group ends (before next Action/Predicate).
     */
    private findGroupEnd(clips: ClipsArray, actionIndex: number): number {
        for (let i = actionIndex + 1; i < clips.length; i++) {
            const clip = clips[i];

            if (clip.Kind === ClipKind.Action || clip.Kind === ClipKind.Predicate) {
                return i - 1;
            }
        }

        return clips.length - 1;
    }
}

/**
 * Factory function for creating ClipAggregator instances.
 */
export function createClipAggregator(): ClipAggregator {
    return new ClipAggregator();
}
