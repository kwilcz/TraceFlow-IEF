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

            expect(result.traceSteps[0].technicalProfiles).toContain(fixture.technicalProfiles.selfAssertedSignIn);
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

            expect(result.traceSteps[0].technicalProfiles).toContain(fixture.technicalProfiles.aadRead);
            expect(result.traceSteps[0].technicalProfiles).not.toContain(`${fixture.technicalProfiles.aadRead}:6`);
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

            expect(result.traceSteps[0].technicalProfiles).toContain(tpWithHyphens);
        });
    });

    describe("InitiatingClaimsExchange Record", () => {
        it("should extract technical profile from service call handler", () => {
            const logs = [buildClaimsExchangeStep(fixture, 6, fixture.technicalProfiles.aadRead, "AzureActiveDirectoryProvider", 0)];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].technicalProfiles).toContain(fixture.technicalProfiles.aadRead);
        });

        it("should extract technical profile from REST API call", () => {
            const logs = [buildClaimsExchangeStep(fixture, 5, fixture.technicalProfiles.restApi, "RestfulProvider", 0)];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].technicalProfiles).toContain(fixture.technicalProfiles.restApi);
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

            expect(result.traceSteps[0].technicalProfiles).toContain(fixture.technicalProfiles.restApi);
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

            expect(result.traceSteps[0].technicalProfileDetails).toBeDefined();
            expect(result.traceSteps[0].technicalProfileDetails?.[0].providerType).toBe("AzureActiveDirectoryProvider");
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

            expect(result.traceSteps[0].technicalProfileDetails?.[0].providerType).toBe("ClaimsTransformationProtocolProvider");
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

            expect(result.traceSteps[0].technicalProfiles).toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(result.traceSteps[0].technicalProfiles).toContain(fixture.technicalProfiles.aadRead);
        });
    });
});
