/**
 * Test Fixtures for Trace Parser Tests
 *
 * Generates randomized but consistent test data for B2C trace parser validation.
 * All data is synthetic and does not reference any real systems or users.
 */

import type {
    ClipsArray,
    HeadersClip,
    ActionClip,
    PredicateClip,
    HandlerResultClip,
    TransitionClip,
    RecorderRecord,
    Statebag,
} from "@/types/journey-recorder";
import type { TraceLogInput } from "@/types/trace";

// =============================================================================
// RANDOM DATA GENERATORS
// =============================================================================

let seedCounter = 0;

function generateId(prefix = "id"): string {
    seedCounter++;
    return `${prefix}-${seedCounter.toString(16).padStart(8, "0")}-${Math.random().toString(36).slice(2, 10)}`;
}

function generateGuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function generateEmail(prefix = "user"): string {
    const domain = `test-${Math.random().toString(36).slice(2, 6)}.example.com`;
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}@${domain}`;
}

function generateTenantName(): string {
    return `testtenant${Math.random().toString(36).slice(2, 6)}`;
}

function generatePolicyId(suffix = "SignUpOrSignIn"): string {
    return `B2C_1A_TEST_${suffix}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function generateTechnicalProfileId(prefix = "TP"): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateTimestamp(baseTime?: Date, offsetMs = 0): Date {
    const base = baseTime ?? new Date("2024-01-15T10:00:00.000Z");
    return new Date(base.getTime() + offsetMs);
}

// =============================================================================
// FIXTURE FACTORY
// =============================================================================

export interface TestFixture {
    correlationId: string;
    tenantId: string;
    tenantName: string;
    policyId: string;
    userEmail: string;
    userObjectId: string;
    userPrincipalName: string;
    baseTimestamp: Date;
    randomSuffix: string;
    technicalProfiles: {
        selfAssertedSignIn: string;
        aadRead: string;
        aadWrite: string;
        localAccountDiscovery: string;
        localAccountPasswordReset: string;
        jwtIssuer: string;
        federatedIdp: string;
        restApi: string;
        claimsTransform: string;
        forgotPassword: string;
        apiConnector: string;
        externalIdP: string;
        aadCommon: string;
        emailVerification: string;
        displayControl: string;
        ssoSession: string;
    };
    claimsTransformations: {
        createDisplayName: string;
        copyEmail: string;
        getDateTime: string;
    };
    subJourneys: {
        passwordReset: string;
        mfa: string;
    };
}

export function createTestFixture(seed?: number): TestFixture {
    if (seed !== undefined) {
        seedCounter = seed;
    }

    const tenantName = generateTenantName();
    const randomSuffix = Math.random().toString(36).slice(2, 8);

    return {
        correlationId: generateGuid(),
        tenantId: generateGuid(),
        tenantName,
        policyId: generatePolicyId(),
        userEmail: generateEmail(),
        userObjectId: generateGuid(),
        userPrincipalName: `${generateGuid()}@${tenantName}.onmicrosoft.com`,
        baseTimestamp: new Date("2024-01-15T10:00:00.000Z"),
        randomSuffix,
        technicalProfiles: {
            selfAssertedSignIn: generateTechnicalProfileId("SelfAsserted-SignIn"),
            aadRead: generateTechnicalProfileId("AAD-Read"),
            aadWrite: generateTechnicalProfileId("AAD-Write"),
            localAccountDiscovery: generateTechnicalProfileId("LocalAccount-Discovery"),
            localAccountPasswordReset: generateTechnicalProfileId("LocalAccount-PasswordReset"),
            jwtIssuer: generateTechnicalProfileId("JwtIssuer"),
            federatedIdp: generateTechnicalProfileId("Federated-OIDC"),
            restApi: generateTechnicalProfileId("REST-Api"),
            claimsTransform: generateTechnicalProfileId("CT-Transform"),
            forgotPassword: generateTechnicalProfileId("TriggerForgotPassword"),
            apiConnector: generateTechnicalProfileId("API-Connector"),
            externalIdP: generateTechnicalProfileId("External-OIDC"),
            aadCommon: generateTechnicalProfileId("AAD-Common"),
            emailVerification: generateTechnicalProfileId("Email-Verification"),
            displayControl: generateTechnicalProfileId("DisplayControl-TP"),
            ssoSession: generateTechnicalProfileId("SSO-Session"),
        },
        claimsTransformations: {
            createDisplayName: generateTechnicalProfileId("CT-CreateDisplayName"),
            copyEmail: generateTechnicalProfileId("CT-CopyEmail"),
            getDateTime: generateTechnicalProfileId("CT-GetDateTime"),
        },
        subJourneys: {
            passwordReset: generateTechnicalProfileId("SubJourney-PasswordReset"),
            mfa: generateTechnicalProfileId("SubJourney-MFA"),
        },
    };
}

