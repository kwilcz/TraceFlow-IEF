/**
 * UI Settings Tests
 *
 * Tests the parser's ability to extract UI configuration
 * from ApiUiManagerInfo and display settings.
 *
 * Based on real B2C log patterns:
 * - Web.TPEngine.Api.ApiUIManager action handler
 * - RecorderRecord with ApiUiManagerInfo key
 * - Nested Values array with Language and Settings JSON strings
 * - EID statebag for content definition
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
    buildPredicateClip,
    buildPredicateResult,
    buildEnabledForUserJourneysRecord,
    buildEidStatebag,
    type TestFixture,
} from "./fixtures";
import { getTestSteps } from "./test-step-helpers";

/**
 * Builds an ApiUiManagerInfo record matching real B2C log format.
 */
function buildApiUiManagerInfoRecord(options: {
    pageType?: string;
    language?: string;
    remoteResource?: string;
    pageViewId?: string;
    config?: Record<string, string>;
}) {
    const settings: Record<string, unknown> = {};

    if (options.pageType) {
        settings.api = options.pageType;
    }
    if (options.remoteResource) {
        settings.remoteResource = options.remoteResource;
    }
    if (options.pageViewId) {
        settings.pageViewId = options.pageViewId;
    }
    if (options.language) {
        settings.locale = { lang: options.language };
    }
    if (options.config) {
        settings.config = options.config;
    }

    return {
        Values: [
            {
                Key: "ApiUiManagerInfo",
                Value: {
                    Values: [
                        {
                            Key: "Language",
                            Value: JSON.stringify({ heading: "Test" }),
                        },
                        {
                            Key: "Settings",
                            Value: JSON.stringify(settings),
                        },
                    ],
                },
            },
        ],
    };
}

describe("UI Settings", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("ApiUiManagerInfo Extraction", () => {
        it("should extract page ID from ApiUiManagerInfo", () => {
            const pageId = `page_${fixture.randomSuffix}`;
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildActionClip("ApiUIManager", "Web.TPEngine.Api"),
                        buildActionResult(true, buildApiUiManagerInfoRecord({
                            pageViewId: pageId,
                            pageType: "SelfAsserted",
                        })),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(getTestSteps(result)[0].uiSettings?.pageId).toBe(pageId);
        });

        it("should extract content definition from UI info", () => {
            const contentDefinition = `urn:com:microsoft:aad:b2c:elements:contract:selfasserted:2.1.${fixture.randomSuffix}`;
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2, buildEidStatebag(contentDefinition)),
                        buildActionClip("ApiUIManager", "Web.TPEngine.Api"),
                        buildActionResult(true, buildApiUiManagerInfoRecord({
                            pageType: "SelfAsserted",
                        })),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(getTestSteps(result)[0].uiSettings?.contentDefinition).toBe(contentDefinition);
        });
    });

    describe("Self-Asserted Page Settings", () => {
        it("should detect self-asserted page type", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(2, [fixture.technicalProfiles.selfAsserted])),
                        buildActionClip("ApiUIManager", "Web.TPEngine.Api"),
                        buildActionResult(true, buildApiUiManagerInfoRecord({
                            pageType: "SelfAsserted",
                        })),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(getTestSteps(result)[0].uiSettings?.pageType).toBe("SelfAsserted");
        });

        it.skip("should extract input claims for self-asserted page", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildActionClip("ApiUIManager", "Web.TPEngine.Api"),
                        buildActionResult(true, buildApiUiManagerInfoRecord({
                            pageType: "SelfAsserted",
                        })),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].uiSettings?.inputClaims).toContain("email");
            expect(result.traceSteps[0].uiSettings?.inputClaims).toContain("displayName");
        });
    });

    describe("Claims Provider Selection UI", () => {
        it("should detect CombinedSigninAndSignup page type", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildActionClip("ApiUIManager", "Web.TPEngine.Api"),
                        buildActionResult(true, buildApiUiManagerInfoRecord({
                            pageType: "CombinedSigninAndSignup",
                        })),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(getTestSteps(result)[0].uiSettings?.pageType).toBe("CombinedSigninAndSignup");
        });

        it.skip("should extract available identity providers", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildActionClip("ApiUIManager", "Web.TPEngine.Api"),
                        buildActionResult(true, buildApiUiManagerInfoRecord({
                            pageType: "ClaimsProviderSelection",
                        })),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].uiSettings?.availableProviders).toContain("Google");
            expect(result.traceSteps[0].uiSettings?.availableProviders).toContain("LocalAccount");
        });
    });

    describe("Error Display Settings", () => {
        it.skip("should capture error page display settings", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildActionClip("ApiUIManager", "Web.TPEngine.Api"),
                        buildActionResult(true, buildApiUiManagerInfoRecord({
                            pageType: "Error",
                        })),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].uiSettings?.errorCode).toBe("UserNotFound");
        });
    });

    describe("Localization Settings", () => {
        it("should extract language/locale from UI settings", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildActionClip("ApiUIManager", "Web.TPEngine.Api"),
                        buildActionResult(true, buildApiUiManagerInfoRecord({
                            pageType: "SelfAsserted",
                            language: "en-US",
                        })),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(getTestSteps(result)[0].uiSettings?.language).toBe("en-US");
        });
    });

    describe("Display Control UI", () => {
        it.skip("should extract display control configuration", () => {
            const controlId = `dc_email_${fixture.randomSuffix}`;
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildActionClip("ApiUIManager", "Web.TPEngine.Api"),
                        buildActionResult(true, buildApiUiManagerInfoRecord({
                            pageType: "SelfAsserted",
                        })),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].uiSettings?.displayControls).toBeDefined();
            expect(result.traceSteps[0].uiSettings?.displayControls?.[0]?.id).toBe(controlId);
        });
    });
});
