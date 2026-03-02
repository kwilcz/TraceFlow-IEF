/**
 * Display Control Interpreter Tests
 * 
 * Tests the parsing of DisplayControl actions from trace logs.
 */

import { describe, it, expect } from "vitest";
import { parseTrace } from "@/lib/trace";
import type { TraceLogInput } from "@/types/journey-recorder";
import {
    createTestFixture,
    buildTraceLogInput,
    buildHeadersClip,
    buildOrchestrationManagerAction,
    buildOrchestrationResult,
    buildActionClip,
    buildActionResult,
} from "./fixtures";
import { getTestSteps, getStepCount } from "./test-step-helpers";

function createDisplayControlActionResult(displayControlId: string, action: string, technicalProfileId: string) {
    return buildActionResult(true, {
        Values: [
            { Key: "Id", Value: `${displayControlId}/${action}` },
            {
                Key: "DisplayControlAction",
                Value: [
                    {
                        Values: [
                            { Key: "TechnicalProfileId", Value: technicalProfileId },
                        ],
                    },
                ],
            },
            { Key: "Result", Value: "200" },
        ],
    });
}

describe("Display Control Interpreter", () => {
    describe("DisplayControlAction parsing", () => {
        it("should extract technicalProfiles from DisplayControlAction", () => {
            const fixture = createTestFixture();
            const logs = [
                // First: Event:API with OrchestrationManager to create step 1
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        // Add DisplayControlAction in the same log as the step creation
                        buildActionClip("SendDisplayControlActionResponseHandler"),
                        createDisplayControlActionResult("captchaControlChallengeCode", "GetChallenge", "HIP-GetChallenge"),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            // Step 1 should have the DisplayControl action
            expect(steps.length).toBeGreaterThanOrEqual(1);
            
            const step1 = steps[0];
            expect(step1.displayControls).toBeDefined();
            expect(step1.displayControls.length).toBe(1);
            
            const dcAction = step1.displayControls[0];
            expect(dcAction.displayControlId).toBe("captchaControlChallengeCode");
            expect(dcAction.action).toBe("GetChallenge");
            expect(dcAction.technicalProfiles).toBeDefined();
            expect(dcAction.technicalProfiles!.length).toBe(1);
            expect(dcAction.technicalProfiles![0].technicalProfileId).toBe("HIP-GetChallenge");
        });

        it("should extract multiple technicalProfiles from DisplayControlAction", () => {
            const fixture = createTestFixture();
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildActionClip("SendDisplayControlActionResponseHandler"),
                        buildActionResult(true, {
                            Values: [
                                { Key: "Id", Value: "emailVerification/SendCode" },
                                {
                                    Key: "DisplayControlAction",
                                    Value: [
                                        { Values: [{ Key: "TechnicalProfileId", Value: "GenerateOtp" }] },
                                        { Values: [{ Key: "TechnicalProfileId", Value: "SendOtp-Email" }] },
                                    ],
                                },
                                { Key: "Result", Value: "200" },
                            ],
                        }),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            const step1 = steps[0];
            expect(step1.displayControls.length).toBe(1);
            
            const dcAction = step1.displayControls[0];
            expect(dcAction.technicalProfiles).toBeDefined();
            expect(dcAction.technicalProfiles!.length).toBe(2);
            expect(dcAction.technicalProfiles![0].technicalProfileId).toBe("GenerateOtp");
            expect(dcAction.technicalProfiles![1].technicalProfileId).toBe("SendOtp-Email");
        });

        it("should add DisplayControlAction from SELFASSERTED event to existing step", () => {
            const fixture = createTestFixture();
            const logs = [
                // First: Event:API with OrchestrationManager to create step 1
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    0
                ),
                // Second: Event:SELFASSERTED with DisplayControlAction (should add to step 1)
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildActionClip("SendDisplayControlActionResponseHandler"),
                        createDisplayControlActionResult("captchaControlChallengeCode", "GetChallenge", "HIP-GetChallenge"),
                    ],
                    1000
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            // Should still have just 1 step
            expect(steps.length).toBe(1);
            
            const step1 = steps[0];
            expect(step1.displayControls).toBeDefined();
            expect(step1.displayControls.length).toBe(1);
            expect(step1.displayControls[0].displayControlId).toBe("captchaControlChallengeCode");
        });
    });
});