// =============================================================================
// CLIP BUILDERS
// =============================================================================

export function buildHeadersClip(
    fixture: TestFixture,
    eventInstance: "Event:AUTH" | "Event:API" | "Event:SELFASSERTED" | "Event:ClaimsExchange" = "Event:AUTH"
): HeadersClip {
    return {
        Kind: "Headers",
        Content: {
            UserJourneyRecorderEndpoint: "urn:journeyrecorder:applicationinsights",
            CorrelationId: fixture.correlationId,
            EventInstance: eventInstance,
            TenantId: `${fixture.tenantName}.onmicrosoft.com`,
            PolicyId: fixture.policyId,
        },
    };
}

export function buildActionClip(handlerName: string, namespace = "Web.TPEngine.StateMachineHandlers"): ActionClip {
    return {
        Kind: "Action",
        Content: `${namespace}.${handlerName}`,
    };
}

export function buildPredicateClip(handlerName: string, namespace = "Web.TPEngine.StateMachineHandlers"): PredicateClip {
    return {
        Kind: "Predicate",
        Content: `${namespace}.${handlerName}`,
    };
}

export function buildTransitionClip(eventName: string, stateName = "AwaitingNextStep"): TransitionClip {
    return {
        Kind: "Transition",
        Content: { EventName: eventName, StateName: stateName },
    };
}

export function buildOrchestrationManagerAction(): ActionClip {
    return { Kind: "Action", Content: "Web.TPEngine.OrchestrationManager" };
}

export function pushOrchestrationStep(step: number): ClipsArray {
    return [
        buildOrchestrationManagerAction(),
        buildOrchestrationResult(step),
    ];
}

export function buildOrchestrationResult(
    orchStep: number,
    additionalStatebag?: Partial<Statebag>
): HandlerResultClip {
    const statebag: Statebag = {
        ORCH_CS: {
            c: new Date().toISOString(),
            k: "ORCH_CS",
            v: String(orchStep),
            p: true,
        },
    };

    if (additionalStatebag) {
        Object.assign(statebag, additionalStatebag);
    }

    return {
        Kind: "HandlerResult",
        Content: {
            Result: true,
            Statebag: statebag,
        },
    };
}

export function buildPredicateResult(
    predicateResult: boolean,
    recorderRecord?: RecorderRecord,
    statebag?: Statebag
): HandlerResultClip {
    return {
        Kind: "HandlerResult",
        Content: {
            Result: true,
            PredicateResult: predicateResult ? "True" : "False",
            RecorderRecord: recorderRecord,
            Statebag: statebag,
        },
    };
}

export function buildActionResult(
    result: boolean,
    recorderRecord?: RecorderRecord,
    statebag?: Statebag
): HandlerResultClip {
    return {
        Kind: "HandlerResult",
        Content: {
            Result: result,
            RecorderRecord: recorderRecord,
            Statebag: statebag,
        },
    };
}

export function buildErrorResult(errorMessage: string, statebag?: Statebag): HandlerResultClip {
    return {
        Kind: "HandlerResult",
        Content: {
            Result: false,
            Exception: { Message: errorMessage },
            Statebag: statebag,
        },
    };
}

// =============================================================================
// RECORDER RECORD BUILDERS
// =============================================================================

export function buildEnabledForUserJourneysRecord(
    currentStep: number,
    technicalProfiles: string[]
): RecorderRecord {
    return {
        Values: [
            {
                Key: "EnabledForUserJourneysTrue",
                Value: {
                    Values: [
                        { Key: "CurrentStep", Value: currentStep },
                        ...technicalProfiles.map((tp) => ({
                            Key: "TechnicalProfileEnabled",
                            Value: { TechnicalProfile: tp, EnabledResult: true },
                        })),
                    ],
                },
            },
        ],
    };
}

export function buildHomeRealmDiscoveryRecord(
    currentStep: number,
    technicalProfiles: string[]
): RecorderRecord {
    return {
        Values: [
            {
                Key: "HomeRealmDiscovery",
                Value: {
                    Values: [
                        { Key: "CurrentStep", Value: currentStep },
                        ...technicalProfiles.map((tp) => ({
                            Key: "TechnicalProfileEnabled",
                            Value: { TechnicalProfile: tp, EnabledResult: true },
                        })),
                    ],
                },
            },
        ],
    };
}

