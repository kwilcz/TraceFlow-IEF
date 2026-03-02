/**
 * Test Step Helpers
 *
 * Provides backwards-compatible step views for test assertions.
 * Maps the FlowNode tree to flat step objects that mirror the old TraceStep interface
 * so existing test patterns (`getTestSteps(result)[0].result`) work with minimal changes.
 */

import type { TraceParseResult, StepResult, BackendApiCall, UiSettings, ClaimMapping } from "@/types/trace";
import type {
    FlowNode,
    StepFlowData,
    StepError,
    TechnicalProfileFlowData,
    ClaimsTransformationFlowData,
    DisplayControlFlowData,
} from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";
import { collectStepNodes, getStepTpNames, getStepCtNames } from "@/lib/trace/domain/flow-node-utils";

// =============================================================================
// Test Step View — backwards-compatible flat projection of a Step FlowNode
// =============================================================================

export interface TestClaimsTransformation {
    id: string;
    inputClaims: ReadonlyArray<{ claimType: string; value: string }>;
    inputParameters: ReadonlyArray<{ id: string; value: string }>;
    outputClaims: ReadonlyArray<{ claimType: string; value: string }>;
}

export interface TestTechnicalProfile {
    technicalProfileId: string;
    providerType: string;
    protocolType?: string;
    claimsSnapshot?: Record<string, string>;
    claimMappings?: ClaimMapping[];
    childCTs: TestClaimsTransformation[];
}

export interface TestDisplayControl {
    displayControlId: string;
    action: string;
    resultCode?: string;
    claimMappings?: ClaimMapping[];
    technicalProfiles: TestTechnicalProfile[];
}

export interface TestStepView {
    // ── Identity / ordering ──
    orchestrationStep: number;
    graphNodeId: string;
    sequence: number;
    timestamp: Date;
    eventType: string;
    journeyName: string;

    // ── Result ──
    result: StepResult;
    errors: StepError[];
    /** First error message (backwards compat for old traceStep.errorMessage) */
    errorMessage?: string;
    /** First error HResult (backwards compat for old traceStep.errorHResult) */
    errorHResult?: string;

    // ── Handler ──
    actionHandler?: string;

    // ── TPs (flattened names) ──
    technicalProfileNames: string[];
    /** Full TP children with details */
    technicalProfiles: TestTechnicalProfile[];

    // ── CTs (flattened IDs from all levels) ──
    claimsTransformationIds: string[];
    /** CT children (direct orphan CTs only) */
    claimsTransformationDetails: TestClaimsTransformation[];

    // ── Display Controls ──
    displayControls: TestDisplayControl[];

    // ── HRD / interactive ──
    selectableOptions: string[];
    selectedOption?: string;
    isInteractiveStep: boolean;

    // ── API ──
    backendApiCalls: BackendApiCall[];

    // ── UI ──
    uiSettings?: UiSettings;

    // ── Snapshots ──
    claimsSnapshot: Record<string, string>;
    statebagSnapshot: Record<string, string>;

    // ── Raw FlowNode access ──
    node: FlowNode;
    data: StepFlowData;
}

// =============================================================================
// Primary Helper — getTestSteps
// =============================================================================

/**
 * Extracts step views from a parse result for test assertions.
 *
 * @example
 * ```ts
 * const result = parseTrace(logs);
 * const steps = getTestSteps(result);
 * expect(steps[0].result).toBe("Success");
 * expect(steps[0].technicalProfileNames).toContain("TP-Login");
 * ```
 */
export function getTestSteps(result: TraceParseResult): TestStepView[] {
    if (!result.flowTree) return [];
    return collectStepNodes(result.flowTree).map(mapStepNodeToView);
}

/**
 * Gets total step count from result.
 * Replaces `result.traceSteps.length`.
 */
export function getStepCount(result: TraceParseResult): number {
    if (!result.flowTree) return 0;
    return collectStepNodes(result.flowTree).length;
}

// =============================================================================
// Internal Mapping
// =============================================================================

