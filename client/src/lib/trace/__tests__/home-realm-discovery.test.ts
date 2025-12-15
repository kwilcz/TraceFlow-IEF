/**
 * Home Realm Discovery (HRD) Tests
 *
 * Tests the parser's ability to extract selectable options from
 * HRD steps where users choose between identity providers.
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
    buildEnabledForUserJourneysRecord,
    buildHomeRealmDiscoveryRecord,
    buildHrdStep,
    buildCtpStatebag,
    buildHrdSelectionStatebag,
    buildInitiatingClaimsExchangeRecord,
    type TestFixture,
} from "./fixtures";

describe("Home Realm Discovery (HRD)", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("EnabledForUserJourneysTrue Pattern", () => {
        it("should extract available technical profiles", () => {
            const availableTps = [
                fixture.technicalProfiles.selfAssertedSignIn,
                fixture.technicalProfiles.federatedIdp,
            ];

            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(1, availableTps)),
                        buildOrchestrationManagerAction(),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].selectableOptions).toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(result.traceSteps[0].selectableOptions).toContain(fixture.technicalProfiles.federatedIdp);
        });

        it("should mark step as interactive when multiple options available", () => {
            const availableTps = [
                fixture.technicalProfiles.selfAssertedSignIn,
                fixture.technicalProfiles.federatedIdp,
                fixture.technicalProfiles.forgotPassword,
            ];

            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(1, availableTps)),
                        buildOrchestrationManagerAction(),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].isInteractiveStep).toBe(true);
        });

        it("should not mark step as interactive when single option available", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(1, [fixture.technicalProfiles.selfAssertedSignIn])),
                        buildOrchestrationManagerAction(),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].isInteractiveStep).toBe(false);
        });
    });

    describe("HomeRealmDiscovery Record Pattern", () => {
        it("should extract available technical profiles from HRD handler", () => {
            const availableTps = [
                fixture.technicalProfiles.selfAssertedSignIn,
                fixture.technicalProfiles.federatedIdp,
            ];

            const logs = [buildHrdStep(fixture, 4, availableTps, 0)];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].selectableOptions).toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(result.traceSteps[0].selectableOptions).toContain(fixture.technicalProfiles.federatedIdp);
        });

        it("should handle HRD with forgot password option", () => {
            const availableTps = [
                fixture.technicalProfiles.selfAssertedSignIn,
                fixture.technicalProfiles.federatedIdp,
                fixture.technicalProfiles.forgotPassword,
            ];

            const logs = [buildHrdStep(fixture, 4, availableTps, 0)];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].selectableOptions).toContain(fixture.technicalProfiles.forgotPassword);
            expect(result.traceSteps[0].selectableOptions).toHaveLength(3);
        });
    });

    describe("Deduplication", () => {
        it("should deduplicate technical profiles across multiple handler results", () => {
            const tpA = fixture.technicalProfiles.selfAssertedSignIn;
            const tpB = fixture.technicalProfiles.federatedIdp;

            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(1, [tpA, tpB])),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(1, [tpA, tpB])),
                        buildOrchestrationManagerAction(),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            const tpACount = result.traceSteps[0].selectableOptions?.filter((o) => o === tpA).length ?? 0;
            const tpBCount = result.traceSteps[0].selectableOptions?.filter((o) => o === tpB).length ?? 0;

            expect(tpACount).toBe(1);
            expect(tpBCount).toBe(1);
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty selectable options gracefully", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].selectableOptions).toEqual([]);
        });

        it("should handle missing RecorderRecord gracefully", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true),
                        buildOrchestrationManagerAction(),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].selectableOptions).toEqual([]);
        });

        it("should NOT leak HRD selectable options to subsequent steps", () => {
            const hrdOptions = [
                fixture.technicalProfiles.selfAssertedSignIn,
                fixture.technicalProfiles.federatedIdp,
            ];

            const logs = [
                // Step 1: HRD step with multiple options
                buildHrdStep(fixture, 1, hrdOptions, 0),
                // Step 2: A subsequent step after user selection
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildActionClip("ClaimsExchangeActionHandler"),
                        buildActionResult(true),
                        buildOrchestrationManagerAction(),
                    ],
                    1000
                ),
            ];

            const result = parseTrace(logs);

            // Find steps for step 1 (HRD) and step 2 (subsequent)
            const hrdStep = result.traceSteps.find(s => s.stepOrder === 1);
            const subsequentStep = result.traceSteps.find(s => s.stepOrder === 2);

            // HRD step should have the selectable options
            expect(hrdStep?.selectableOptions).toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(hrdStep?.selectableOptions).toContain(fixture.technicalProfiles.federatedIdp);

            // Subsequent step should NOT have HRD options leaked to it
            expect(subsequentStep?.selectableOptions).toEqual([]);
            // Subsequent step should NOT have HRD technical profiles
            expect(subsequentStep?.technicalProfiles).not.toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(subsequentStep?.technicalProfiles).not.toContain(fixture.technicalProfiles.federatedIdp);
        });

        it("should NOT leak HRD options from ShouldOrchestrationStepBeInvokedHandler to subsequent steps", () => {
            const hrdOptions = [
                fixture.technicalProfiles.selfAssertedSignIn,
                fixture.technicalProfiles.federatedIdp,
            ];

            const logs = [
                // Log 1: Step 4 with multiple HRD options (via ShouldOrchestrationStepBeInvokedHandler)
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(4, hrdOptions)),
                        buildOrchestrationManagerAction(),
                    ],
                    0
                ),
                // Log 2: Step 5 - a subsequent step (single TP, not HRD)
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(5),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(5, [fixture.technicalProfiles.aadRead])),
                        buildOrchestrationManagerAction(),
                    ],
                    1000
                ),
            ];

            const result = parseTrace(logs);

            // Find steps
            const hrdStep = result.traceSteps.find(s => s.stepOrder === 4);
            const subsequentStep = result.traceSteps.find(s => s.stepOrder === 5);

            // Step 4 should have HRD options as selectable
            expect(hrdStep?.selectableOptions).toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(hrdStep?.selectableOptions).toContain(fixture.technicalProfiles.federatedIdp);
            expect(hrdStep?.isInteractiveStep).toBe(true);

            // Step 5 should NOT have HRD options leaked
            expect(subsequentStep?.selectableOptions).not.toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(subsequentStep?.selectableOptions).not.toContain(fixture.technicalProfiles.federatedIdp);
            // Step 5 should have its own TP
            expect(subsequentStep?.technicalProfiles).toContain(fixture.technicalProfiles.aadRead);
            // Step 5 should NOT be interactive (single TP)
            expect(subsequentStep?.isInteractiveStep).toBe(false);
        });

        it("should NOT leak HRD options across multiple event batches (like error.json pattern)", () => {
            /**
             * This test mimics the exact pattern from error.json:
             * - AUTH batch: Step 1 (single TP), Step 4 (HRD with HomeRealmDiscoveryHandler)
             * - API batch: Step 10 (single TP via ShouldOrchestrationStepBeInvokedHandler)
             * 
             * Bug: Step 10 was incorrectly getting HRD options from step 4
             */
            const hrdOptions = [
                fixture.technicalProfiles.selfAssertedSignIn,
                fixture.technicalProfiles.forgotPassword,
            ];

            const logs = [
                // Event 1 (AUTH): Contains Step 1 AND Step 4 (HRD)
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        // Step 1 setup
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(1, ["UserJourneySelectionFlow"])),
                        // ... (skipping intermediate clips)
                        // Step 4 setup (HRD step)
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        // CombinedSignInAndSignUp transition happens, then HRD handler
                        buildPredicateClip("HomeRealmDiscoveryHandler"),
                        buildPredicateResult(false, buildHomeRealmDiscoveryRecord(4, hrdOptions)),
                        buildOrchestrationManagerAction(),
                    ],
                    0
                ),
                // Event 2 (API): Contains Step 10 with single TP
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(10),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(10, [fixture.technicalProfiles.aadRead])),
                        buildOrchestrationManagerAction(),
                    ],
                    5000  // 5 seconds later - different event batch
                ),
            ];

            const result = parseTrace(logs);

            // Find all steps
            const step1 = result.traceSteps.find(s => s.stepOrder === 1);
            const step4 = result.traceSteps.find(s => s.stepOrder === 4);
            const step10 = result.traceSteps.find(s => s.stepOrder === 10);

            // Step 1 should have its TP
            expect(step1?.technicalProfiles).toContain("UserJourneySelectionFlow");
            expect(step1?.selectableOptions).toEqual([]);

            // Step 4 (HRD) should have selectable options
            expect(step4?.selectableOptions).toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(step4?.selectableOptions).toContain(fixture.technicalProfiles.forgotPassword);
            expect(step4?.isInteractiveStep).toBe(true);

            // Step 10 should have its own single TP and NO HRD options
            expect(step10?.technicalProfiles).toContain(fixture.technicalProfiles.aadRead);
            expect(step10?.selectableOptions).toEqual([]);
            expect(step10?.isInteractiveStep).toBe(false);
            // Most importantly - no HRD leakage
            expect(step10?.technicalProfiles).not.toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(step10?.technicalProfiles).not.toContain(fixture.technicalProfiles.forgotPassword);
            expect(step10?.selectableOptions).not.toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(step10?.selectableOptions).not.toContain(fixture.technicalProfiles.forgotPassword);
        });

        it("should NOT leak CTP from previous steps to subsequent steps", () => {
            /**
             * This is the ACTUAL BUG the user reported!
             * 
             * When CTP (Current Technical Profile) is set in step 4 after user selection,
             * it persists in the statebag. The OrchestrationInterpreter was incorrectly
             * extracting this CTP for ALL subsequent steps, causing the HRD selection
             * (e.g., SelfAsserted-LocalAccountSigninOnly) to appear in every step.
             * 
             * Pattern from error.json:
             * 1. Step 4: HRD - user selects SelfAsserted-LocalAccountSigninOnly
             * 2. SELFASSERTED event: CTP is set to "SelfAsserted-LocalAccountSigninOnly:4"
             * 3. Step 10: AAD-UserReadUsingObjectId - should NOT have SelfAsserted-LocalAccountSigninOnly
             */
            const hrdSelection = fixture.technicalProfiles.selfAssertedSignIn;
            const subsequentTp = fixture.technicalProfiles.aadRead;

            const logs = [
                // Event 1 (AUTH): Step 4 (HRD)
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        buildPredicateClip("HomeRealmDiscoveryHandler"),
                        buildPredicateResult(false, buildHomeRealmDiscoveryRecord(4, [hrdSelection, fixture.technicalProfiles.forgotPassword])),
                        buildOrchestrationManagerAction(),
                    ],
                    0
                ),
                // Event 2 (SELFASSERTED): CTP is set after user selection
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:SELFASSERTED"),
                        buildOrchestrationManagerAction(),
                        // CTP is set to the selected HRD option
                        buildOrchestrationResult(4, buildCtpStatebag(hrdSelection, 4)),
                        buildOrchestrationManagerAction(),
                    ],
                    1000
                ),
                // Event 3 (API): Step 10 - subsequent step
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(10),
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(10, [subsequentTp])),
                        buildOrchestrationManagerAction(),
                    ],
                    5000
                ),
            ];

            const result = parseTrace(logs);

            const step4 = result.traceSteps.find(s => s.stepOrder === 4);
            const step10 = result.traceSteps.find(s => s.stepOrder === 10);

            // Step 4 should have the HRD selection (CTP was set in step 4)
            expect(step4?.technicalProfiles).toContain(hrdSelection);

            // Step 10 should ONLY have its own TP - NOT the HRD selection
            expect(step10?.technicalProfiles).toContain(subsequentTp);
            // BUG FIX: Step 10 should NOT contain the CTP from step 4
            expect(step10?.technicalProfiles).not.toContain(hrdSelection);
            expect(step10?.technicalProfiles).toHaveLength(1);
        });
    });

    describe("TAGE Extraction (User Selection)", () => {
        /**
         * When a user selects an option in HRD (e.g., Forgot Password),
         * the ValidateApiResponseHandler fires with TAGE set to the ClaimsExchange ID.
         * This should be captured as the selectedOption for that step.
         */
        it("should extract TAGE as selectedOption after user selection", () => {
            const hrdOptions = [
                fixture.technicalProfiles.selfAssertedSignIn,
                fixture.technicalProfiles.forgotPassword,
            ];
            const selectedClaimsExchange = "ForgotPasswordExchange";

            const logs = [
                // Event 1 (AUTH): HRD step with multiple options
                buildHrdStep(fixture, 1, hrdOptions, 0),
                // Event 2 (API): ValidateApiResponseHandler fires with TAGE after user selection
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildPredicateClip("ValidateApiResponseHandler"),
                        buildPredicateResult(true, undefined, buildHrdSelectionStatebag(selectedClaimsExchange)),
                    ],
                    1000
                ),
            ];

            const result = parseTrace(logs);

            // The HRD step should have the selected ClaimsExchange ID
            const hrdStep = result.traceSteps.find(s => s.stepOrder === 1);
            expect(hrdStep?.selectedOption).toBe(selectedClaimsExchange);
        });

        it("should extract TAGE even when no other technical profiles are present", () => {
            const selectedClaimsExchange = "SignUpWithLogonEmailExchange";

            const logs = [
                // Initial step setup
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    0
                ),
                // ValidateApiResponseHandler with TAGE
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildPredicateClip("ValidateApiResponseHandler"),
                        buildPredicateResult(true, undefined, buildHrdSelectionStatebag(selectedClaimsExchange)),
                    ],
                    1000
                ),
            ];

            const result = parseTrace(logs);

            const step = result.traceSteps.find(s => s.stepOrder === 1);
            expect(step?.selectedOption).toBe(selectedClaimsExchange);
        });

        it("should show TAGE in invoked components when no CTP is available", () => {
            /**
             * This is the key use case: when there's no CTP (Current Technical Profile)
             * but TAGE is set, the TAGE should appear as an invoked component so the
             * UI doesn't show "no invocations".
             */
            const selectedClaimsExchange = "LocalAccountSigninEmailExchange";

            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                    ],
                    0
                ),
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildPredicateClip("ValidateApiResponseHandler"),
                        buildPredicateResult(true, undefined, buildHrdSelectionStatebag(selectedClaimsExchange)),
                    ],
                    1000
                ),
            ];

            const result = parseTrace(logs);

            const step = result.traceSteps.find(s => s.stepOrder === 1);
            
            // Either selectedOption OR technicalProfiles should contain the TAGE
            // so that "invoked components" has something to display
            const hasInvokedComponent = 
                step?.selectedOption === selectedClaimsExchange ||
                step?.technicalProfiles?.includes(selectedClaimsExchange);
            
            expect(hasInvokedComponent).toBe(true);
        });
    });

    describe("HRD Social Login Flow (Step Separation)", () => {
        /**
         * This test verifies the correct behavior for HRD social login flows:
         * - Step 1 (CombinedSignInAndSignUp): Shows HRD options (selectable identity providers)
         * - Step 2 (ClaimsExchange): The triggered TP executes AFTER user selection
         * 
         * The triggered TP (e.g., a federated OIDC provider) should appear in step 2,
         * NOT in step 1, even though the user selected it from step 1's HRD options.
         */
        it("should assign triggered TP to step 2, NOT to step 1 where HRD options were shown", () => {
            const hrdOptions = [
                fixture.technicalProfiles.federatedIdp,  // e.g., a federated OIDC provider
                fixture.technicalProfiles.selfAssertedSignIn,
                fixture.technicalProfiles.forgotPassword,
            ];
            const triggeredTp = fixture.technicalProfiles.federatedIdp;

            const logs = [
                // Event:AUTH - Step 1 with HRD options
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        // HRD handler shows available options for step 1
                        buildPredicateClip("HomeRealmDiscoveryHandler"),
                        buildPredicateResult(false, buildHomeRealmDiscoveryRecord(1, hrdOptions)),
                        // Page is rendered, waiting for user input
                    ],
                    0
                ),
                // Event:ClaimsExchange - Step 2 after user selects federated IDP
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:ClaimsExchange"),
                        // OrchestrationManager advances to step 2
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        // ShouldOrchestrationStepBeInvokedHandler shows available TPs for step 2
                        buildPredicateClip("ShouldOrchestrationStepBeInvokedHandler"),
                        buildPredicateResult(true, buildEnabledForUserJourneysRecord(2, hrdOptions)),
                        // IsClaimsExchangeProtocolARedirectionHandler triggers the selected TP
                        buildPredicateClip("IsClaimsExchangeProtocolARedirectionHandler"),
                        buildPredicateResult(true, buildInitiatingClaimsExchangeRecord(triggeredTp, "OpenIdConnectProtocolProvider", `ExchangeId-${fixture.randomSuffix}`)),
                        buildOrchestrationManagerAction(),
                    ],
                    1000
                ),
            ];

            const result = parseTrace(logs);

            // Find both steps
            const step1 = result.traceSteps.find(s => s.stepOrder === 1);
            const step2 = result.traceSteps.find(s => s.stepOrder === 2);

            // Step 1 should have HRD selectable options but NO triggered TP
            expect(step1).toBeDefined();
            expect(step1?.selectableOptions).toContain(fixture.technicalProfiles.federatedIdp);
            expect(step1?.selectableOptions).toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(step1?.selectableOptions).toContain(fixture.technicalProfiles.forgotPassword);
            // Step 1 should NOT have the triggered TP in technicalProfiles
            expect(step1?.technicalProfiles).not.toContain(triggeredTp);
            expect(step1?.technicalProfiles).toEqual([]);

            // Step 2 should have the triggered TP
            expect(step2).toBeDefined();
            expect(step2?.technicalProfiles).toContain(triggeredTp);
            // Step 2 should NOT have HRD selectable options (they were in step 1)
            expect(step2?.selectableOptions).toEqual([]);
        });

        it("should correctly separate HRD step from ClaimsExchange step in multi-step flow", () => {
            /**
             * More complex flow:
             * - Step 1: CombinedSignInAndSignUp with HRD
             * - Step 2: ClaimsExchange with triggered federated TP
             * - Step 4: Some other step (AAD-Read)
             */
            const hrdOptions = [
                fixture.technicalProfiles.federatedIdp,
                fixture.technicalProfiles.selfAssertedSignIn,
            ];
            const federatedTp = fixture.technicalProfiles.federatedIdp;
            const aadReadTp = fixture.technicalProfiles.aadRead;

            const logs = [
                // Step 1: HRD
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildPredicateClip("HomeRealmDiscoveryHandler"),
                        buildPredicateResult(false, buildHomeRealmDiscoveryRecord(1, hrdOptions)),
                    ],
                    0
                ),
                // Step 2: ClaimsExchange with federated TP
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:ClaimsExchange"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildPredicateClip("IsClaimsExchangeProtocolARedirectionHandler"),
                        buildPredicateResult(true, buildInitiatingClaimsExchangeRecord(federatedTp, "OpenIdConnectProtocolProvider")),
                        buildOrchestrationManagerAction(),
                    ],
                    1000
                ),
                // Step 4: AAD-Read
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(4),
                        buildPredicateClip("IsClaimsExchangeProtocolAServiceCallHandler"),
                        buildPredicateResult(true, buildInitiatingClaimsExchangeRecord(aadReadTp, "AzureActiveDirectoryProvider")),
                        buildOrchestrationManagerAction(),
                    ],
                    2000
                ),
            ];

            const result = parseTrace(logs);

            const step1 = result.traceSteps.find(s => s.stepOrder === 1);
            const step2 = result.traceSteps.find(s => s.stepOrder === 2);
            const step4 = result.traceSteps.find(s => s.stepOrder === 4);

            // Step 1: HRD options only
            expect(step1?.selectableOptions).toContain(fixture.technicalProfiles.federatedIdp);
            expect(step1?.selectableOptions).toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(step1?.technicalProfiles).toEqual([]);

            // Step 2: Only federated TP
            expect(step2?.technicalProfiles).toContain(federatedTp);
            expect(step2?.technicalProfiles).not.toContain(aadReadTp);
            expect(step2?.selectableOptions).toEqual([]);

            // Step 4: Only AAD-Read TP
            expect(step4?.technicalProfiles).toContain(aadReadTp);
            expect(step4?.technicalProfiles).not.toContain(federatedTp);
            expect(step4?.selectableOptions).toEqual([]);
        });

        it("should handle HRD flow when triggered TP is in same log batch as HRD", () => {
            /**
             * Sometimes the HRD and the triggered TP appear in the SAME log batch
             * but with different ORCH_CS values. This tests that scenario.
             */
            const hrdOptions = [
                fixture.technicalProfiles.federatedIdp,
                fixture.technicalProfiles.selfAssertedSignIn,
            ];
            const triggeredTp = fixture.technicalProfiles.federatedIdp;

            const logs = [
                // Single batch containing both step 1 (HRD) and step 2 (triggered TP)
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:AUTH"),
                        // Step 1
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(1),
                        buildPredicateClip("HomeRealmDiscoveryHandler"),
                        buildPredicateResult(false, buildHomeRealmDiscoveryRecord(1, hrdOptions)),
                        // Step 2 (in same batch)
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(2),
                        buildPredicateClip("IsClaimsExchangeProtocolARedirectionHandler"),
                        buildPredicateResult(true, buildInitiatingClaimsExchangeRecord(triggeredTp, "OpenIdConnectProtocolProvider")),
                        buildOrchestrationManagerAction(),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            const step1 = result.traceSteps.find(s => s.stepOrder === 1);
            const step2 = result.traceSteps.find(s => s.stepOrder === 2);

            // Step 1 should have HRD options but NO triggered TP
            expect(step1?.selectableOptions).toContain(fixture.technicalProfiles.federatedIdp);
            expect(step1?.selectableOptions).toContain(fixture.technicalProfiles.selfAssertedSignIn);
            expect(step1?.technicalProfiles).toEqual([]);

            // Step 2 should have the triggered TP only
            expect(step2?.technicalProfiles).toContain(triggeredTp);
            expect(step2?.selectableOptions).toEqual([]);
        });
    });
});