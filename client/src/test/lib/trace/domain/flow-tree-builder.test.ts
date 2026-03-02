import { describe, it, expect, beforeEach } from "vitest";
import { FlowTreeBuilder } from "@/lib/trace/domain/flow-tree-builder";
import type {
    FlowNodeContext,
    StepFlowData,
    TechnicalProfileFlowData,
    ClaimsTransformationFlowData,
    HomeRealmDiscoveryFlowData,
    DisplayControlFlowData,
} from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";

function makeContext(overrides: Partial<FlowNodeContext> = {}): FlowNodeContext {
    return {
        timestamp: new Date("2025-01-01T00:00:00Z"),
        sequenceNumber: 0,
        logId: "log-1",
        eventType: "AUTH",
        statebagSnapshot: {},
        claimsSnapshot: {},
        ...overrides,
    };
}

function makeStepData(overrides: Partial<StepFlowData> & { stepIndex?: number } = {}): StepFlowData {
    // stepIndex was removed from StepFlowData — strip it from overrides
    const { stepIndex: _, ...rest } = overrides;
    return {
        type: FlowNodeType.Step,
        stepOrder: 1,
        currentJourneyName: "",
        result: "Success",
        errors: [],
        selectableOptions: [],
        ...rest,
    };
}

describe("FlowTreeBuilder", () => {
    let builder: FlowTreeBuilder;

    beforeEach(() => {
        builder = new FlowTreeBuilder();
    });

    // ----------------------------------------------------------------
    // 1. Initial state
    // ----------------------------------------------------------------
    describe("initial state", () => {
        it("should have a root node with no children", () => {
            const tree = builder.getTree();
            expect(tree.type).toBe("root");
            expect(tree.id).toBe("root");
            expect(tree.name).toBe("UserJourney");
            expect(tree.children).toEqual([]);
        });

        it("should have root as current node", () => {
            expect(builder.current).toBe(builder.getTree());
        });

        it("root data should have empty policyId", () => {
            const tree = builder.getTree();
            expect(tree.data).toEqual({ type: FlowNodeType.Root, policyId: "" });
        });
    });

    // ----------------------------------------------------------------
    // 2. addStep — adds step child to current (root initially)
    // ----------------------------------------------------------------
    describe("addStep", () => {
        it("should add a step node as child of root", () => {
            const data = makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success", actionHandler: "OrchestrationManager" });
            builder.addStep(data, makeContext());

            const tree = builder.getTree();
            expect(tree.children).toHaveLength(1);

            const step = tree.children[0];
            expect(step.type).toBe(FlowNodeType.Step);
            expect(step.id).toBe("step-root-1");
            expect(step.name).toBe("Step 1");
            expect(step.triggeredAtStep).toBe(1);
            expect(step.lastStep).toBe(1);
            expect(step.data).toBe(data);
        });

        it("should add multiple steps as siblings", () => {
            builder.addStep(makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success", actionHandler: "Handler1" }), makeContext());
            builder.addStep(makeStepData({ stepIndex: 1, stepOrder: 2, result: "Skipped", actionHandler: "Handler2" }), makeContext());

            const tree = builder.getTree();
            expect(tree.children).toHaveLength(2);
            expect(tree.children[0].id).toBe("step-root-1");
            expect(tree.children[1].id).toBe("step-root-2");
        });
    });

    // ----------------------------------------------------------------
    // 3. pushSubJourney → addStep — step goes inside SJ
    // ----------------------------------------------------------------
    describe("pushSubJourney then addStep", () => {
        it("should add a step inside the SubJourney", () => {
            builder.pushSubJourney("SJ-Login", "Login SubJourney", 1, makeContext());
            builder.addStep(makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success", actionHandler: "Handler" }), makeContext());

            const tree = builder.getTree();
            expect(tree.children).toHaveLength(1);

            const sj = tree.children[0];
            expect(sj.type).toBe(FlowNodeType.SubJourney);
            expect(sj.id).toBe("sj-SJ-Login");
            expect(sj.name).toBe("Login SubJourney");
            expect(sj.data).toEqual({ type: FlowNodeType.SubJourney, journeyId: "SJ-Login" });

            expect(sj.children).toHaveLength(1);
            const step = sj.children[0];
            expect(step.type).toBe("step");
            expect(step.id).toBe("step-SJ-Login-1");
        });

        it("current should point to the SubJourney after push", () => {
            builder.pushSubJourney("SJ-Login", "Login SubJourney", 1, makeContext());
            expect(builder.current.type).toBe(FlowNodeType.SubJourney);
            expect(builder.current.id).toBe("sj-SJ-Login");
        });
    });

    // ----------------------------------------------------------------
    // 4. push → addStep → pop → addStep — second step to parent
    // ----------------------------------------------------------------
    describe("pushSubJourney → addStep → popSubJourney → addStep", () => {
        it("should place the second step at the parent level", () => {
            builder.pushSubJourney("SJ-Login", "Login", 1, makeContext());
            builder.addStep(makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success", actionHandler: "H1" }), makeContext());
            builder.popSubJourney();
            builder.addStep(makeStepData({ stepIndex: 1, stepOrder: 2, result: "Success", actionHandler: "H2" }), makeContext());

            const tree = builder.getTree();
            // Root has 2 children: the SJ and the step after pop
            expect(tree.children).toHaveLength(2);
            expect(tree.children[0].type).toBe(FlowNodeType.SubJourney);
            expect(tree.children[1].type).toBe(FlowNodeType.Step);
            expect(tree.children[1].id).toBe("step-root-2");

            // SJ has one child step
            expect(tree.children[0].children).toHaveLength(1);
            expect(tree.children[0].children[0].id).toBe("step-SJ-Login-1");
        });

        it("current should return to root after pop", () => {
            builder.pushSubJourney("SJ-Login", "Login", 1, makeContext());
            builder.popSubJourney();
            expect(builder.current).toBe(builder.getTree());
        });
    });

    // ----------------------------------------------------------------
    // 5. Nested push/pop — multiple levels
    // ----------------------------------------------------------------
    describe("nested SubJourneys", () => {
        it("should support two levels of nesting", () => {
            builder.pushSubJourney("SJ-Outer", "Outer", 1, makeContext());
            builder.addStep(makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success", actionHandler: "H1" }), makeContext());

            builder.pushSubJourney("SJ-Inner", "Inner", 2, makeContext());
            builder.addStep(makeStepData({ stepIndex: 1, stepOrder: 2, result: "Success", actionHandler: "H2" }), makeContext());
            builder.popSubJourney();

            builder.addStep(makeStepData({ stepIndex: 2, stepOrder: 3, result: "Success", actionHandler: "H3" }), makeContext());
            builder.popSubJourney();

            const tree = builder.getTree();
            expect(tree.children).toHaveLength(1); // just the outer SJ

            const outer = tree.children[0];
            expect(outer.id).toBe("sj-SJ-Outer");
            expect(outer.children).toHaveLength(3); // step1, inner SJ, step3

            expect(outer.children[0].type).toBe(FlowNodeType.Step);
            expect(outer.children[1].type).toBe(FlowNodeType.SubJourney);
            expect(outer.children[2].type).toBe(FlowNodeType.Step);

            const inner = outer.children[1];
            expect(inner.id).toBe("sj-SJ-Inner");
            expect(inner.children).toHaveLength(1);
            expect(inner.children[0].id).toBe("step-SJ-Inner-2");
        });

        it("popSubJourney at root is a no-op", () => {
            builder.popSubJourney();
            expect(builder.current).toBe(builder.getTree());
        });
    });

    // ----------------------------------------------------------------
    // 6. lastStep propagation
    // ----------------------------------------------------------------
    describe("lastStep propagation", () => {
        it("should update parent lastStep when child step is added", () => {
            const tree = builder.getTree();
            expect(tree.lastStep).toBe(0);

            builder.addStep(makeStepData({ stepIndex: 0, stepOrder: 5, result: "Success", actionHandler: "H1" }), makeContext());
            expect(tree.lastStep).toBe(5);

            builder.addStep(makeStepData({ stepIndex: 1, stepOrder: 10, result: "Success", actionHandler: "H2" }), makeContext());
            expect(tree.lastStep).toBe(10);
        });

        it("should propagate through nested SubJourneys", () => {
            builder.pushSubJourney("SJ-Outer", "Outer", 1, makeContext());
            builder.pushSubJourney("SJ-Inner", "Inner", 2, makeContext());
            builder.addStep(makeStepData({ stepIndex: 0, stepOrder: 7, result: "Success", actionHandler: "H1" }), makeContext());

            const tree = builder.getTree();
            const outer = tree.children[0];
            const inner = outer.children[0];

            expect(inner.lastStep).toBe(7);
            expect(outer.lastStep).toBe(7);
            expect(tree.lastStep).toBe(7);
        });

        it("should not decrease lastStep", () => {
            builder.addStep(makeStepData({ stepIndex: 0, stepOrder: 10, result: "Success", actionHandler: "H1" }), makeContext());
            builder.addStep(makeStepData({ stepIndex: 1, stepOrder: 5, result: "Success", actionHandler: "H2" }), makeContext());

            const tree = builder.getTree();
            expect(tree.lastStep).toBe(10);
        });
    });

    // ----------------------------------------------------------------
    // 7. reset
    // ----------------------------------------------------------------
    describe("reset", () => {
        it("should clear the tree and return to initial state", () => {
            builder.addStep(makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success", actionHandler: "H1" }), makeContext());
            builder.pushSubJourney("SJ-Login", "Login", 2, makeContext());
            builder.addStep(makeStepData({ stepIndex: 1, stepOrder: 2, result: "Success", actionHandler: "H2" }), makeContext());

            builder.reset();

            const tree = builder.getTree();
            expect(tree.type).toBe("root");
            expect(tree.id).toBe("root");
            expect(tree.children).toEqual([]);
            expect(tree.lastStep).toBe(0);
            expect(builder.current).toBe(tree);
        });
    });

    // ----------------------------------------------------------------
    // 8. setRootInfo
    // ----------------------------------------------------------------
    describe("setRootInfo", () => {
        it("should update root name and policyId", () => {
            builder.setRootInfo("B2C_1A_SignUp", "B2C_1A_SignUp");

            const tree = builder.getTree();
            expect(tree.name).toBe("B2C_1A_SignUp");
            expect(tree.data).toEqual({ type: FlowNodeType.Root, policyId: "B2C_1A_SignUp" });
        });

        it("should preserve existing children after setRootInfo", () => {
            builder.addStep(makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success", actionHandler: "H1" }), makeContext());
            builder.setRootInfo("MyPolicy", "MyPolicy");

            const tree = builder.getTree();
            expect(tree.name).toBe("MyPolicy");
            expect(tree.children).toHaveLength(1);
        });
    });

    // ----------------------------------------------------------------
    // 9. SubJourney uses journeyName fallback
    // ----------------------------------------------------------------
    describe("SubJourney name fallback", () => {
        it("should use journeyId as name when journeyName is empty", () => {
            builder.pushSubJourney("SJ-Fallback", "", 1, makeContext());
            expect(builder.current.name).toBe("SJ-Fallback");
        });
    });

    // ----------------------------------------------------------------
    // 10. Context snapshot
    // ----------------------------------------------------------------
    describe("context snapshot", () => {
        it("should capture context on step creation", () => {
            const ctx = makeContext({
                logId: "log-42",
                sequenceNumber: 7,
                eventType: "API",
            });
            builder.addStep(makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success", actionHandler: "H1" }), ctx);

            const step = builder.getTree().children[0];
            expect(step.context).toEqual(ctx);
        });

        it("should capture context on SubJourney creation", () => {
            const ctx = makeContext({ logId: "log-99" });
            builder.pushSubJourney("SJ-1", "SJ One", 1, ctx);

            const sj = builder.getTree().children[0];
            expect(sj.context.logId).toBe("log-99");
        });
    });

    // ----------------------------------------------------------------
    // 11. addTechnicalProfile
    // ----------------------------------------------------------------
    describe("addTechnicalProfile", () => {
        it("should add a TP child to a step node with correct id, name, type, data", () => {
            const stepNode = builder.addStep(
                makeStepData({ stepIndex: 0, stepOrder: 3, result: "Success" }),
                makeContext(),
            );

            const tpData: TechnicalProfileFlowData = {
                type: FlowNodeType.TechnicalProfile,
                technicalProfileId: "LocalAccountSignIn",
                providerType: "SelfAssertedAttributeProvider",
                protocolType: "Proprietary",
            };

            builder.addTechnicalProfile(stepNode, tpData, makeContext());

            expect(stepNode.children).toHaveLength(1);
            const tp = stepNode.children[0];
            expect(tp.id).toBe("tp-LocalAccountSignIn");
            expect(tp.name).toBe("LocalAccountSignIn");
            expect(tp.type).toBe(FlowNodeType.TechnicalProfile);
            expect(tp.data).toBe(tpData);
        });

        it("should return the created FlowNode", () => {
            const stepNode = builder.addStep(
                makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success" }),
                makeContext(),
            );

            const tpData: TechnicalProfileFlowData = {
                type: FlowNodeType.TechnicalProfile,
                technicalProfileId: "AAD-Common",
                providerType: "AzureActiveDirectoryProvider",
            };

            const tpNode = builder.addTechnicalProfile(stepNode, tpData, makeContext());
            expect(tpNode).toBe(stepNode.children[0]);
            expect(tpNode.children).toEqual([]);
        });

        it("should inherit triggeredAtStep and lastStep from parent step", () => {
            const stepNode = builder.addStep(
                makeStepData({ stepIndex: 0, stepOrder: 5, result: "Success" }),
                makeContext(),
            );

            const tpData: TechnicalProfileFlowData = {
                type: FlowNodeType.TechnicalProfile,
                technicalProfileId: "TP-1",
                providerType: "ClaimsProvider",
            };

            const tpNode = builder.addTechnicalProfile(stepNode, tpData, makeContext());
            expect(tpNode.triggeredAtStep).toBe(5);
            expect(tpNode.lastStep).toBe(5);
        });
    });

    // ----------------------------------------------------------------
    // 12. addClaimsTransformation
    // ----------------------------------------------------------------
    describe("addClaimsTransformation", () => {
        it("should add a CT child to a step node", () => {
            const stepNode = builder.addStep(
                makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success" }),
                makeContext(),
            );

            const ctData: ClaimsTransformationFlowData = {
                type: FlowNodeType.ClaimsTransformation,
                transformationId: "CreateAlternativeSecurityId",
                inputClaims: [{ claimType: "key", value: "abc123" }],
                inputParameters: [{ id: "provider", value: "facebook.com" }],
                outputClaims: [{ claimType: "alternativeSecId", value: "facebook:abc123" }],
            };

            builder.addClaimsTransformation(stepNode, ctData, makeContext());

            expect(stepNode.children).toHaveLength(1);
            const ct = stepNode.children[0];
            expect(ct.id).toBe("ct-CreateAlternativeSecurityId");
            expect(ct.name).toBe("CreateAlternativeSecurityId");
            expect(ct.type).toBe(FlowNodeType.ClaimsTransformation);
            expect(ct.data).toBe(ctData);
        });

        it("should add a CT child to a TP node (nested under TP)", () => {
            const stepNode = builder.addStep(
                makeStepData({ stepIndex: 0, stepOrder: 2, result: "Success" }),
                makeContext(),
            );

            const tpData: TechnicalProfileFlowData = {
                type: FlowNodeType.TechnicalProfile,
                technicalProfileId: "AAD-UserWrite",
                providerType: "AzureActiveDirectoryProvider",
            };
            const tpNode = builder.addTechnicalProfile(stepNode, tpData, makeContext());

            const ctData: ClaimsTransformationFlowData = {
                type: FlowNodeType.ClaimsTransformation,
                transformationId: "GenerateRandomObjectId",
                inputClaims: [],
                inputParameters: [],
                outputClaims: [{ claimType: "objectId", value: "guid-123" }],
            };
            builder.addClaimsTransformation(tpNode, ctData, makeContext());

            expect(tpNode.children).toHaveLength(1);
            const ct = tpNode.children[0];
            expect(ct.id).toBe("ct-GenerateRandomObjectId");
            expect(ct.type).toBe(FlowNodeType.ClaimsTransformation);
        });
    });

    // ----------------------------------------------------------------
    // 13. addHomeRealmDiscovery
    // ----------------------------------------------------------------
    describe("addHomeRealmDiscovery", () => {
        it("should add an HRD child to a step node with correct data", () => {
            const stepNode = builder.addStep(
                makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success" }),
                makeContext(),
            );

            const hrdData: HomeRealmDiscoveryFlowData = {
                type: FlowNodeType.HomeRealmDiscovery,
                selectableOptions: ["Facebook-OIDC", "Google-OAUTH"],
                selectedOption: "Facebook-OIDC",
                uiSettings: {
                    language: "en",
                    pageType: "CombinedSigninAndSignup",
                },
            };

            builder.addHomeRealmDiscovery(stepNode, hrdData, makeContext());

            expect(stepNode.children).toHaveLength(1);
            const hrd = stepNode.children[0];
            expect(hrd.id).toBe(`hrd-${stepNode.id}`);
            expect(hrd.name).toBe("Home Realm Discovery");
            expect(hrd.type).toBe(FlowNodeType.HomeRealmDiscovery);
            expect(hrd.data).toBe(hrdData);

            const data = hrd.data as HomeRealmDiscoveryFlowData;
            expect(data.selectableOptions).toEqual(["Facebook-OIDC", "Google-OAUTH"]);
            expect(data.selectedOption).toBe("Facebook-OIDC");
            expect(data.uiSettings).toBeDefined();
        });
    });

    // ----------------------------------------------------------------
    // 14. addDisplayControl
    // ----------------------------------------------------------------
    describe("addDisplayControl", () => {
        it("should add a DC child to a step node", () => {
            const stepNode = builder.addStep(
                makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success" }),
                makeContext(),
            );

            const dcData: DisplayControlFlowData = {
                type: FlowNodeType.DisplayControl,
                displayControlId: "captchaControlChallengeCode",
                action: "GetChallenge",
            };

            builder.addDisplayControl(stepNode, dcData, makeContext());

            expect(stepNode.children).toHaveLength(1);
            const dc = stepNode.children[0];
            expect(dc.id).toBe("dc-captchaControlChallengeCode-GetChallenge");
            expect(dc.name).toBe("captchaControlChallengeCode:GetChallenge");
            expect(dc.type).toBe(FlowNodeType.DisplayControl);
            expect(dc.data).toBe(dcData);
        });

        it("should return the created FlowNode for nesting TP children", () => {
            const stepNode = builder.addStep(
                makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success" }),
                makeContext(),
            );

            const dcData: DisplayControlFlowData = {
                type: FlowNodeType.DisplayControl,
                displayControlId: "emailVerification",
                action: "SendCode",
            };

            const dcNode = builder.addDisplayControl(stepNode, dcData, makeContext());
            expect(dcNode).toBe(stepNode.children[0]);
            expect(dcNode.children).toEqual([]);
        });
    });

    // ----------------------------------------------------------------
    // 15. Nested hierarchy
    // ----------------------------------------------------------------
    describe("nested hierarchy", () => {
        it("should build Step → TP → CT hierarchy", () => {
            const stepNode = builder.addStep(
                makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success" }),
                makeContext(),
            );

            const tpNode = builder.addTechnicalProfile(stepNode, {
                type: FlowNodeType.TechnicalProfile,
                technicalProfileId: "AAD-Read",
                providerType: "AzureActiveDirectoryProvider",
            }, makeContext());

            builder.addClaimsTransformation(tpNode, {
                type: FlowNodeType.ClaimsTransformation,
                transformationId: "NormalizeClaim",
                inputClaims: [{ claimType: "email", value: "TEST@EXAMPLE.COM" }],
                inputParameters: [],
                outputClaims: [{ claimType: "email", value: "test@example.com" }],
            }, makeContext());

            expect(stepNode.children).toHaveLength(1);
            expect(stepNode.children[0].type).toBe(FlowNodeType.TechnicalProfile);
            expect(stepNode.children[0].children).toHaveLength(1);
            expect(stepNode.children[0].children[0].type).toBe(FlowNodeType.ClaimsTransformation);
        });

        it("should build Step → TP → nested TP (validation) hierarchy", () => {
            const stepNode = builder.addStep(
                makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success" }),
                makeContext(),
            );

            const parentTp = builder.addTechnicalProfile(stepNode, {
                type: FlowNodeType.TechnicalProfile,
                technicalProfileId: "SelfAsserted-LocalAccount",
                providerType: "SelfAssertedAttributeProvider",
            }, makeContext());

            const validationTp = builder.addTechnicalProfile(parentTp, {
                type: FlowNodeType.TechnicalProfile,
                technicalProfileId: "AAD-UserReadUsingEmailAddress",
                providerType: "AzureActiveDirectoryProvider",
            }, makeContext());

            expect(stepNode.children).toHaveLength(1);
            expect(parentTp.children).toHaveLength(1);
            expect(parentTp.children[0]).toBe(validationTp);
            expect(validationTp.type).toBe(FlowNodeType.TechnicalProfile);
            expect(validationTp.id).toBe("tp-AAD-UserReadUsingEmailAddress");
        });

        it("should build Step → DC → TP → CT hierarchy", () => {
            const stepNode = builder.addStep(
                makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success" }),
                makeContext(),
            );

            const dcNode = builder.addDisplayControl(stepNode, {
                type: FlowNodeType.DisplayControl,
                displayControlId: "emailVerification",
                action: "SendCode",
            }, makeContext());

            const tpNode = builder.addTechnicalProfile(dcNode, {
                type: FlowNodeType.TechnicalProfile,
                technicalProfileId: "AadSspr-SendCode",
                providerType: "AadSsprProvider",
            }, makeContext());

            builder.addClaimsTransformation(tpNode, {
                type: FlowNodeType.ClaimsTransformation,
                transformationId: "GenerateOtp",
                inputClaims: [],
                inputParameters: [{ id: "length", value: "6" }],
                outputClaims: [{ claimType: "otp", value: "123456" }],
            }, makeContext());

            expect(stepNode.children).toHaveLength(1);
            expect(dcNode.children).toHaveLength(1);
            expect(tpNode.children).toHaveLength(1);
            expect(stepNode.children[0].type).toBe(FlowNodeType.DisplayControl);
            expect(dcNode.children[0].type).toBe(FlowNodeType.TechnicalProfile);
            expect(tpNode.children[0].type).toBe(FlowNodeType.ClaimsTransformation);
        });

        it("should build Step with multiple child types (TP + HRD + DC)", () => {
            const stepNode = builder.addStep(
                makeStepData({ stepIndex: 0, stepOrder: 1, result: "Success" }),
                makeContext(),
            );

            builder.addTechnicalProfile(stepNode, {
                type: FlowNodeType.TechnicalProfile,
                technicalProfileId: "SelfAsserted-Login",
                providerType: "SelfAssertedAttributeProvider",
            }, makeContext());

            builder.addHomeRealmDiscovery(stepNode, {
                type: FlowNodeType.HomeRealmDiscovery,
                selectableOptions: ["Facebook-OIDC"],
            }, makeContext());

            builder.addDisplayControl(stepNode, {
                type: FlowNodeType.DisplayControl,
                displayControlId: "captcha",
                action: "GetChallenge",
            }, makeContext());

            expect(stepNode.children).toHaveLength(3);
            expect(stepNode.children[0].type).toBe(FlowNodeType.TechnicalProfile);
            expect(stepNode.children[1].type).toBe(FlowNodeType.HomeRealmDiscovery);
            expect(stepNode.children[2].type).toBe(FlowNodeType.DisplayControl);
        });
    });
});
