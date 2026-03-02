import { describe, expect, it } from "vitest";
import { buildStepNode, buildTreeStructure } from "@/features/log-analyzer/debugger/journey-tree/tree-builder";
import type { TreeNode } from "@/features/log-analyzer/debugger/types";
import type { FlowNode, FlowNodeContext, StepFlowData } from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";
import type { StepResult, UiSettings } from "@/types/trace";

// ============================================================================
// Factory helpers
// ============================================================================

const defaultContext: FlowNodeContext = {
    timestamp: new Date("2024-01-01"),
    sequenceNumber: 0,
    logId: "",
    eventType: "AUTH",
    statebagSnapshot: {},
    claimsSnapshot: {},
};

function makeFlowNode(overrides: Partial<FlowNode> & Pick<FlowNode, "id" | "type" | "data">): FlowNode {
    return {
        name: overrides.id,
        triggeredAtStep: 0,
        lastStep: 0,
        children: [],
        context: defaultContext,
        ...overrides,
    };
}

function makeRootFlowNode(name: string, children: FlowNode[] = []): FlowNode {
    return makeFlowNode({
        id: "root",
        name,
        type: FlowNodeType.Root,
        data: { type: FlowNodeType.Root, policyId: name },
        children,
    });
}

function makeSubJourneyFlowNode(journeyId: string, children: FlowNode[] = []): FlowNode {
    return makeFlowNode({
        id: `sj-${journeyId}`,
        name: journeyId,
        type: FlowNodeType.SubJourney,
        data: { type: FlowNodeType.SubJourney, journeyId },
        children,
    });
}

function makeStepFlowNode(
    stepIndex: number,
    stepOrder: number,
    overrides?: {
        sequenceNumber?: number;
        result?: StepResult;
        duration?: number;
        selectableOptions?: string[];
        selectedOption?: string;
        actionHandler?: string;
        uiSettings?: UiSettings;
        currentJourneyName?: string;
        children?: FlowNode[];
    },
): FlowNode {
    const seq = overrides?.sequenceNumber ?? stepIndex;
    return makeFlowNode({
        id: `step-${stepIndex}`,
        type: FlowNodeType.Step,
        name: `Step ${stepOrder}`,
        triggeredAtStep: stepOrder,
        lastStep: stepOrder,
        context: {
            ...defaultContext,
            sequenceNumber: seq,
        },
        data: {
            type: FlowNodeType.Step,
            stepOrder,
            result: overrides?.result ?? "Success",
            errors: [],
            currentJourneyName: overrides?.currentJourneyName ?? "B2C_1A_signup_signin",
            actionHandler: overrides?.actionHandler,
            uiSettings: overrides?.uiSettings,
            selectableOptions: overrides?.selectableOptions ?? [],
            selectedOption: overrides?.selectedOption,
            duration: overrides?.duration,
        } satisfies StepFlowData,
        children: overrides?.children ?? [],
    });
}

function makeTpFlowNode(tpId: string, overrides?: {
    providerType?: string;
    protocolType?: string;
    children?: FlowNode[];
}): FlowNode {
    return makeFlowNode({
        id: `tp-${tpId}`,
        type: FlowNodeType.TechnicalProfile,
        name: tpId,
        data: {
            type: FlowNodeType.TechnicalProfile,
            technicalProfileId: tpId,
            providerType: overrides?.providerType ?? "ClaimsTransformationProtocolProvider",
            protocolType: overrides?.protocolType,
        },
        children: overrides?.children ?? [],
    });
}

function makeCtFlowNode(ctId: string): FlowNode {
    return makeFlowNode({
        id: `ct-${ctId}`,
        type: FlowNodeType.ClaimsTransformation,
        name: ctId,
        data: {
            type: FlowNodeType.ClaimsTransformation,
            transformationId: ctId,
            inputClaims: [],
            inputParameters: [],
            outputClaims: [],
        },
    });
}

