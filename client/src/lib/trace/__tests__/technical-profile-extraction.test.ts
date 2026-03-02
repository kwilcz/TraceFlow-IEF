/**
 * Technical Profile Extraction Tests
 *
 * Tests the parser's ability to extract technical profile information
 * from various sources: CTP statebag, InitiatingClaimsExchange, etc.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import {
    createTestFixture,
    buildTraceLogInput,
    buildHeadersClip,
    buildOrchestrationManagerAction,
    buildOrchestrationResult,
    buildPredicateClip,
    buildPredicateResult,
    buildActionClip,
    buildActionResult,
    buildInitiatingClaimsExchangeRecord,
    buildCtpStatebag,
    buildClaimsExchangeStep,
    type TestFixture,
} from "./fixtures";
import { getTestSteps } from "./test-step-helpers";

describe("Technical Profile Extraction", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("CTP (Current Technical Profile) Statebag", () => {
        it("should extract technical profile from CTP statebag", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1, buildCtpStatebag(fixture.technicalProfiles.selfAssertedSignIn, 1)),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(getTestSteps(result)[0].technicalProfileNames).toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(getTestSteps(result)[0].technicalProfileNames).toHaveLength(1);
        });

        it("should parse CTP format correctly, removing step number suffix", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(6, buildCtpStatebag(fixture.technicalProfiles.aadRead, 6)),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps[0].technicalProfileNames).toContain(fixture.technicalProfiles.aadRead);
            expect(steps[0].technicalProfileNames).not.toContain(`${fixture.technicalProfiles.aadRead}:6`);
            expect(steps[0].technicalProfileNames).toHaveLength(1);
        });

        it("should handle technical profile names with hyphens", () => {
            const tpWithHyphens = "AAD-UserWrite-ProfileUpdate-NoError";

            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(7, buildCtpStatebag(tpWithHyphens, 7)),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(getTestSteps(result)[0].technicalProfileNames).toContain(tpWithHyphens);
            expect(getTestSteps(result)[0].technicalProfileNames).toHaveLength(1);
        });
    });

    describe("InitiatingClaimsExchange Record", () => {
        it("should extract technical profile from service call handler", () => {
            const logs = [buildClaimsExchangeStep(fixture, 6, fixture.technicalProfiles.aadRead, "AzureActiveDirectoryProvider", 0)];

            const result = parseTrace(logs);

            expect(getTestSteps(result)[0].technicalProfileNames).toContain(fixture.technicalProfiles.aadRead);
            expect(getTestSteps(result)[0].technicalProfileNames).toHaveLength(1);
        });

        it("should extract technical profile from REST API call", () => {
            const logs = [buildClaimsExchangeStep(fixture, 5, fixture.technicalProfiles.restApi, "RestfulProvider", 0)];

            const result = parseTrace(logs);

            expect(getTestSteps(result)[0].technicalProfileNames).toContain(fixture.technicalProfiles.restApi);
            expect(getTestSteps(result)[0].technicalProfileNames).toHaveLength(1);
        });
    });

    describe("InitiatingBackendClaimsExchange Record", () => {
        it("should extract technical profile from backend claims exchange", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(7),
                        buildActionClip("ClaimsExchangeActionHandler"),
                        buildActionResult(true, {
                            Values: [
                                {
                                    Key: "GettingClaims",
                                    Value: {
                                        Values: [
                                            {
                                                Key: "InitiatingBackendClaimsExchange",
                                                Value: {
                                                    TechnicalProfileId: fixture.technicalProfiles.restApi,
                                                    ProtocolType: "backend protocol",
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        }),
                        buildOrchestrationManagerAction(),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(getTestSteps(result)[0].technicalProfileNames).toContain(fixture.technicalProfiles.restApi);
            expect(getTestSteps(result)[0].technicalProfileNames).toHaveLength(1);
        });
    });

    describe("Protocol Provider Type", () => {
        it("should track protocol provider type for technical profiles", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(6),
                        buildPredicateClip("IsClaimsExchangeProtocolAServiceCallHandler"),
                        buildPredicateResult(true, {
                            Values: [
                                {
                                    Key: "InitiatingClaimsExchange",
                                    Value: {
                                        ProtocolType: "backend protocol",
                                        TargetEntity: "ClaimsExchange",
                                        TechnicalProfileId: fixture.technicalProfiles.aadRead,
                                        ProtocolProviderType: "AzureActiveDirectoryProvider",
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

            expect(steps[0].technicalProfiles).toBeDefined();
            expect(steps[0].technicalProfiles?.[0].providerType).toBe("AzureActiveDirectoryProvider");
        });

        it("should identify ClaimsTransformationProtocolProvider", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(5),
                        buildPredicateClip("IsClaimsExchangeProtocolAServiceCallHandler"),
                        buildPredicateResult(true, {
                            Values: [
                                {
                                    Key: "InitiatingClaimsExchange",
                                    Value: {
                                        ProtocolType: "backend protocol",
                                        TargetEntity: "ClaimsExchange",
                                        TechnicalProfileId: fixture.technicalProfiles.claimsTransform,
                                        ProtocolProviderType: "ClaimsTransformationProtocolProvider",
                                    },
                                },
                            ],
                        }),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(getTestSteps(result)[0].technicalProfiles?.[0].providerType).toBe("ClaimsTransformationProtocolProvider");
        });
    });

    describe("Multiple Technical Profiles", () => {
        it("should track multiple technical profiles in a single step", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1, buildCtpStatebag(fixture.technicalProfiles.selfAssertedSignIn, 1)),
                        buildPredicateClip("IsClaimsExchangeProtocolAServiceCallHandler"),
                        buildPredicateResult(true, buildInitiatingClaimsExchangeRecord(fixture.technicalProfiles.aadRead, "AzureActiveDirectoryProvider")),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);
            const steps = getTestSteps(result);

            expect(steps[0].technicalProfileNames).toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(steps[0].technicalProfileNames).toContain(fixture.technicalProfiles.aadRead);
            expect(steps[0].technicalProfileNames).toHaveLength(2);
        });
    });
});
