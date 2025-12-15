/**
 * Backend API Calls Tests
 *
 * Tests the parser's ability to extract backend API call information
 * from PROT statebag and protocol provider patterns.
 *
 * Based on real B2C log patterns:
 * - IsClaimsExchangeProtocolAServiceCallHandler predicate
 * - InitiatingClaimsExchange recorder record with protocol info
 * - ProtocolProviderType: AzureActiveDirectoryProvider, RestfulProvider, etc.
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
    buildInitiatingClaimsExchangeRecord,
    buildEnabledForUserJourneysRecord,
    buildRestApiProtStatebag,
    buildActionClip,
    buildActionResult,
    type TestFixture,
} from "./fixtures";

describe("Backend API Calls", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("PROT Statebag Extraction", () => {
        it("should extract protocol provider type from IsClaimsExchangeProtocolAServiceCallHandler", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(3),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(3, [fixture.technicalProfiles.apiConnector])),
                        buildPredicateClip("IsClaimsExchangeProtocolAServiceCallHandler"),
                        buildPredicateResult(true, buildInitiatingClaimsExchangeRecord(fixture.technicalProfiles.apiConnector, "RestfulProvider")),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].technicalProfileDetails).toContainEqual(
                expect.objectContaining({
                    id: fixture.technicalProfiles.apiConnector,
                    providerType: "RestfulProvider",
                })
            );
        });

        it("should extract API endpoint from PROT metadata", () => {
            const apiEndpoint = `https://api.${fixture.tenantId}.example.com/v1/validate`;
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(3),
                        buildPredicateClip("IsClaimsExchangeProtocolAServiceCallHandler"),
                        buildPredicateResult(true, buildInitiatingClaimsExchangeRecord(fixture.technicalProfiles.apiConnector, "RestfulProvider")),
                        // Include action result with PROT statebag containing the endpoint
                        buildActionClip("OutputClaimsTransformationHandler"),
                        buildActionResult(true, undefined, buildRestApiProtStatebag(apiEndpoint, 200, { success: true }) as Record<string, unknown>),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].backendApiCalls?.[0]?.requestUri).toBe(apiEndpoint);
        });
    });

    describe("RestfulProvider Calls", () => {
        it("should detect RestfulProvider API calls via IsClaimsExchangeProtocolAServiceCallHandler", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(3),
                        buildPredicateClip("IsClaimsExchangeProtocolAServiceCallHandler"),
                        buildPredicateResult(true, buildInitiatingClaimsExchangeRecord(fixture.technicalProfiles.apiConnector, "RestfulProvider")),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].technicalProfileDetails).toBeDefined();
            expect(result.traceSteps[0].technicalProfileDetails?.length).toBeGreaterThan(0);
        });

        it.skip("should capture API response claims", () => {
            // This test requires Complex-CLMS statebag parsing which is already implemented
        });
    });

    describe("OAuth/OIDC Protocol Calls", () => {
        it.skip("should detect OAuth2 protocol type", () => {
            // OAuth2/OIDC redirections use different handler patterns
        });

        it("should detect OpenIdConnect protocol type", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildPredicateClip("IsClaimsExchangeProtocolAServiceCallHandler"),
                        buildPredicateResult(true, buildInitiatingClaimsExchangeRecord(fixture.technicalProfiles.jwtIssuer, "OpenIdConnectProtocolProvider")),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].technicalProfileDetails).toContainEqual(
                expect.objectContaining({
                    providerType: "OpenIdConnectProtocolProvider",
                })
            );
        });
    });

    describe("AAD Protocol Calls", () => {
        it("should detect AzureActiveDirectoryProvider protocol", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildPredicateClip("IsClaimsExchangeProtocolAServiceCallHandler"),
                        buildPredicateResult(true, buildInitiatingClaimsExchangeRecord(fixture.technicalProfiles.aadCommon, "AzureActiveDirectoryProvider")),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].technicalProfileDetails).toContainEqual(
                expect.objectContaining({
                    providerType: "AzureActiveDirectoryProvider",
                })
            );
        });
    });

    describe("API Call Failures", () => {
        it.skip("should detect failed API calls", () => {
            // Failed calls require Exception handling in the HandlerResult
        });

        it.skip("should capture API error details", () => {
            // Error details require Exception field in HandlerResult
        });
    });

    describe("SAML Protocol", () => {
        it.skip("should detect SAML protocol type", () => {
            // SAML uses different handler patterns (redirection)
        });
    });
});