export function buildInitiatingClaimsExchangeRecord(
    technicalProfileId: string,
    protocolProviderType = "None",
    targetEntity = "Cpim"
): RecorderRecord {
    return {
        Values: [
            {
                Key: "InitiatingClaimsExchange",
                Value: {
                    ProtocolType: protocolProviderType === "None" ? "None" : "backend protocol",
                    TargetEntity: targetEntity,
                    TechnicalProfileId: technicalProfileId,
                    ProtocolProviderType: protocolProviderType,
                },
            },
        ],
    };
}

export function buildValidationTechnicalProfileRecord(
    validationTpId: string,
    claimMappings?: Array<{ partner: string; policy: string }>
): RecorderRecord {
    const validationValues: Array<{ Key: string; Value: unknown }> = [
        { Key: "TechnicalProfileId", Value: validationTpId },
    ];

    if (claimMappings) {
        claimMappings.forEach((mapping) => {
            validationValues.push({
                Key: "MappingFromPartnerClaimType",
                Value: {
                    PartnerClaimType: mapping.partner,
                    PolicyClaimType: mapping.policy,
                },
            });
        });
    }

    return {
        Values: [
            {
                Key: "Validation",
                Value: {
                    Values: [
                        {
                            Key: "ValidationTechnicalProfile",
                            Value: { Values: validationValues },
                        },
                    ],
                },
            },
        ],
    };
}

export function buildClaimsTransformationRecord(
    transformationId: string,
    inputClaims: Array<{ type: string; value: string }>,
    outputClaims: Array<{ type: string; value: string }>
): RecorderRecord {
    return {
        Values: [
            {
                Key: "OutputClaimsTransformation",
                Value: {
                    Values: [
                        {
                            Key: "ClaimsTransformation",
                            Value: {
                                Values: [
                                    { Key: "Id", Value: transformationId },
                                    ...inputClaims.map((c) => ({
                                        Key: "InputClaim",
                                        Value: { PolicyClaimType: c.type, Value: c.value },
                                    })),
                                    ...outputClaims.map((c) => ({
                                        Key: "Result",
                                        Value: { PolicyClaimType: c.type, Value: c.value },
                                    })),
                                ],
                            },
                        },
                    ],
                },
            },
        ],
    };
}

export function buildSubJourneyInvokedRecord(subJourneyId: string): RecorderRecord {
    return {
        Values: [{ Key: "SubJourneyInvoked", Value: subJourneyId }],
    };
}

export function buildJourneyCompletedRecord(timestamp: Date): RecorderRecord {
    return {
        Values: [{ Key: "JourneyCompleted", Value: timestamp.toISOString() }],
    };
}

// =============================================================================
// COMPLEX STATEBAG BUILDERS
// =============================================================================

export function buildComplexClaimsStatebag(claims: Record<string, string>): Partial<Statebag> {
    return {
        "Complex-CLMS": claims,
        ComplexItems: {
            c: new Date().toISOString(),
            k: "ComplexItems",
            v: "CLMS",
            p: true,
        },
    };
}

/**
 * Build a simple claims statebag entry with a single claim.
 */
export function buildClaimsStatebag(claimType: string, value: string): Partial<Statebag> {
    return buildComplexClaimsStatebag({ [claimType]: value });
}

export function buildCtpStatebag(technicalProfileId: string, step: number): Partial<Statebag> {
    return {
        CTP: {
            c: new Date().toISOString(),
            k: "CTP",
            v: `${technicalProfileId}:${step}`,
            p: true,
        },
    };
}

export function buildApiResultStatebag(
    isCancelled: boolean,
    isErrored: boolean,
    isContinue: boolean,
    claimsExchange: string
): Partial<Statebag> {
    return {
        "Complex-API_RESULT": {
            IsCancelled: isCancelled ? "True" : "False",
            IsErrored: isErrored ? "True" : "False",
            IsContinue: isContinue ? "True" : "False",
            claimsexchange: claimsExchange,
        },
    };
}

/**
 * Build TAGE (Target Entity) statebag entry.
 * TAGE contains the ClaimsExchange ID selected by the user in HRD flow.
 */
export function buildTageStatebag(claimsExchangeId: string): Partial<Statebag> {
    return {
        TAGE: {
            c: new Date().toISOString(),
            k: "TAGE",
            v: claimsExchangeId,
            p: true,
        },
    };
}

/**
 * Build combined TAGE and API_RESULT statebag (typical after HRD selection).
 */
export function buildHrdSelectionStatebag(claimsExchangeId: string): Partial<Statebag> {
    return {
        ...buildTageStatebag(claimsExchangeId),
        "Complex-API_RESULT": {
            IsCancelled: "False",
            IsErrored: "False",
            IsContinue: "True",
            claimsexchange: claimsExchangeId,
        },
    };
}

