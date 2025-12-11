/**
 * Services Module Index
 *
 * Re-exports all services for clean imports.
 */

export {
    ClipAggregator,
    createClipAggregator,
    type ClipGroup,
    type ClipAggregationResult,
} from "./clip-aggregator";

export {
    StatebagAccumulator,
    createStatebagAccumulator,
    type AccumulatedState,
} from "./statebag-accumulator";

export {
    ExecutionMapBuilder,
    createExecutionMapBuilder,
    type ExecutionStats,
} from "./execution-map-builder";

export {
    FlowAnalyzer,
    createFlowAnalyzer,
    groupLogsIntoFlows,
    getLogsForFlow,
    getCorrelationIdsFromFlows,
} from "./flow-analyzer";