function mapStepNodeToView(node: FlowNode): TestStepView {
    const data = node.data as StepFlowData;

    // Extract child structures
    const tpChildren = extractTechnicalProfiles(node);
    const ctChildren = extractDirectCTs(node);
    const dcChildren = extractDisplayControls(node);

    return {
        // Identity
        orchestrationStep: data.stepOrder,
        graphNodeId: node.id,
        sequence: node.context.sequenceNumber,
        timestamp: node.context.timestamp,
        eventType: node.context.eventType,
        journeyName: data.currentJourneyName,

        // Result
        result: data.result,
        errors: data.errors ?? [],
        errorMessage: data.errors?.[0]?.message,
        errorHResult: data.errors?.[0]?.hResult,

        // Handler
        actionHandler: data.actionHandler,

        // TPs
        technicalProfileNames: getStepTpNames(node),
        technicalProfiles: tpChildren,

        // CTs
        claimsTransformationIds: getStepCtNames(node),
        claimsTransformationDetails: ctChildren,

        // DCs
        displayControls: dcChildren,

        // HRD / interactive
        selectableOptions: data.selectableOptions ?? [],
        selectedOption: data.selectedOption,
        isInteractiveStep: node.children.some(
            (c) =>
                c.type === FlowNodeType.HomeRealmDiscovery ||
                c.type === FlowNodeType.DisplayControl,
        ),

        // API
        backendApiCalls: data.backendApiCalls ?? [],

        // UI
        uiSettings: data.uiSettings,

        // Snapshots
        claimsSnapshot: node.context.claimsSnapshot ?? {},
        statebagSnapshot: node.context.statebagSnapshot ?? {},

        // Raw
        node,
        data,
    };
}

function extractTechnicalProfiles(stepNode: FlowNode): TestTechnicalProfile[] {
    return stepNode.children
        .filter((c) => c.type === FlowNodeType.TechnicalProfile)
        .map((tpNode) => {
            const tpData = tpNode.data as TechnicalProfileFlowData;
            return {
                technicalProfileId: tpData.technicalProfileId,
                providerType: tpData.providerType,
                protocolType: tpData.protocolType,
                claimsSnapshot: tpData.claimsSnapshot,
                claimMappings: tpData.claimMappings,
                childCTs: tpNode.children
                    .filter((c) => c.type === FlowNodeType.ClaimsTransformation)
                    .map(mapCTNode),
            };
        });
}

function extractDirectCTs(stepNode: FlowNode): TestClaimsTransformation[] {
    return stepNode.children
        .filter((c) => c.type === FlowNodeType.ClaimsTransformation)
        .map(mapCTNode);
}

function extractDisplayControls(stepNode: FlowNode): TestDisplayControl[] {
    return stepNode.children
        .filter((c) => c.type === FlowNodeType.DisplayControl)
        .map((dcNode) => {
            const dcData = dcNode.data as DisplayControlFlowData;
            return {
                displayControlId: dcData.displayControlId,
                action: dcData.action,
                resultCode: dcData.resultCode,
                claimMappings: dcData.claimMappings,
                technicalProfiles: dcNode.children
                    .filter((c) => c.type === FlowNodeType.TechnicalProfile)
                    .map((tpNode) => {
                        const tpData = tpNode.data as TechnicalProfileFlowData;
                        return {
                            technicalProfileId: tpData.technicalProfileId,
                            providerType: tpData.providerType,
                            protocolType: tpData.protocolType,
                            claimsSnapshot: tpData.claimsSnapshot,
                            claimMappings: tpData.claimMappings,
                            childCTs: tpNode.children
                                .filter((c) => c.type === FlowNodeType.ClaimsTransformation)
                                .map(mapCTNode),
                        };
                    }),
            };
        });
}

function mapCTNode(ctNode: FlowNode): TestClaimsTransformation {
    const ctData = ctNode.data as ClaimsTransformationFlowData;
    return {
        id: ctData.transformationId,
        inputClaims: ctData.inputClaims ?? [],
        inputParameters: ctData.inputParameters ?? [],
        outputClaims: ctData.outputClaims ?? [],
    };
}