function makeHrdFlowNode(selectableOptions: string[], selectedOption?: string): FlowNode {
    return makeFlowNode({
        id: "hrd",
        type: FlowNodeType.HomeRealmDiscovery,
        name: "HomeRealmDiscovery",
        data: {
            type: FlowNodeType.HomeRealmDiscovery,
            selectableOptions,
            selectedOption,
        },
    });
}

function makeDcFlowNode(dcId: string, action: string, overrides?: {
    resultCode?: string;
    children?: FlowNode[];
}): FlowNode {
    return makeFlowNode({
        id: `dc-${dcId}-${action}`,
        type: FlowNodeType.DisplayControl,
        name: dcId,
        data: {
            type: FlowNodeType.DisplayControl,
            displayControlId: dcId,
            action,
            resultCode: overrides?.resultCode,
        },
        children: overrides?.children ?? [],
    });
}

// ============================================================================
// buildTreeStructure
// ============================================================================

describe("buildTreeStructure", () => {
    it("returns empty array for null flowTree", () => {
        expect(buildTreeStructure(null)).toEqual([]);
    });

    it("returns empty array for flowTree with no children", () => {
        const flowTree = makeRootFlowNode("RootJ");
        expect(buildTreeStructure(flowTree)).toEqual([]);
    });

    it("single step produces root + step", () => {
        const flowTree = makeRootFlowNode("RootJ", [makeStepFlowNode(0, 1)]);
        const tree = buildTreeStructure(flowTree);
        expect(tree).toHaveLength(1);
        expect(tree[0].type).toBe("userjourney");
        expect(tree[0].children).toHaveLength(1);
        expect(tree[0].children![0].type).toBe("step");
    });

    it("steps with different journeyContextId produce root + SJ nodes", () => {
        const flowTree = makeRootFlowNode("RootJ", [
            makeStepFlowNode(0, 1),
            makeSubJourneyFlowNode("SubJourney-A", [
                makeStepFlowNode(1, 1, { result: "Error", children: [makeTpFlowNode("TP-A"), makeTpFlowNode("TP-B")] }),
                makeStepFlowNode(2, 2, { children: [makeTpFlowNode("TP-C")] }),
            ]),
            makeSubJourneyFlowNode("SubJourney-B", [
                makeStepFlowNode(3, 1),
            ]),
        ]);
        const tree = buildTreeStructure(flowTree);
        expect(tree).toHaveLength(1);
        const root = tree[0];
        expect(root.type).toBe("userjourney");
        // Step 0, SJ-A, SJ-B
        expect(root.children).toHaveLength(3);
        expect(root.children![0].type).toBe("step");

        const journeyA = root.children![1];
        expect(journeyA).toBeDefined();
        expect(journeyA.type).toBe("subjourney");
        expect(journeyA.metadata?.tpCount).toBe(3);
        expect(journeyA.metadata?.result).toBe("Error");

        const journeyB = root.children![2];
        expect(journeyB).toBeDefined();
        expect(journeyB.type).toBe("subjourney");
        expect(journeyB.metadata?.tpCount).toBe(0);
        expect(journeyB.metadata?.result).toBe("Success");
    });

    it("step that invokes SubJourney collects following non-root steps into SJ group", () => {
        const flowTree = makeRootFlowNode("RootJ", [
            makeStepFlowNode(0, 1),
            makeSubJourneyFlowNode("MFA", [
                makeStepFlowNode(1, 1),
                makeStepFlowNode(2, 2),
            ]),
            makeStepFlowNode(3, 3),
        ]);
        const tree = buildTreeStructure(flowTree);
        const root = tree[0];
        expect(root.type).toBe("userjourney");
        // Step 1, SJ:MFA, Step 3
        expect(root.children).toHaveLength(3);
        expect(root.children![0].type).toBe("step");
        expect(root.children![1].type).toBe("subjourney");
        expect(root.children![1].label).toBe("MFA");
        expect(root.children![1].children).toHaveLength(2);
        expect(root.children![2].type).toBe("step");
    });

    it("nested SubJourneys: parent SJ wraps child SJ groups", () => {
        const flowTree = makeRootFlowNode("RootJ", [
            makeStepFlowNode(0, 1),
            makeSubJourneyFlowNode("AuthN-LocalOnly", [
                makeSubJourneyFlowNode("Child1", [makeStepFlowNode(1, 1)]),
                makeSubJourneyFlowNode("Child2", [makeStepFlowNode(2, 1)]),
            ]),
            makeStepFlowNode(3, 3),
        ]);
        const tree = buildTreeStructure(flowTree);
        const root = tree[0];
        expect(root.type).toBe("userjourney");
        expect(root.children).toHaveLength(3);
        expect(root.children![0].type).toBe("step");

        const sjNode = root.children![1];
        expect(sjNode.type).toBe("subjourney");
        expect(sjNode.label).toBe("AuthN-LocalOnly");
        expect(sjNode.children).toHaveLength(2);
        expect(sjNode.children![0].type).toBe("subjourney");
        expect(sjNode.children![0].label).toBe("Child1");
        expect(sjNode.children![0].children).toHaveLength(1);
        expect(sjNode.children![1].type).toBe("subjourney");
        expect(sjNode.children![1].label).toBe("Child2");
        expect(sjNode.children![1].children).toHaveLength(1);

        expect(root.children![2].type).toBe("step");
    });

    it("sibling SJ after pop is not nested inside preceding SJ", () => {
        const flowTree = makeRootFlowNode("AuthN-LocalOnly", [
            makeSubJourneyFlowNode("AuthN-InitSignIn", [
                makeStepFlowNode(0, 1),
                makeStepFlowNode(1, 2),
            ]),
            makeSubJourneyFlowNode("AuthN-RouteLocal", [
                makeStepFlowNode(2, 1),
            ]),
            makeSubJourneyFlowNode("AuthN-ReadUser", [
                makeStepFlowNode(3, 1),
            ]),
        ]);
        const tree = buildTreeStructure(flowTree);
        const root = tree[0];
        expect(root.type).toBe("userjourney");
        expect(root.children).toHaveLength(3);

        expect(root.children![0].type).toBe("subjourney");
        expect(root.children![0].label).toBe("AuthN-InitSignIn");
        expect(root.children![0].children).toHaveLength(2);

        expect(root.children![1].type).toBe("subjourney");
        expect(root.children![1].label).toBe("AuthN-RouteLocal");
        expect(root.children![1].children).toHaveLength(1);

        expect(root.children![2].type).toBe("subjourney");
        expect(root.children![2].label).toBe("AuthN-ReadUser");
        expect(root.children![2].children).toHaveLength(1);
    });

    it("virtual SJ node created when subJourneyId step has no following non-root steps", () => {
        const flowTree = makeRootFlowNode("RootJ", [
            makeSubJourneyFlowNode("EmptySJ"),
            makeStepFlowNode(1, 2),
        ]);
        const tree = buildTreeStructure(flowTree);
        const root = tree[0];
        // SJ:EmptySJ (no children), Step 2
        expect(root.children).toHaveLength(2);
        expect(root.children![0].type).toBe("subjourney");
        expect(root.children![0].label).toBe("EmptySJ");
        expect(root.children![0].children).toBeUndefined();
        expect(root.children![1].type).toBe("step");
    });

    it("root userjourney node uses flowTree name as label", () => {
        const flowTree = makeRootFlowNode("B2C_1A_custom_policy", [makeStepFlowNode(0, 1)]);
        const tree = buildTreeStructure(flowTree);
        expect(tree[0].type).toBe("userjourney");
        expect(tree[0].label).toBe("B2C_1A_custom_policy");
    });

    it("root userjourney node metadata aggregates tpCount and result", () => {
        const flowTree = makeRootFlowNode("RootJ", [
            makeStepFlowNode(0, 1, { children: [makeTpFlowNode("TP-1"), makeTpFlowNode("TP-2")] }),
            makeStepFlowNode(1, 2, { result: "Error", children: [makeTpFlowNode("TP-3")] }),
        ]);
        const tree = buildTreeStructure(flowTree);
        const root = tree[0];
        expect(root.type).toBe("userjourney");
        expect(root.metadata?.tpCount).toBe(3);
        expect(root.metadata?.result).toBe("Error");
    });

    it("root userjourney node result is Success when no steps errored", () => {
        const flowTree = makeRootFlowNode("RootJ", [
            makeStepFlowNode(0, 1),
            makeStepFlowNode(1, 2),
        ]);
        const tree = buildTreeStructure(flowTree);
        expect(tree[0].metadata?.result).toBe("Success");
    });
});