export function buildVerificationContextStatebag(): Partial<Statebag> {
    return {
        ComplexItems: {
            c: new Date().toISOString(),
            k: "ComplexItems",
            v: "CLMS, C2CVER, S_CTP, ORCH_IDX",
            p: true,
        },
    };
}

/**
 * Build PROT statebag entry for backend API calls.
 * PROT contains the protocol call details and response from AAD Graph API, REST APIs, etc.
 */
export function buildProtStatebag(
    requestUrl: string,
    response: string,
    method = "GET"
): Partial<Statebag> {
    return {
        PROT: {
            c: new Date().toISOString(),
            k: "PROT",
            v: `AAD Request to ${requestUrl} using method ${method} as request body is malformed.\r\nResponse: \n${response}\r\n`,
            p: false,
        },
    };
}

/**
 * Build PROT statebag entry for REST API calls.
 */
export function buildRestApiProtStatebag(
    endpoint: string,
    responseStatus: number,
    responseBody: Record<string, unknown>,
    method = "POST"
): Partial<Statebag> {
    return {
        PROT: {
            c: new Date().toISOString(),
            k: "PROT",
            v: `REST API Request to ${endpoint} using method ${method}.\r\nStatus: ${responseStatus}\r\nResponse: ${JSON.stringify(responseBody)}\r\n`,
            p: false,
        },
    };
}

/**
 * Build SSO session participant statebag.
 */
export function buildSsoParticipantStatebag(isParticipant: boolean): Partial<Statebag> {
    return {
        SSO_PART: {
            c: new Date().toISOString(),
            k: "SSO_PART",
            v: isParticipant ? "True" : "False",
            p: true,
        },
    };
}

/**
 * Build EID (Content Definition) statebag entry.
 * EID contains the content definition URN for UI pages.
 */
export function buildEidStatebag(contentDefinition: string): Partial<Statebag> {
    return {
        EID: {
            c: new Date().toISOString(),
            k: "EID",
            v: contentDefinition,
            p: true,
        },
    };
}

// =============================================================================
// RECORDER RECORD BUILDERS - ADDITIONAL
// =============================================================================

/**
 * Build verification recorder record for OTP/email verification flows.
 */
export function buildVerificationRecorderRecord(
    technicalProfileId: string,
    controlId?: string
): RecorderRecord {
    const values: Array<{ Key: string; Value: unknown }> = [
        { Key: "TechnicalProfileId", Value: technicalProfileId },
        { Key: "VerificationAction", Value: "ProcessVerificationRequest" },
    ];

    if (controlId) {
        values.push({ Key: "ControlId", Value: controlId });
    }

    return {
        Values: [
            {
                Key: "Verification",
                Value: {
                    Values: values,
                },
            },
        ],
    };
}

/**
 * Build ApiUiManagerInfo recorder record for UI settings extraction.
 */
export function buildApiUiManagerInfoRecord(
    language: Record<string, string>,
    settings: Record<string, unknown>
): RecorderRecord {
    return {
        Values: [
            {
                Key: "ApiUiManagerInfo",
                Value: {
                    Values: [
                        { Key: "Language", Value: JSON.stringify(language) },
                        { Key: "Settings", Value: JSON.stringify(settings) },
                    ],
                },
            },
        ],
    };
}

/**
 * Build SSO session record for SSO handler results.
 */
export function buildSsoSessionRecord(
    sessionId: string,
    provider: string,
    activated: boolean
): RecorderRecord {
    return {
        Values: [
            {
                Key: "SSOSession",
                Value: {
                    SessionId: sessionId,
                    Provider: provider,
                    Activated: activated,
                },
            },
        ],
    };
}

/**
 * Build self-asserted validation record with validation request/response.
 */
export function buildSelfAssertedValidationRecord(
    technicalProfileId: string,
    protocolProviderType: string,
    validationTpId?: string,
    validationRequestUrl?: string
): RecorderRecord {
    const validationValues: Array<{ Key: string; Value: unknown }> = [
        { Key: "SubmittedBy", Value: null },
        { Key: "ProtocolProviderType", Value: protocolProviderType },
    ];

    if (validationTpId) {
        const tpValues: Array<{ Key: string; Value: unknown }> = [
            { Key: "TechnicalProfileId", Value: validationTpId },
        ];
        if (validationRequestUrl) {
            tpValues.push({ Key: "ValidationRequestUrl", Value: validationRequestUrl });
        }
        validationValues.push({
            Key: "ValidationTechnicalProfile",
            Value: { Values: tpValues },
        });
    }

    return {
        Values: [
            {
                Key: "Validation",
                Value: {
                    Values: validationValues,
                },
            },
        ],
    };
}

