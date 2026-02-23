import { describe, expect, it } from "vitest";
import { buildStepNode, buildTreeStructure } from "@/features/log-analyzer/debugger/journey-tree/tree-builder";
import type { TraceStep } from "@/types/trace";
import type { TreeNode } from "@/features/log-analyzer/debugger/types";

// ============================================================================
// Factory helper
// ============================================================================

function makeTraceStep(overrides: Partial<TraceStep> = {}): TraceStep {
    return {
        sequenceNumber: 1,
        timestamp: new Date("2026-01-01T00:00:00Z"),
        logId: "log-1",
        duration: 100,
        eventType: "AUTH",
        graphNodeId: "Main-Step1",
        journeyContextId: "MainJourney",
        currentJourneyName: "B2C_1A_signup_signin",
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

// ============================================================================
// buildTreeStructure
// ============================================================================

describe("buildTreeStructure", () => {
    it("returns empty array for empty input", () => {
        expect(buildTreeStructure([])).toEqual([]);
    });

    it("single main journey: wraps steps in root userjourney node", () => {
        const steps = [
            makeTraceStep({ sequenceNumber: 1, stepOrder: 1 }),
            makeTraceStep({ sequenceNumber: 2, stepOrder: 2 }),
        ];

        const tree = buildTreeStructure(steps);

        // Root is a single userjourney node
        expect(tree).toHaveLength(1);
        expect(tree[0].type).toBe("userjourney");
        expect(tree[0].label).toBe("B2C_1A_signup_signin");
        expect(tree[0].id).toBe("userjourney-MainJourney");
        // Step children inside the root node
        expect(tree[0].children).toHaveLength(2);
        expect(tree[0].children![0].type).toBe("step");
        expect(tree[0].children![1].type).toBe("step");
    });

    it("multiple sub-journeys: wraps subjourneys under root userjourney node", () => {
        const steps = [
            makeTraceStep({ sequenceNumber: 1, journeyContextId: "MainJourney", subJourneyId: undefined }),
            makeTraceStep({ sequenceNumber: 2, journeyContextId: "SubJourney-MFA", subJourneyId: "MFA" }),
        ];

        const tree = buildTreeStructure(steps);

        // Root is a single userjourney node
        expect(tree).toHaveLength(1);
        expect(tree[0].type).toBe("userjourney");
        // Contains two subjourney groups
        expect(tree[0].children).toHaveLength(2);
        expect(tree[0].children![0].type).toBe("subjourney");
        expect(tree[0].children![1].type).toBe("subjourney");
        expect(tree[0].children![0].children).toHaveLength(1);
        expect(tree[0].children![1].children).toHaveLength(1);
    });

    it("journey node metadata aggregates TP count and error status", () => {
        const steps = [
            makeTraceStep({
                sequenceNumber: 1,
                journeyContextId: "SubJourney-A",
                subJourneyId: "A",
                technicalProfiles: ["TP-1", "TP-2"],
                result: "Success",
            }),
            makeTraceStep({
                sequenceNumber: 2,
                journeyContextId: "SubJourney-A",
                subJourneyId: "A",
                technicalProfiles: ["TP-3"],
                result: "Error",
            }),
            makeTraceStep({
                sequenceNumber: 3,
                journeyContextId: "SubJourney-B",
                subJourneyId: "B",
                technicalProfiles: [],
                result: "Success",
            }),
        ];

        const tree = buildTreeStructure(steps);

        // Subjourney nodes are children of the root userjourney node
        const root = tree[0];
        expect(root.type).toBe("userjourney");

        const journeyA = root.children!.find((n) => n.id === "journey-SubJourney-A")!;
        expect(journeyA.metadata?.tpCount).toBe(3);
        expect(journeyA.metadata?.result).toBe("Error");

        const journeyB = root.children!.find((n) => n.id === "journey-SubJourney-B")!;
        expect(journeyB.metadata?.tpCount).toBe(0);
        expect(journeyB.metadata?.result).toBe("Success");
    });

    it("root userjourney node uses currentJourneyName as label", () => {
        const steps = [
            makeTraceStep({ currentJourneyName: "B2C_1A_custom_policy" }),
        ];

        const tree = buildTreeStructure(steps);

        expect(tree[0].type).toBe("userjourney");
        expect(tree[0].label).toBe("B2C_1A_custom_policy");
    });

    it("root userjourney node metadata aggregates tpCount and result", () => {
        const steps = [
            makeTraceStep({ sequenceNumber: 1, technicalProfiles: ["TP-1", "TP-2"], result: "Success" }),
            makeTraceStep({ sequenceNumber: 2, technicalProfiles: ["TP-3"], result: "Error" }),
        ];

        const tree = buildTreeStructure(steps);

        const root = tree[0];
        expect(root.type).toBe("userjourney");
        expect(root.metadata?.tpCount).toBe(3);
        expect(root.metadata?.result).toBe("Error");
    });

    it("root userjourney node result is Success when no steps errored", () => {
        const steps = [
            makeTraceStep({ sequenceNumber: 1, result: "Success" }),
            makeTraceStep({ sequenceNumber: 2, result: "Success" }),
        ];

        const tree = buildTreeStructure(steps);

        expect(tree[0].metadata?.result).toBe("Success");
    });
});

// ============================================================================
// buildStepNode
// ============================================================================

describe("buildStepNode", () => {
    it("creates basic step node with label and metadata", () => {
        const step = makeTraceStep({ sequenceNumber: 5, stepOrder: 3, result: "Skipped", duration: 250 });
        const node = buildStepNode(step, 5);

        expect(node.id).toBe("step-5");
        expect(node.label).toBe("Step 3 — Unknown");
        expect(node.type).toBe("step");
        expect(node.stepIndex).toBe(5);
        expect(node.metadata?.result).toBe("Skipped");
        expect(node.metadata?.duration).toBe(250);
    });

    it("step with TPs creates technicalProfile children", () => {
        const step = makeTraceStep({
            technicalProfiles: ["TP-Read", "TP-Write"],
        });
        const node = buildStepNode(step, 1);

        expect(node.children).toHaveLength(2);
        expect(node.children![0].type).toBe("technicalProfile");
        expect(node.children![0].label).toBe("TP-Read");
        expect(node.children![1].label).toBe("TP-Write");
    });

    it("step with CTs creates transformation children", () => {
        const step = makeTraceStep({
            claimsTransformations: ["CT-Email", "CT-Phone"],
        });
        const node = buildStepNode(step, 1);

        expect(node.children).toHaveLength(2);
        expect(node.children![0].type).toBe("transformation");
        expect(node.children![0].label).toBe("CT-Email");
    });

    it("HRD step adds HRD node with selectable options", () => {
        const step = makeTraceStep({
            isInteractiveStep: true,
            selectableOptions: ["google.com", "facebook.com"],
            actionHandler: "ClaimsProviderSelection-HomeRealmDiscovery",
            selectedOption: "google.com",
            technicalProfiles: ["google.com", "facebook.com"],
        });

        const node = buildStepNode(step, 1);
        const hrdNode = node.children?.find((c) => c.type === "hrd");

        expect(hrdNode).toBeDefined();
        expect(hrdNode!.label).toBe("HomeRealmDiscovery");
        expect(hrdNode!.metadata?.selectableOptions).toEqual(["google.com", "facebook.com"]);
        expect(hrdNode!.metadata?.selectedOption).toBe("google.com");
    });

    it("HRD step filters selected option from TP children", () => {
        const step = makeTraceStep({
            isInteractiveStep: true,
            selectableOptions: ["google.com", "facebook.com"],
            actionHandler: "ClaimsProviderSelection-HomeRealmDiscovery",
            selectedOption: "google.com",
            technicalProfiles: ["google.com", "facebook.com"],
        });

        const node = buildStepNode(step, 1);
        const tpLabels = node.children?.filter((c) => c.type === "technicalProfile").map((c) => c.label) ?? [];

        // selected option "google.com" should be excluded from TP children
        expect(tpLabels).not.toContain("google.com");
        expect(tpLabels).toContain("facebook.com");
    });

    it("DisplayControl step creates nested DC nodes with TPs and CTs", () => {
        const step = makeTraceStep({
            displayControlActions: [
                {
                    displayControlId: "captcha",
                    action: "GetChallenge",
                    technicalProfiles: [
                        {
                            technicalProfileId: "TP-Captcha",
                            claimsTransformations: [{ id: "CT-Captcha", inputClaims: [], inputParameters: [], outputClaims: [] }],
                        },
                    ],
                },
            ],
        });

        const node = buildStepNode(step, 1);

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
        const step = makeTraceStep({
            technicalProfiles: ["SelfAsserted-LocalAccount"],
            technicalProfileDetails: [
                { id: "SelfAsserted-LocalAccount", providerType: "SelfAssertedAttributeProvider" },
            ],
            displayControlActions: [
                {
                    displayControlId: "emailVerification",
                    action: "SendCode",
                    technicalProfileId: "TP-SendOtp",
                },
            ],
            validationTechnicalProfiles: ["TP-Validate"],
        });

        const node = buildStepNode(step, 1);

        // Main SA TP is a child
        const saNode = node.children?.find((c) => c.label === "SelfAsserted-LocalAccount");
        expect(saNode).toBeDefined();

        // DCs nested under SA TP
        const nestedDc = saNode!.children?.find((c) => c.type === "displayControl");
        expect(nestedDc).toBeDefined();
        expect(nestedDc!.metadata?.displayControlId).toBe("emailVerification");

        // Validation TPs nested under SA TP
        const vtpNode = saNode!.children?.find((c) => c.label === "TP-Validate");
        expect(vtpNode).toBeDefined();
        expect(vtpNode!.type).toBe("technicalProfile");
    });

    it("step with validation TPs (no SelfAsserted) adds them at step level", () => {
        const step = makeTraceStep({
            technicalProfiles: ["TP-Main"],
            validationTechnicalProfiles: ["TP-Validate-1"],
        });

        const node = buildStepNode(step, 1);

        const labels = node.children?.map((c) => c.label) ?? [];
        expect(labels).toContain("TP-Main");
        expect(labels).toContain("TP-Validate-1");
    });

    it("orphan CTs nest under single primary TP", () => {
        const step = makeTraceStep({
            technicalProfiles: ["TP-Only"],
            claimsTransformations: ["CT-Orphan-1", "CT-Orphan-2"],
        });

        const node = buildStepNode(step, 1);

        // Only one child: the TP
        const tpChildren = node.children?.filter((c) => c.type === "technicalProfile") ?? [];
        expect(tpChildren).toHaveLength(1);

        // Orphan CTs nested under single TP
        const orphanCts = tpChildren[0].children?.filter((c) => c.type === "transformation") ?? [];
        expect(orphanCts).toHaveLength(2);
        expect(orphanCts[0].label).toBe("CT-Orphan-1");

        // No top-level CT children
        const topLevelCts = node.children?.filter((c) => c.type === "transformation") ?? [];
        expect(topLevelCts).toHaveLength(0);
    });

    it("CTs with known parent TP are nested under that TP", () => {
        const step = makeTraceStep({
            technicalProfiles: ["TP-A", "TP-B"],
            claimsTransformations: ["CT-Nested"],
            technicalProfileDetails: [
                {
                    id: "TP-A",
                    providerType: "ClaimsTransformationProtocolProvider",
                    claimsTransformations: [{ id: "CT-Nested", inputClaims: [], inputParameters: [], outputClaims: [] }],
                },
                { id: "TP-B", providerType: "AzureActiveDirectoryProvider" },
            ],
        });

        const node = buildStepNode(step, 1);

        const tpA = node.children?.find((c) => c.label === "TP-A");
        expect(tpA!.children).toHaveLength(1);
        expect(tpA!.children![0].label).toBe("CT-Nested");

        // CT should not appear at top-level
        const topLevelCts = node.children?.filter((c) => c.type === "transformation") ?? [];
        expect(topLevelCts).toHaveLength(0);
    });

    it("step with no children has undefined children prop", () => {
        const step = makeTraceStep();
        const node = buildStepNode(step, 1);

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
        const step = makeTraceStep({
            technicalProfiles: ["AAD-UserRead"],
        });
        const node = buildStepNode(step, 1);

        expect(node.label).toBe("Step 1 — AAD-UserRead");
    });

    it("should fall back to actionHandler when no TPs", () => {
        const step = makeTraceStep({
            technicalProfiles: [],
            actionHandler: "ClaimsExchangeHandler",
        });
        const node = buildStepNode(step, 1);

        expect(node.label).toBe("Step 1 — ClaimsExchangeHandler");
    });

    it("should fall back to Unknown when no TPs and no actionHandler", () => {
        const step = makeTraceStep({
            technicalProfiles: [],
        });
        const node = buildStepNode(step, 1);

        expect(node.label).toBe("Step 1 — Unknown");
    });

    it("should include isFinalStep in metadata", () => {
        const step = makeTraceStep({
            isFinalStep: true,
        });
        const node = buildStepNode(step, 1);

        expect(node.metadata?.isFinalStep).toBe(true);
    });

    it("should include isVerificationStep in metadata", () => {
        const step = makeTraceStep({
            isVerificationStep: true,
        });
        const node = buildStepNode(step, 1);

        expect(node.metadata?.isVerificationStep).toBe(true);
    });
});

// ============================================================================
// Ownership-chain dedup (ISS-006) (4a-2)
// ============================================================================

describe("ownership-chain dedup (ISS-006)", () => {
    it("simple 1-TP step: single TP child, no orphan CTs", () => {
        const step = makeTraceStep({
            technicalProfiles: ["AAD-UserRead"],
        });
        const node = buildStepNode(step, 1);

        expect(node.children).toHaveLength(1);
        expect(node.children![0].type).toBe("technicalProfile");
        expect(node.children![0].label).toBe("AAD-UserRead");

        // No transformation children at step level
        const topLevelCts = node.children!.filter((c) => c.type === "transformation");
        expect(topLevelCts).toHaveLength(0);
    });

    it("SelfAsserted with validation TPs: VTPs nested under SA TP", () => {
        const step = makeTraceStep({
            technicalProfiles: ["SelfAsserted-ProfileEdit", "AAD-UserWrite"],
            technicalProfileDetails: [
                { id: "SelfAsserted-ProfileEdit", providerType: "SelfAssertedAttributeProvider" },
            ],
            validationTechnicalProfiles: ["AAD-UserWrite"],
        });
        const node = buildStepNode(step, 1);

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
        const step = makeTraceStep({
            technicalProfiles: ["SelfAsserted-SA", "REST-Verify"],
            technicalProfileDetails: [
                { id: "SelfAsserted-SA", providerType: "SelfAssertedAttributeProvider" },
            ],
            displayControlActions: [
                {
                    displayControlId: "emailVerify",
                    action: "Send",
                    technicalProfiles: [{ technicalProfileId: "REST-Verify" }],
                },
            ],
        });
        const node = buildStepNode(step, 1);

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
        const step = makeTraceStep({
            technicalProfiles: ["SA", "VTP-1", "VTP-2"],
            technicalProfileDetails: [
                {
                    id: "SA",
                    providerType: "SelfAssertedAttributeProvider",
                    claimsTransformations: [{ id: "CT-A", inputClaims: [], inputParameters: [], outputClaims: [] }],
                },
            ],
            validationTechnicalProfiles: ["VTP-1", "VTP-2"],
            claimsTransformations: ["CT-A", "CT-B"],
        });
        const node = buildStepNode(step, 1);

        const allLabels = flattenLabels(node);

        // Each component appears exactly once
        for (const component of ["SA", "VTP-1", "VTP-2", "CT-A", "CT-B"]) {
            const count = allLabels.filter((l) => l === component).length;
            expect(count, `"${component}" should appear exactly once, found ${count}`).toBe(1);
        }
    });

    it("HRD step excludes selected option from TP children", () => {
        const step = makeTraceStep({
            isInteractiveStep: true,
            selectableOptions: ["Google", "Facebook"],
            selectedOption: "Google",
            technicalProfiles: ["Google", "Facebook"],
            actionHandler: "ClaimsProviderSelection-HomeRealmDiscovery",
        });
        const node = buildStepNode(step, 1);

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
        const step = makeTraceStep({
            technicalProfiles: ["TP-A", "TP-B"],
            claimsTransformations: ["CT-Orphan"],
        });
        const node = buildStepNode(step, 1);

        // CT-Orphan is at step level (not under any TP) since multiple TPs exist
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

    it("DC with legacy technicalProfileId creates nested TP with CTs", () => {
        const step = makeTraceStep({
            displayControlActions: [
                {
                    displayControlId: "captcha",
                    action: "Verify",
                    technicalProfileId: "TP-Captcha",
                },
            ],
            technicalProfileDetails: [{ id: "TP-Captcha", providerType: "Claimsransformation", claimsTransformations: [{ id: "CT-Cap", inputClaims: [], inputParameters: [], outputClaims: [] }] }],
            claimsTransformations: ["CT-Cap"],
        });
        const node = buildStepNode(step, 1);

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
});