// ============================================================================
// buildStepNode
// ============================================================================

describe("buildStepNode", () => {
    it("creates basic step node with label and metadata", () => {
        const stepNode = makeStepFlowNode(5, 3, {
            sequenceNumber: 5,
            result: "Skipped",
            duration: 250,
        });
        const node = buildStepNode(stepNode);

        expect(node.id).toBe("step-5");
        expect(node.label).toBe("Step 3 — Unknown");
        expect(node.type).toBe("step");
        expect(node.nodeId).toBe("step-5");
        expect(node.metadata?.result).toBe("Skipped");
        expect(node.metadata?.duration).toBe(250);
    });

    it("step with TPs creates technicalProfile children", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            children: [
                makeTpFlowNode("TP-Read"),
                makeTpFlowNode("TP-Write"),
            ],
        });
        const node = buildStepNode(stepNode);

        expect(node.children).toHaveLength(2);
        expect(node.children![0].type).toBe("technicalProfile");
        expect(node.children![0].label).toBe("TP-Read");
        expect(node.children![1].label).toBe("TP-Write");
    });

    it("step with CTs creates transformation children", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            children: [
                makeCtFlowNode("CT-Email"),
                makeCtFlowNode("CT-Phone"),
            ],
        });
        const node = buildStepNode(stepNode);

        expect(node.children).toHaveLength(2);
        expect(node.children![0].type).toBe("transformation");
        expect(node.children![0].label).toBe("CT-Email");
    });

    it("HRD step adds HRD node with selectable options", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            selectableOptions: ["google.com", "facebook.com"],
            selectedOption: "google.com",
            actionHandler: "ClaimsProviderSelection-HomeRealmDiscovery",
            children: [
                makeHrdFlowNode(["google.com", "facebook.com"], "google.com"),
                makeTpFlowNode("google.com"),
                makeTpFlowNode("facebook.com"),
            ],
        });

        const node = buildStepNode(stepNode);
        const hrdNode = node.children?.find((c) => c.type === "hrd");

        expect(hrdNode).toBeDefined();
        expect(hrdNode!.label).toBe("HomeRealmDiscovery");
        expect(hrdNode!.metadata?.selectableOptions).toEqual(["google.com", "facebook.com"]);
        expect(hrdNode!.metadata?.selectedOption).toBe("google.com");
    });

    it("HRD step filters selected option from TP children", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            selectableOptions: ["google.com", "facebook.com"],
            selectedOption: "google.com",
            actionHandler: "ClaimsProviderSelection-HomeRealmDiscovery",
            children: [
                makeHrdFlowNode(["google.com", "facebook.com"], "google.com"),
                makeTpFlowNode("google.com"),
                makeTpFlowNode("facebook.com"),
            ],
        });

        const node = buildStepNode(stepNode);
        const tpLabels = node.children?.filter((c) => c.type === "technicalProfile").map((c) => c.label) ?? [];

        // selected option "google.com" should be excluded from TP children
        expect(tpLabels).not.toContain("google.com");
        expect(tpLabels).toContain("facebook.com");
    });

    it("DisplayControl step creates nested DC nodes with TPs and CTs", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            children: [
                makeDcFlowNode("captcha", "GetChallenge", {
                    children: [
                        makeTpFlowNode("TP-Captcha", {
                            children: [makeCtFlowNode("CT-Captcha")],
                        }),
                    ],
                }),
            ],
        });

        const node = buildStepNode(stepNode);

        // DC node at root (no main SelfAsserted TP)
        const dcNode = node.children?.find((c) => c.type === "displayControl");
        expect(dcNode).toBeDefined();
        expect(dcNode!.label).toBe("captcha → GetChallenge");
        expect(dcNode!.metadata?.displayControlId).toBe("captcha");

        // Nested TP under DC
        const dcTp = dcNode!.children?.find((c) => c.type === "dcTechnicalProfile");
        expect(dcTp).toBeDefined();
        expect(dcTp!.label).toBe("TP-Captcha");

        // Nested CT under DC TP
        const dcCt = dcTp!.children?.find((c) => c.type === "dcTransformation");
        expect(dcCt).toBeDefined();
        expect(dcCt!.label).toBe("CT-Captcha");
    });

    it("SelfAsserted step nests DCs and validation TPs under main SA TP", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            children: [
                makeTpFlowNode("SelfAsserted-LocalAccount", {
                    providerType: "SelfAssertedAttributeProvider",
                    children: [
                        makeTpFlowNode("TP-Validate"),
                    ],
                }),
                makeDcFlowNode("emailVerification", "SendCode", {
                    children: [
                        makeTpFlowNode("TP-SendOtp"),
                    ],
                }),
            ],
        });

        const node = buildStepNode(stepNode);

        // Main SA TP is a child
        const saNode = node.children?.find((c) => c.label === "SelfAsserted-LocalAccount");
        expect(saNode).toBeDefined();

        // DCs nested under SA TP
        const nestedDc = saNode!.children?.find((c) => c.type === "displayControl");
        expect(nestedDc).toBeDefined();
        expect(nestedDc!.metadata?.displayControlId).toBe("emailVerification");

        // Validation TPs nested under SA TP (from FlowNode children)
        const vtpNode = saNode!.children?.find((c) => c.label === "TP-Validate");
        expect(vtpNode).toBeDefined();
        expect(vtpNode!.type).toBe("technicalProfile");
    });

    it("step with validation TPs nested under parent TP", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            children: [
                makeTpFlowNode("TP-Main", {
                    children: [makeTpFlowNode("TP-Validate-1")],
                }),
            ],
        });

        const node = buildStepNode(stepNode);

        expect(node.children).toHaveLength(1);
        const tpMain = node.children![0];
        expect(tpMain.label).toBe("TP-Main");
        expect(tpMain.children).toHaveLength(1);
        expect(tpMain.children![0].label).toBe("TP-Validate-1");
        expect(tpMain.children![0].type).toBe("technicalProfile");
    });

    it("orphan CTs appear at step level", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            children: [
                makeTpFlowNode("TP-Only"),
                makeCtFlowNode("CT-Orphan-1"),
                makeCtFlowNode("CT-Orphan-2"),
            ],
        });

        const node = buildStepNode(stepNode);

        // TP + 2 orphan CTs
        expect(node.children).toHaveLength(3);

        const tpChildren = node.children?.filter((c) => c.type === "technicalProfile") ?? [];
        expect(tpChildren).toHaveLength(1);

        // Orphan CTs at step level
        const topLevelCts = node.children?.filter((c) => c.type === "transformation") ?? [];
        expect(topLevelCts).toHaveLength(2);
        expect(topLevelCts[0].label).toBe("CT-Orphan-1");
    });

    it("CTs with known parent TP are nested under that TP", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            children: [
                makeTpFlowNode("TP-A", {
                    children: [makeCtFlowNode("CT-Nested")],
                }),
                makeTpFlowNode("TP-B", { providerType: "AzureActiveDirectoryProvider" }),
            ],
        });

        const node = buildStepNode(stepNode);

        const tpA = node.children?.find((c) => c.label === "TP-A");
        expect(tpA!.children).toHaveLength(1);
        expect(tpA!.children![0].label).toBe("CT-Nested");

        // CT should not appear at top-level
        const topLevelCts = node.children?.filter((c) => c.type === "transformation") ?? [];
        expect(topLevelCts).toHaveLength(0);
    });

    it("step with no children has undefined children prop", () => {
        const stepNode = makeStepFlowNode(1, 1);
        const node = buildStepNode(stepNode);

        expect(node.children).toBeUndefined();
    });
});

