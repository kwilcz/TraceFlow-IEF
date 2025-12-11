/**
 * Validation Technical Profile Tests
 *
 * Tests the parser's ability to extract validation technical profiles
 * from self-asserted form submissions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
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
                        buildActionClip("SelfAssertedAttributeProviderActionHandler"),
                        buildActionResult(true, buildValidationTechnicalProfileRecord(fixture.technicalProfiles.aadRead)),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].validationTechnicalProfiles).toContain(fixture.technicalProfiles.aadRead);
        });

        it("should handle multiple validation technical profiles in same step", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildActionClip("SelfAssertedAttributeProviderActionHandler"),
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

            expect(result.traceSteps[0].validationTechnicalProfiles).toHaveLength(2);
            expect(result.traceSteps[0].validationTechnicalProfiles).toContain(fixture.technicalProfiles.aadRead);
            expect(result.traceSteps[0].validationTechnicalProfiles).toContain(fixture.technicalProfiles.aadWrite);
        });

        it("should separate main TP from validation TPs", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1, buildCtpStatebag(fixture.technicalProfiles.selfAssertedSignIn, 1)),
                        buildActionClip("SelfAssertedAttributeProviderActionHandler"),
                        buildActionResult(true, buildValidationTechnicalProfileRecord(fixture.technicalProfiles.aadRead)),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].technicalProfiles).toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(result.traceSteps[0].validationTechnicalProfiles).toContain(fixture.technicalProfiles.aadRead);
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
                        buildActionClip("SelfAssertedAttributeProviderActionHandler"),
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

            expect(result.traceSteps[0].claimMappings).toBeDefined();
            expect(result.traceSteps[0].claimMappings).toContainEqual({
                partnerClaimType: "oid",
                policyClaimType: "objectId",
            });
            expect(result.traceSteps[0].claimMappings).toContainEqual({
                partnerClaimType: "upn",
                policyClaimType: "userPrincipalName",
            });
        });
    });

    describe("Self-Asserted Step Builder", () => {
        it("should create proper self-asserted step with validation TP", () => {
            const logs = [buildSelfAssertedStep(fixture, 1, fixture.technicalProfiles.selfAssertedSignIn, fixture.technicalProfiles.aadRead, 0)];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].eventType).toBe("SELFASSERTED");
            expect(result.traceSteps[0].validationTechnicalProfiles).toContain(fixture.technicalProfiles.aadRead);
        });

        it("should handle self-asserted step without validation TP", () => {
            const logs = [buildSelfAssertedStep(fixture, 1, fixture.technicalProfiles.selfAssertedSignIn, undefined, 0)];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].eventType).toBe("SELFASSERTED");
            // When no validation TP is provided, the array may be undefined or empty
            expect(result.traceSteps[0].validationTechnicalProfiles ?? []).toEqual([]);
        });
    });
});
