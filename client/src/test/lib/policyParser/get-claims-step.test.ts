import { beforeAll, describe, expect, it } from "vitest";
import { NODE_TYPES } from "@/components/nodeTypes";
import {
    USER_JOURNEY_WITH_GET_CLAIMS_XML,
    USER_JOURNEY_WITH_GET_CLAIMS_RELYING_PARTY_INPUT_XML,
} from "../../fixtures/policy-xml-fixtures";
import { createPolicyParserFixture } from "../../utils/policy-parser-fixture";
import type { PolicyData, PolicyGraph } from "@/lib/policyParser";
import type { Node } from "@xyflow/react";

const standardFixture = createPolicyParserFixture(USER_JOURNEY_WITH_GET_CLAIMS_XML, "CollectQuery");
const relyingPartyFixture = createPolicyParserFixture(
    USER_JOURNEY_WITH_GET_CLAIMS_RELYING_PARTY_INPUT_XML,
    "SignUp"
);

describe("PolicyParserService - GetClaims orchestration step", () => {
    let policyData: PolicyData;
    let graph: PolicyGraph;

    beforeAll(async () => {
        policyData = await standardFixture.load();
        graph = standardFixture.getGraph();
    });

    it("should parse the policy without errors", () => {
        expect(policyData.errors?.size).toBe(0);
    });

    it("should create a GetClaims node with resolved technical profile", () => {
        const getClaimsNode = graph.nodes.find((node: Node) => node.type === NODE_TYPES.GET_CLAIMS);
        expect(getClaimsNode).toBeDefined();

        const nodeData = getClaimsNode?.data as Record<string, unknown> | undefined;
        expect(nodeData).toBeDefined();

        const orchestrationStep = nodeData?.orchestrationStep as {
            cpimIssuerTechnicalProfileReferenceId?: string;
            technicalProfiles?: Array<{ id: string; inputClaims?: unknown[] }>;
        } | undefined;

        expect(orchestrationStep?.cpimIssuerTechnicalProfileReferenceId).toBe("CollectQueryParams");
        expect(orchestrationStep?.technicalProfiles?.[0]?.id).toBe("CollectQueryParams");
        expect(orchestrationStep?.technicalProfiles?.[0]?.inputClaims).toHaveLength(2);
    });
});

describe("PolicyParserService - GetClaims relying on RelyingParty inputs", () => {
    let graph: PolicyGraph;

    beforeAll(async () => {
        await relyingPartyFixture.load();
        graph = relyingPartyFixture.getGraph();
    });

    it("should fall back to relying party input claims when technical profile lacks them", () => {
        const getClaimsNode = graph.nodes.find((node: Node) => node.type === NODE_TYPES.GET_CLAIMS);
        expect(getClaimsNode).toBeDefined();

        const nodeData = getClaimsNode?.data as Record<string, unknown> | undefined;
        expect(nodeData?.orchestrationStep).toBeDefined();

        const orchestrationStep = nodeData?.orchestrationStep as {
            technicalProfiles?: Array<{ id: string; inputClaims?: unknown[] }>;
        } | undefined;

        expect(orchestrationStep?.technicalProfiles?.[0]?.inputClaims).toBeUndefined();

        const relyingPartyInputClaims = nodeData?.relyingPartyInputClaims as Array<{ partnerClaimType?: string }> | undefined;
        expect(relyingPartyInputClaims).toHaveLength(2);
        expect(relyingPartyInputClaims?.[0]?.partnerClaimType).toBe("userId");
    });
});