// ============================================================================
// Helpers for dedup tests
// ============================================================================

/** Recursively collect all labels from a tree node and its descendants. */
function flattenLabels(node: TreeNode): string[] {
    const labels = [node.label];
    if (node.children) {
        for (const child of node.children) {
            labels.push(...flattenLabels(child));
        }
    }
    return labels;
}

// ============================================================================
// Semantic Labels (4a-1)
// ============================================================================

describe("semantic labels", () => {
    it("should include primary TP name in step label", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            children: [makeTpFlowNode("AAD-UserRead")],
        });
        const node = buildStepNode(stepNode);

        expect(node.label).toBe("Step 1 — AAD-UserRead");
    });

    it("should fall back to actionHandler when no TPs", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            actionHandler: "ClaimsExchangeHandler",
        });
        const node = buildStepNode(stepNode);

        expect(node.label).toBe("Step 1 — ClaimsExchangeHandler");
    });

    it("should fall back to Unknown when no TPs and no actionHandler", () => {
        const stepNode = makeStepFlowNode(1, 1);
        const node = buildStepNode(stepNode);

        expect(node.label).toBe("Step 1 — Unknown");
    });

    it("should include isFinalStep in metadata", () => {
        const stepNode = makeStepFlowNode(1, 1, { actionHandler: "SendClaims" });
        const node = buildStepNode(stepNode);

        expect(node.metadata?.isFinalStep).toBe(true);
    });
});

