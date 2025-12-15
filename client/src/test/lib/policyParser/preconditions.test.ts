import { beforeAll, describe, it, expect } from "vitest";
import { type PolicyData, type PolicyGraph } from "@/lib/policyParser";
import { USER_JOURNEY_WITH_PRECONDITIONS_XML } from "../../fixtures/policy-xml-fixtures";
import { createPolicyParserFixture } from "../../utils/policy-parser-fixture";

const preconditionsFixture = createPolicyParserFixture(
    USER_JOURNEY_WITH_PRECONDITIONS_XML,
    "SignInWithCondition"
);

describe("PolicyParserService - Preconditions", () => {
    let policyData: PolicyData;
    let preconditionsGraph: PolicyGraph;

    beforeAll(async () => {
        policyData = await preconditionsFixture.load();
        preconditionsGraph = preconditionsFixture.getGraph();
    });

    it("should parse a user journey with preconditions", () => {
        expect(policyData).toBeDefined();
        expect(policyData.subgraphs["SignInWithCondition"]).toBeDefined();
    });

    it("should create precondition nodes", () => {
        const preconditionNode = preconditionsGraph.nodes.find((n) => n.id.includes("Precondition"));
        expect(preconditionNode).toBeDefined();
        expect(preconditionNode?.type).toBe("Conditioned");
    });

    it("should create multiple precondition nodes for multiple preconditions", () => {
        const preconditionNodes = preconditionsGraph.nodes.filter(
            (n) => n.id.includes("Precondition") && n.id.includes("Step4")
        );

        expect(preconditionNodes).toBeDefined();
        expect(preconditionNodes.length).toBe(3);
    });

    it("should create orchestration step nodes", () => {
        const step1 = preconditionsGraph.nodes.find((n) => n.id === "Step1");
        const step2 = preconditionsGraph.nodes.find((n) => n.id === "Step2");
        const step3 = preconditionsGraph.nodes.find((n) => n.id === "Step3");
        const step4 = preconditionsGraph.nodes.find((n) => n.id === "Step4");

        expect(step1).toBeDefined();
        expect(step2).toBeDefined();
        expect(step3).toBeDefined();
        expect(step4).toBeDefined();
    });

    it("should connect previous step to precondition node", () => {
        const preconditionNode = preconditionsGraph.nodes.find((n) => n.id.includes("Precondition"));
        expect(preconditionNode).toBeDefined();

        const step1ToPrecondition = preconditionsGraph.edges.find(
            (e) => e.source === "Step1" && e.target === preconditionNode!.id
        );
        expect(step1ToPrecondition).toBeDefined();
    });

    it("should create conditional edge from precondition to orchestration step", () => {
        const preconditionNode = preconditionsGraph.nodes.find((n) => n.id.includes("Precondition"));
        expect(preconditionNode).toBeDefined();

        const preconditionToStep2 = preconditionsGraph.edges.find(
            (e) => e.source === preconditionNode!.id && e.target === "Step2"
        );
        expect(preconditionToStep2).toBeDefined();
        expect(preconditionToStep2?.type).toBe("condition-edge");
        expect(preconditionToStep2?.sourceHandle).toBeDefined();
    });

    it("should create edge from precondition skip path to next step", () => {
        const preconditionNode = preconditionsGraph.nodes.find((n) => n.id.includes("Precondition"));
        expect(preconditionNode).toBeDefined();

        const preconditionToStep3 = preconditionsGraph.edges.find(
            (e) => e.source === preconditionNode!.id && e.target === "Step3"
        );

        expect(preconditionToStep3).toBeDefined();
        expect(preconditionToStep3?.type).toBe("condition-edge");
        expect(preconditionToStep3?.sourceHandle).toBeDefined();
    });

    it('should create edge from step with preconditions to the next step', () => {
        const step2Node = preconditionsGraph.nodes.find((n) => n.id === "Step2");
        const step3Node = preconditionsGraph.nodes.find((n) => n.id === "Step3");

        const step2ToStep3 = preconditionsGraph.edges.find(
            (e) => e.source === step2Node!.id && e.target === step3Node!.id
        );

        expect(step2ToStep3).toBeDefined();
    })


    it("should have both true and false handles used on precondition node", () => {
        const preconditionNode = preconditionsGraph.nodes.find((n) => n.id.includes("Precondition"));
        expect(preconditionNode).toBeDefined();

        const edgesFromPrecondition = preconditionsGraph.edges.filter((e) => e.source === preconditionNode!.id);

        expect(edgesFromPrecondition.length).toBe(2);

        const trueEdge = edgesFromPrecondition.find((e) => e.sourceHandle === "true");
        const falseEdge = edgesFromPrecondition.find((e) => e.sourceHandle === "false");

        expect(trueEdge).toBeDefined();
        expect(falseEdge).toBeDefined();
    });
});
