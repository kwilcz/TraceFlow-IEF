import { describe, it, expect } from "vitest";
import { syncFlowTreeFromSteps } from "@/lib/trace/post-processors/flow-tree-sync";
import { FlowNodeType } from "@/types/flow-node";
import type { FlowNode, FlowNodeContext, StepFlowData, HomeRealmDiscoveryFlowData } from "@/types/flow-node";
import type { TraceStep } from "@/types/trace";

function makeMinimalContext(overrides: Partial<FlowNodeContext> = {}): FlowNodeContext {
    return {
        timestamp: new Date("2025-01-01T00:00:00Z"),
        sequenceNumber: 0,
        logId: "",
        eventType: "",
        statebagSnapshot: {},
        claimsSnapshot: {},
        ...overrides,
    };
}

function makeTraceStep(overrides: Partial<TraceStep> = {}): TraceStep {
    return {
        sequenceNumber: 0,
        timestamp: new Date("2025-01-01T00:00:00Z"),
        logId: "",
        eventType: "AUTH",
        graphNodeId: "",
        journeyContextId: "",
        currentJourneyName: "",
        stepOrder: 1,
        result: "Success",
        statebagSnapshot: {},
        claimsSnapshot: {},
        technicalProfiles: [],
        selectableOptions: [],
        isInteractiveStep: false,
        claimsTransformations: [],
        claimsTransformationDetails: [],
        displayControls: [],
        displayControlActions: [],
        ...overrides,
    };
}

function makeStepFlowData(overrides: Partial<StepFlowData> = {}): StepFlowData {
    return {
        type: FlowNodeType.Step,
        stepIndex: 0,
        stepOrder: 1,
        currentJourneyName: "",
        result: "Success",
        selectableOptions: [],
        ...overrides,
    };
}

function makeStepNode(stepIndex: number, children: FlowNode[] = [], dataOverrides: Partial<StepFlowData> = {}): FlowNode {
    return {
        id: `step-root-${stepIndex + 1}`,
        name: `Step ${stepIndex + 1}`,
        type: FlowNodeType.Step,
        triggeredAtStep: stepIndex + 1,
        lastStep: stepIndex + 1,
        children,
        data: makeStepFlowData({ stepIndex, stepOrder: stepIndex + 1, ...dataOverrides }),
        context: makeMinimalContext(),
    };
}

function makeRootNode(children: FlowNode[] = []): FlowNode {
    return {
        id: "root",
        name: "UserJourney",
        type: FlowNodeType.Root,
        triggeredAtStep: 0,
        lastStep: 0,
        children,
        data: { type: FlowNodeType.Root, policyId: "B2C_1A_Test" },
        context: makeMinimalContext(),
    };
}

describe("syncFlowTreeFromSteps", () => {

    // ----------------------------------------------------------------
    // 1. Sync duration
    // ----------------------------------------------------------------
    it("should sync duration from TraceStep to StepFlowData", () => {
        const stepNode = makeStepNode(0);
        const tree = makeRootNode([stepNode]);

        const steps: TraceStep[] = [
            makeTraceStep({ duration: 1234 }),
        ];

        syncFlowTreeFromSteps(tree, steps);

        const data = stepNode.data as StepFlowData;
        expect(data.duration).toBe(1234);
    });

    // ----------------------------------------------------------------
    // 2. Sync selectedOption
    // ----------------------------------------------------------------
    it("should sync selectedOption from TraceStep to StepFlowData", () => {
        const stepNode = makeStepNode(0);
        const tree = makeRootNode([stepNode]);

        const steps: TraceStep[] = [
            makeTraceStep({ selectedOption: "Facebook-OIDC" }),
        ];

        syncFlowTreeFromSteps(tree, steps);

        const data = stepNode.data as StepFlowData;
        expect(data.selectedOption).toBe("Facebook-OIDC");
    });

    // ----------------------------------------------------------------
    // 3. Sync result
    // ----------------------------------------------------------------
    it("should sync result from TraceStep to StepFlowData", () => {
        const stepNode = makeStepNode(0, [], { result: "Success" });
        const tree = makeRootNode([stepNode]);

        const steps: TraceStep[] = [
            makeTraceStep({ result: "Error" }),
        ];

        syncFlowTreeFromSteps(tree, steps);

        const data = stepNode.data as StepFlowData;
        expect(data.result).toBe("Error");
    });

    // ----------------------------------------------------------------
    // 4. Sync selectedOption to HomeRealmDiscoveryFlowData child
    // ----------------------------------------------------------------
    it("should sync selectedOption to HomeRealmDiscoveryFlowData child", () => {
        const hrdNode: FlowNode = {
            id: "hrd-step-root-1",
            name: "Home Realm Discovery",
            type: FlowNodeType.HomeRealmDiscovery,
            triggeredAtStep: 1,
            lastStep: 1,
            children: [],
            data: {
                type: FlowNodeType.HomeRealmDiscovery,
                selectableOptions: ["Facebook-OIDC", "Google-OAUTH"],
            } satisfies HomeRealmDiscoveryFlowData,
            context: makeMinimalContext(),
        };

        const stepNode = makeStepNode(0, [hrdNode]);
        const tree = makeRootNode([stepNode]);

        const steps: TraceStep[] = [
            makeTraceStep({ selectedOption: "Google-OAUTH" }),
        ];

        syncFlowTreeFromSteps(tree, steps);

        const hrdData = hrdNode.data as HomeRealmDiscoveryFlowData;
        expect(hrdData.selectedOption).toBe("Google-OAUTH");
    });

    // ----------------------------------------------------------------
    // 5. Handle steps without FlowNode tree nodes
    // ----------------------------------------------------------------
    it("should handle steps without matching FlowNode tree nodes (no crash)", () => {
        const tree = makeRootNode([]);

        const steps: TraceStep[] = [
            makeTraceStep({ duration: 500 }),
            makeTraceStep({ duration: 300 }),
        ];

        // Should not throw — no step nodes to sync but steps array is non-empty
        expect(() => syncFlowTreeFromSteps(tree, steps)).not.toThrow();
    });

    // ----------------------------------------------------------------
    // 6. Handle empty tree
    // ----------------------------------------------------------------
    it("should handle empty tree (no crash)", () => {
        const tree = makeRootNode([]);
        const steps: TraceStep[] = [];

        expect(() => syncFlowTreeFromSteps(tree, steps)).not.toThrow();
    });

    // ----------------------------------------------------------------
    // 7. Multi-step sync
    // ----------------------------------------------------------------
    it("should sync multiple steps correctly by stepIndex", () => {
        const step0 = makeStepNode(0);
        const step1 = makeStepNode(1);
        const tree = makeRootNode([step0, step1]);

        const steps: TraceStep[] = [
            makeTraceStep({ duration: 100, selectedOption: "OptionA", result: "Success" }),
            makeTraceStep({ duration: 200, selectedOption: "OptionB", result: "Error" }),
        ];

        syncFlowTreeFromSteps(tree, steps);

        const data0 = step0.data as StepFlowData;
        expect(data0.duration).toBe(100);
        expect(data0.selectedOption).toBe("OptionA");
        expect(data0.result).toBe("Success");

        const data1 = step1.data as StepFlowData;
        expect(data1.duration).toBe(200);
        expect(data1.selectedOption).toBe("OptionB");
        expect(data1.result).toBe("Error");
    });
});