// ============================================================================
// FlowNode-driven hierarchy (ISS-006)
// ============================================================================

describe("FlowNode-driven hierarchy (ISS-006)", () => {
    it("simple 1-TP step: single TP child, no orphan CTs", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            children: [makeTpFlowNode("AAD-UserRead")],
        });
        const node = buildStepNode(stepNode);

        expect(node.children).toHaveLength(1);
        expect(node.children![0].type).toBe("technicalProfile");
        expect(node.children![0].label).toBe("AAD-UserRead");

        // No transformation children at step level
        const topLevelCts = node.children!.filter((c) => c.type === "transformation");
        expect(topLevelCts).toHaveLength(0);
    });

    it("SelfAsserted with validation TPs: VTPs nested under SA TP", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            children: [
                makeTpFlowNode("SelfAsserted-ProfileEdit", {
                    providerType: "SelfAssertedAttributeProvider",
                    children: [makeTpFlowNode("AAD-UserWrite", { providerType: "AzureActiveDirectoryProvider" })],
                }),
            ],
        });
        const node = buildStepNode(stepNode);

        // SelfAsserted TP is a child of the step
        const saNode = node.children?.find((c) => c.label === "SelfAsserted-ProfileEdit");
        expect(saNode).toBeDefined();

        // AAD-UserWrite is nested under SelfAsserted TP (as VTP)
        const nestedVtp = saNode!.children?.find((c) => c.label === "AAD-UserWrite");
        expect(nestedVtp).toBeDefined();
        expect(nestedVtp!.type).toBe("technicalProfile");

        // AAD-UserWrite does NOT appear at step level
        const stepLevelTps = node.children?.filter((c) => c.label === "AAD-UserWrite") ?? [];
        expect(stepLevelTps).toHaveLength(0);
    });

    it("DC with nested TPs: REST-Verify under DC node, DC nested under SelfAsserted TP", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            children: [
                makeTpFlowNode("SelfAsserted-SA", {
                    providerType: "SelfAssertedAttributeProvider",
                }),
                makeDcFlowNode("emailVerify", "Send", {
                    children: [makeTpFlowNode("REST-Verify")],
                }),
            ],
        });
        const node = buildStepNode(stepNode);

        // SelfAsserted-SA is a child of the step
        const saNode = node.children?.find((c) => c.label === "SelfAsserted-SA");
        expect(saNode).toBeDefined();

        // DC node nested under SelfAsserted TP
        const dcNode = saNode!.children?.find((c) => c.type === "displayControl");
        expect(dcNode).toBeDefined();
        expect(dcNode!.metadata?.displayControlId).toBe("emailVerify");

        // REST-Verify nested under DC node
        const dcTp = dcNode!.children?.find((c) => c.label === "REST-Verify");
        expect(dcTp).toBeDefined();
        expect(dcTp!.type).toBe("dcTechnicalProfile");

        // REST-Verify does NOT appear at step level
        const stepLevelRestVerify = node.children?.filter((c) => c.label === "REST-Verify") ?? [];
        expect(stepLevelRestVerify).toHaveLength(0);
    });

    it("each component appears exactly once", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            children: [
                makeTpFlowNode("SA", {
                    providerType: "SelfAssertedAttributeProvider",
                    children: [
                        makeTpFlowNode("VTP-1"),
                        makeTpFlowNode("VTP-2"),
                        makeCtFlowNode("CT-A"),
                    ],
                }),
                makeCtFlowNode("CT-B"),
            ],
        });
        const node = buildStepNode(stepNode);

        const allLabels = flattenLabels(node);

        // Each component appears exactly once
        for (const component of ["SA", "VTP-1", "VTP-2", "CT-A", "CT-B"]) {
            const count = allLabels.filter((l) => l === component).length;
            expect(count, `"${component}" should appear exactly once, found ${count}`).toBe(1);
        }
    });

    it("HRD step excludes selected option from TP children", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            selectableOptions: ["Google", "Facebook"],
            selectedOption: "Google",
            actionHandler: "ClaimsProviderSelection-HomeRealmDiscovery",
            children: [
                makeHrdFlowNode(["Google", "Facebook"], "Google"),
                makeTpFlowNode("Google"),
                makeTpFlowNode("Facebook"),
            ],
        });
        const node = buildStepNode(stepNode);

        // HRD node exists
        const hrdNode = node.children?.find((c) => c.type === "hrd");
        expect(hrdNode).toBeDefined();

        // Selected option "Google" is excluded from TP children
        const tpLabels = node.children?.filter((c) => c.type === "technicalProfile").map((c) => c.label) ?? [];
        expect(tpLabels).not.toContain("Google");
        // Non-selected option "Facebook" remains as a TP child
        expect(tpLabels).toContain("Facebook");
    });

    it("orphan CTs appear at step level when multiple TPs exist", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            children: [
                makeTpFlowNode("TP-A"),
                makeTpFlowNode("TP-B", { providerType: "AzureActiveDirectoryProvider" }),
                makeCtFlowNode("CT-Orphan"),
            ],
        });
        const node = buildStepNode(stepNode);

        // CT-Orphan is at step level (direct FlowNode child)
        const topLevelCts = node.children?.filter((c) => c.type === "transformation") ?? [];
        expect(topLevelCts).toHaveLength(1);
        expect(topLevelCts[0].label).toBe("CT-Orphan");

        // CT-Orphan is NOT nested under TP-A or TP-B
        const tpA = node.children?.find((c) => c.label === "TP-A");
        const tpB = node.children?.find((c) => c.label === "TP-B");
        const tpACts = tpA?.children?.filter((c) => c.type === "transformation") ?? [];
        const tpBCts = tpB?.children?.filter((c) => c.type === "transformation") ?? [];
        expect(tpACts).toHaveLength(0);
        expect(tpBCts).toHaveLength(0);
    });

    it("DC with nested TP and CT creates correct hierarchy", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            children: [
                makeDcFlowNode("captcha", "Verify", {
                    children: [
                        makeTpFlowNode("TP-Captcha", {
                            children: [makeCtFlowNode("CT-Cap")],
                        }),
                    ],
                }),
            ],
        });
        const node = buildStepNode(stepNode);

        // DC node exists
        const dcNode = node.children?.find((c) => c.type === "displayControl");
        expect(dcNode).toBeDefined();
        expect(dcNode!.children).toHaveLength(1);
        expect(dcNode!.children![0].label).toBe("TP-Captcha");
        expect(dcNode!.children![0].type).toBe("dcTechnicalProfile");

        // CT-Cap is nested under the DC's TP as dcTransformation
        const dcTp = dcNode!.children![0];
        expect(dcTp.children).toHaveLength(1);
        expect(dcTp.children![0].label).toBe("CT-Cap");
        expect(dcTp.children![0].type).toBe("dcTransformation");

        // CT-Cap does NOT appear at step level
        const stepCtNodes = node.children?.filter((c) => c.type === "transformation") ?? [];
        expect(stepCtNodes).toHaveLength(0);
    });

    it("HRD step nests validation TPs under the selected option", () => {
        const stepNode = makeStepFlowNode(1, 1, {
            selectableOptions: ["SelfAsserted-LocalAccountSignin-Email", "ForgotPassword"],
            selectedOption: "SelfAsserted-LocalAccountSignin-Email",
            actionHandler: "SendResponseHandler",
            uiSettings: { pageType: "CombinedSigninAndSignup" },
            children: [
                makeHrdFlowNode(
                    ["SelfAsserted-LocalAccountSignin-Email", "ForgotPassword"],
                    "SelfAsserted-LocalAccountSignin-Email",
                ),
                makeTpFlowNode("SelfAsserted-LocalAccountSignin-Email", {
                    providerType: "SelfAssertedAttributeProvider",
                    children: [
                        makeTpFlowNode("login-NonInteractive"),
                    ],
                }),
            ],
        });

        const node = buildStepNode(stepNode);
        const hrdNode = node.children?.find((c) => c.type === "hrd");
        expect(hrdNode).toBeDefined();

        // Selected option has VTP as child
        const selectedChild = hrdNode!.children?.find((c) => c.type === "selectedOption");
        expect(selectedChild).toBeDefined();
        expect(selectedChild!.label).toBe("SelfAsserted-LocalAccountSignin-Email");
        expect(selectedChild!.children).toHaveLength(1);
        expect(selectedChild!.children![0].label).toBe("login-NonInteractive");
        expect(selectedChild!.children![0].type).toBe("technicalProfile");

        // Non-selected option has no children and is hrdOption type
        const nonSelected = hrdNode!.children?.find((c) => c.type === "hrdOption");
        expect(nonSelected).toBeDefined();
        expect(nonSelected!.label).toBe("ForgotPassword");
        expect(nonSelected!.children).toBeUndefined();

        // VTP does NOT appear at step level
        const stepTpNodes = node.children?.filter((c) => c.type === "technicalProfile") ?? [];
        expect(stepTpNodes.map((n) => n.label)).not.toContain("login-NonInteractive");
    });

    it("flowNode reference is carried on step and child TreeNodes", () => {
        const tpFlowNode = makeTpFlowNode("TP-Read");
        const stepNode = makeStepFlowNode(1, 1, {
            children: [tpFlowNode],
        });
        const node = buildStepNode(stepNode);

        expect(node.flowNode).toBe(stepNode);
        expect(node.children![0].flowNode).toBe(tpFlowNode);
    });
});