// =============================================================================
// TRACE LOG INPUT BUILDER
// =============================================================================

export function buildTraceLogInput(
    fixture: TestFixture,
    clips: ClipsArray,
    timestampOffset = 0
): TraceLogInput {
    return {
        id: generateId("log"),
        timestamp: generateTimestamp(fixture.baseTimestamp, timestampOffset),
        policyId: fixture.policyId,
        correlationId: fixture.correlationId,
        clips,
    };
}

// =============================================================================
// SCENARIO BUILDERS (Higher-level abstractions)
// =============================================================================

export function buildSimpleOrchestrationStep(
    fixture: TestFixture,
    step: number,
    eventType: "Event:AUTH" | "Event:API" | "Event:SELFASSERTED" | "Event:ClaimsExchange" = "Event:AUTH",
    timestampOffset = 0
): TraceLogInput {
    return buildTraceLogInput(
        fixture,
        [
            buildHeadersClip(fixture, eventType),
            buildOrchestrationManagerAction(),
            buildOrchestrationResult(step),
        ],
        timestampOffset
    );
}

export function buildHrdStep(
    fixture: TestFixture,
    step: number,
    availableOptions: string[],
    timestampOffset = 0
): TraceLogInput {
    return buildTraceLogInput(
        fixture,
        [
            buildHeadersClip(fixture, "Event:AUTH"),
            buildOrchestrationManagerAction(),
            buildOrchestrationResult(step),
            buildActionClip("HomeRealmDiscoveryActionHandler"),
            buildActionResult(true, buildHomeRealmDiscoveryRecord(step, availableOptions)),
            buildOrchestrationManagerAction(),
        ],
        timestampOffset
    );
}

export function buildSelfAssertedStep(
    fixture: TestFixture,
    step: number,
    technicalProfileId: string,
    validationTpId?: string,
    timestampOffset = 0
): TraceLogInput {
    const clips: ClipsArray = [
        buildHeadersClip(fixture, "Event:SELFASSERTED"),
        buildOrchestrationManagerAction(),
        buildOrchestrationResult(step, buildCtpStatebag(technicalProfileId, step)),
    ];

    if (validationTpId) {
        clips.push(
            buildActionClip("SelfAssertedAttributeProviderActionHandler"),
            buildActionResult(true, buildValidationTechnicalProfileRecord(validationTpId))
        );
    }

    clips.push(buildOrchestrationManagerAction());

    return buildTraceLogInput(fixture, clips, timestampOffset);
}

export function buildClaimsExchangeStep(
    fixture: TestFixture,
    step: number,
    technicalProfileId: string,
    providerType = "AzureActiveDirectoryProvider",
    timestampOffset = 0
): TraceLogInput {
    return buildTraceLogInput(
        fixture,
        [
            buildHeadersClip(fixture, "Event:API"),
            buildOrchestrationManagerAction(),
            buildOrchestrationResult(step),
            buildPredicateClip("IsClaimsExchangeProtocolAServiceCallHandler"),
            buildPredicateResult(
                true,
                buildInitiatingClaimsExchangeRecord(technicalProfileId, providerType)
            ),
            buildOrchestrationManagerAction(),
        ],
        timestampOffset
    );
}

export function buildSubJourneyInvocationStep(
    fixture: TestFixture,
    step: number,
    subJourneyId: string,
    timestampOffset = 0
): TraceLogInput {
    return buildTraceLogInput(
        fixture,
        [
            buildHeadersClip(fixture, "Event:AUTH"),
            buildOrchestrationManagerAction(),
            buildOrchestrationResult(step),
            buildActionClip("EnqueueNewJourneyHandler"),
            buildActionResult(true, buildSubJourneyInvokedRecord(subJourneyId)),
            buildOrchestrationManagerAction(),
            buildOrchestrationResult(0),
        ],
        timestampOffset
    );
}

export function buildJourneyCompletionStep(
    fixture: TestFixture,
    step: number,
    finalClaims: Record<string, string>,
    timestampOffset = 0
): TraceLogInput {
    return buildTraceLogInput(
        fixture,
        [
            buildHeadersClip(fixture, "Event:API"),
            buildOrchestrationManagerAction(),
            buildOrchestrationResult(step, buildComplexClaimsStatebag(finalClaims)),
            buildOrchestrationManagerAction(),
            buildActionResult(true, buildJourneyCompletedRecord(generateTimestamp(fixture.baseTimestamp, timestampOffset))),
        ],
        timestampOffset
    );
}
