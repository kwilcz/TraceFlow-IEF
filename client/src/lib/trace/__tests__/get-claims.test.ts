import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import { collectStepNodes } from "@/lib/trace/domain/flow-node-utils";
import { FlowNodeType, type GetClaimsFlowData } from "@/types/flow-node";
import {
    createTestFixture,
    buildTraceLogInput,
    buildHeadersClip,
    buildOrchestrationManagerAction,
    buildOrchestrationResult,
    buildActionClip,
    buildActionResult,
    buildComplexClaimsStatebag,
    type TestFixture,
} from "./fixtures";

describe("GetClaims", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    it("shows only claims changed by the GetClaims handler", () => {
        const logs = [
            buildTraceLogInput(
                fixture,
                [
                    buildHeadersClip(fixture, "Event:AUTH"),
                    buildOrchestrationManagerAction(),
                    buildOrchestrationResult(1, buildComplexClaimsStatebag({
                        email: fixture.userEmail,
                    })),
                ],
                0,
            ),
            buildTraceLogInput(
                fixture,
                [
                    buildHeadersClip(fixture, "Event:API"),
                    buildOrchestrationManagerAction(),
                    buildOrchestrationResult(2),
                    buildActionClip("GetRelyingPartyInputClaimsHandler"),
                    buildActionResult(true, undefined, {
                        ...buildComplexClaimsStatebag({
                            email: fixture.userEmail,
                            isNewSession: "True",
                        }),
                    }),
                ],
                1000,
            ),
        ];

        const result = parseTrace(logs);
        const steps = collectStepNodes(result.flowTree);
        const getClaimsStep = steps.find((step) => step.data.type === FlowNodeType.Step && step.data.stepOrder === 2);

        expect(getClaimsStep).toBeDefined();

        const getClaimsNode = getClaimsStep?.children.find((child) => child.type === FlowNodeType.GetClaims);
        expect(getClaimsNode).toBeDefined();

        const getClaimsData = getClaimsNode?.data as GetClaimsFlowData;
        expect(getClaimsData.extractedClaims).toEqual([
            { claimType: "isNewSession", value: "True" },
        ]);
    });
});