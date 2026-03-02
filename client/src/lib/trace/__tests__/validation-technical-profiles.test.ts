/**
 * Validation Technical Profile Tests
 *
 * Tests the parser's ability to extract validation technical profiles
 * from self-asserted form submissions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import { getTestSteps } from "./test-step-helpers";
import {
    createTestFixture,
    buildTraceLogInput,
    buildHeadersClip,
    buildOrchestrationManagerAction,
    buildOrchestrationResult,
    buildActionClip,
    buildActionResult,
    buildValidationTechnicalProfileRecord,
    buildCtpStatebag,
    buildSelfAssertedStep,
    type TestFixture,
} from "./fixtures";

describe("Validation Technical Profiles", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("Validation TP Extraction", () => {
        it("should extract validation technical profile from Validation.Values", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildActionClip("SelfAssertedMessageValidationHandler"),
                        buildActionResult(true, buildValidationTechnicalProfileRecord(fixture.technicalProfiles.aadRead)),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(getTestSteps(result)[0].technicalProfileNames).toContain(fixture.technicalProfiles.aadRead);
        });

        it("should handle multiple validation technical profiles in same step", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildActionClip("SelfAssertedMessageValidationHandler"),
                        buildActionResult(true, {
                            Values: [
                                {
                                    Key: "Validation",
                                    Value: {
                                        Values: [
                                            {
                                                Key: "ValidationTechnicalProfile",
                                                Value: {
                                                    Values: [
                                                        { Key: "TechnicalProfileId", Value: fixture.technicalProfiles.aadRead },
                                                    ],
                                                },
                                            },
                                            {
                                                Key: "ValidationTechnicalProfile",
                                                Value: {
                                                    Values: [
                                                        { Key: "TechnicalProfileId", Value: fixture.technicalProfiles.aadWrite },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        }),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps[0].technicalProfileNames).toHaveLength(2);
            expect(steps[0].technicalProfileNames).toContain(fixture.technicalProfiles.aadRead);
            expect(steps[0].technicalProfileNames).toContain(fixture.technicalProfiles.aadWrite);
        });

        it("should separate main TP from validation TPs", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1, buildCtpStatebag(fixture.technicalProfiles.selfAssertedSignIn, 1)),
                        buildActionClip("SelfAssertedMessageValidationHandler"),
                        buildActionResult(true, buildValidationTechnicalProfileRecord(fixture.technicalProfiles.aadRead)),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps[0].technicalProfileNames).toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(steps[0].technicalProfileNames).toContain(fixture.technicalProfiles.aadRead);
        });
    });

    describe("Claim Mappings", () => {
        it("should extract claim mappings from MappingFromPartnerClaimType", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildActionClip("SelfAssertedMessageValidationHandler"),
                        buildActionResult(
                            true,
                            buildValidationTechnicalProfileRecord(fixture.technicalProfiles.aadRead, [
                                { partner: "oid", policy: "objectId" },
                                { partner: "upn", policy: "userPrincipalName" },
                            ])
                        ),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            const claimMappings = steps[0].technicalProfiles.flatMap(tp => tp.claimMappings ?? []);
            expect(claimMappings).toBeDefined();
            expect(claimMappings).toContainEqual({
                partnerClaimType: "oid",
                policyClaimType: "objectId",
            });
            expect(claimMappings).toContainEqual({
                partnerClaimType: "upn",
                policyClaimType: "userPrincipalName",
            });
        });
    });

    describe("Self-Asserted Step Builder", () => {
        it("should create proper self-asserted step with validation TP", () => {
            const logs = [buildSelfAssertedStep(fixture, 1, fixture.technicalProfiles.selfAssertedSignIn, fixture.technicalProfiles.aadRead, 0)];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps[0].eventType).toBe("SELFASSERTED");
            expect(steps[0].technicalProfileNames).toContain(fixture.technicalProfiles.aadRead);
        });

        it("should handle self-asserted step without validation TP", () => {
            const logs = [buildSelfAssertedStep(fixture, 1, fixture.technicalProfiles.selfAssertedSignIn, undefined, 0)];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps[0].eventType).toBe("SELFASSERTED");
            // When no validation TP is provided, only the self-asserted main TP may appear
            expect(steps[0].technicalProfileNames.filter(n => n !== fixture.technicalProfiles.selfAssertedSignIn)).toEqual([]);
        });
    });
});
