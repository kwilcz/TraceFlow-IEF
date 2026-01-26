/**
 * Comprehensive type definitions for Azure AD B2C TrustFramework TechnicalProfile
 * Based on TrustFrameworkPolicy_0.3.0.0.xsd schema
 */

/**
 * Protocol names supported by B2C Technical Profiles
 */
export const PROTOCOL_NAME = {
    OAuth1: 'OAuth1',
    OAuth2: 'OAuth2',
    SAML2: 'SAML2',
    OpenIdConnect: 'OpenIdConnect',
    WsFed: 'WsFed',
    WsTrust: 'WsTrust',
    Proprietary: 'Proprietary',
    None: 'None',
} as const;

export type ProtocolName = typeof PROTOCOL_NAME[keyof typeof PROTOCOL_NAME];

/**
 * Token formats
 */
export type TokenFormat = 'JSON' | 'JWT' | 'SAML11' | 'SAML2';

/**
 * Protocol definition with handler information
 */
export interface Protocol {
    name: ProtocolName;
    handler?: string;
}

/**
 * Metadata item in a technical profile
 */
export interface MetadataItem {
    key: string;
    value: string;
}

/**
 * Cryptographic key reference
 */
export interface CryptographicKey {
    id: string;
    storageReferenceId: string;
}

/**
 * Claim reference with transformations
 */
export interface ClaimReference {
    claimTypeReferenceId: string;
    partnerClaimType?: string;
    defaultValue?: string;
    alwaysUseDefaultValue?: boolean;
    required?: boolean;
}

/**
 * Persisted claim reference
 */
export interface PersistedClaim extends ClaimReference {
    overwriteIfExists?: boolean;
}

/**
 * Claims transformation reference
 */
export interface ClaimsTransformationReference {
    id: string;
    transformationMethod?: string;
}

/**
 * Validation technical profile reference
 */
export interface ValidationTechnicalProfileReference {
    referenceId: string;
    continueOnSuccess?: boolean;
    continueOnError?: boolean;
}

/**
 * Input token source
 */
export interface InputTokenSource {
    tokenSourceId: string;
}

/**
 * Display claim reference
 */
export interface DisplayClaimReference {
    claimTypeReferenceId?: string;
    displayControlReferenceId?: string;
    required?: boolean;
}

/**
 * Display control claim type reference (for input/output claims in display controls)
 */
export interface DisplayControlClaimTypeReference {
    claimTypeReferenceId?: string;
    required?: boolean;
    defaultValue?: string;
    alwaysUseDefaultValue?: boolean;
}

/**
 * Display control display claim reference (for display claims in display controls)
 */
export interface DisplayControlDisplayClaimReference {
    claimTypeReferenceId?: string;
    controlClaimType?: string;
    required?: boolean;
}

/**
 * Validation claims exchange technical profile for display control actions
 */
export interface ValidationClaimsExchangeTechnicalProfile {
    technicalProfileReferenceId: string;
    continueOnSuccess?: boolean;
    continueOnError?: boolean;
}

/**
 * Display control action
 */
export interface DisplayControlAction {
    id: string;
    validationClaimsExchange?: ValidationClaimsExchangeTechnicalProfile[];
}

/**
 * Display control definition
 */
export interface DisplayControl {
    id: string;
    userInterfaceControlType: 'VerificationControl' | string;
    inputClaims?: DisplayControlClaimTypeReference[];
    displayClaims?: DisplayControlDisplayClaimReference[];
    outputClaims?: DisplayControlClaimTypeReference[];
    actions?: DisplayControlAction[];
}

/**
 * Inheritance path for a technical profile
 * Tracks both direct (same name from BasePolicy) and indirect (IncludeTechnicalProfile) inheritance
 */
export interface TechnicalProfileInheritance {
    /** Direct inheritance: profiles with same ID from parent policies */
    directParents: Array<{
        policyId: string;
        profileId: string;
        fileName: string;
    }>;
    /** Indirect inheritance: profiles included via IncludeTechnicalProfile */
    includedProfiles: Array<{
        policyId: string;
        profileId: string;
        fileName: string;
    }>;
}

/**
 * Complete Technical Profile definition
 */
export interface TechnicalProfile {
    /** Unique identifier */
    id: string;
    
    /** Display name */
    displayName?: string;
    
    /** Description */
    description?: string;
    
    /** Protocol definition */
    protocol?: Protocol;
    
    /** Input token format */
    inputTokenFormat?: TokenFormat;
    
    /** Output token format */
    outputTokenFormat?: TokenFormat;
    
    /** Metadata items */
    metadata?: MetadataItem[];
    
    /** Cryptographic keys */
    cryptographicKeys?: CryptographicKey[];
    
    /** Input claims transformations */
    inputClaimsTransformations?: ClaimsTransformationReference[];
    
    /** Input claims */
    inputClaims?: ClaimReference[];
    
    /** Display claims (for UI) */
    displayClaims?: DisplayClaimReference[];
    
    /** Display controls (for advanced UI controls) */
    displayControls?: DisplayControl[];
    
    /** Persisted claims */
    persistedClaims?: PersistedClaim[];
    
    /** Output claims */
    outputClaims?: ClaimReference[];
    
    /** Output claims transformations */
    outputClaimsTransformations?: ClaimsTransformationReference[];
    
    /** Validation technical profiles */
    validationTechnicalProfiles?: ValidationTechnicalProfileReference[];
    
    /** Input token sources */
    inputTokenSources?: InputTokenSource[];
    
    /** Include technical profile reference */
    includeTechnicalProfileReferenceId?: string;
    
    /** Session management technical profile reference */
    useTechnicalProfileForSessionManagement?: string;
    
    /** Enabled for user journeys */
    enabledForUserJourneys?: 'Always' | 'Never' | 'OnClaimsExistence' | 'OnItemExistenceInStringCollectionClaim';
    
    /** Inheritance information */
    inheritance?: TechnicalProfileInheritance;
    
    /** File path where this technical profile is defined */
    sourceFile?: string;
    
    /** Policy ID where this technical profile is defined */
    sourcePolicyId?: string;
    
    /** Raw XML of this technical profile (for editing) */
    rawXml?: string;
    
    /** Computed/merged data from inheritance chain */
    computed?: {
        /** All input claims including inherited */
        allInputClaims?: ClaimReference[];
        /** All output claims including inherited */
        allOutputClaims?: ClaimReference[];
        /** All persisted claims including inherited */
        allPersistedClaims?: PersistedClaim[];
        /** All input transformations including inherited */
        allInputTransformations?: ClaimsTransformationReference[];
        /** All output transformations including inherited */
        allOutputTransformations?: ClaimsTransformationReference[];
        /** All metadata including inherited */
        allMetadata?: MetadataItem[];
    };
}

/**
 * Badge colors for protocol pill
 */
export const PROTOCOL_BADGE_COLORS: Record<ProtocolName | 'default', string> = {
    [PROTOCOL_NAME.OAuth1]: 'bg-sky-600',
    [PROTOCOL_NAME.OAuth2]: 'bg-sky-700',
    [PROTOCOL_NAME.SAML2]: 'bg-fuchsia-700',
    [PROTOCOL_NAME.OpenIdConnect]: 'bg-blue-700',
    [PROTOCOL_NAME.WsFed]: 'bg-violet-700',
    [PROTOCOL_NAME.WsTrust]: 'bg-violet-800',
    [PROTOCOL_NAME.Proprietary]: 'bg-slate-600',
    [PROTOCOL_NAME.None]: 'bg-slate-500',
    default: 'bg-slate-500',
};

/**
 * Known protocol handler badge colors (shown only for Proprietary protocol).
 * Keys are short names extracted from the handler string, e.g. "AzureActiveDirectoryProvider".
 */
export const PROTOCOL_HANDLER_BADGE_COLORS: Record<string, string> = {
    RestfulProvider: 'bg-purple-500/90',
    SelfAssertedAttributeProvider: 'bg-emerald-500',
    AzureActiveDirectoryProvider: 'bg-indigo-500',
    ClaimsTransformationProtocolProvider: 'bg-amber-700',
    CaptchaProvider: 'bg-rose-600',
    ConditionalAccessProtocolProvider: 'bg-cyan-700',
    AzureMfaProtocolProvider: 'bg-teal-500',
    DefaultSSOSessionProvider: 'bg-pink-500',
    ExternalLoginSSOSessionProvider: 'bg-pink-600',
    OAuthSSOSessionProvider: 'bg-pink-700',
    NoopSSOSessionProvider: 'bg-pink-400',
    default: 'bg-slate-500',
};

/**
 * Extract protocol handler short name from handler string.
 * Example:
 * "Web.TPEngine.Providers.AzureActiveDirectoryProvider, Web.TPEngine, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null"
 * -> "AzureActiveDirectoryProvider"
 */
export function getProtocolHandlerShortName(handler?: string): string | undefined {
    if (!handler) return undefined;

    const match = handler.match(/Web\.TPEngine\.(?:Providers|SSO)\.([^,]+)/);
    if (match?.[1]) return match[1];

    const firstPart = handler.split(',')[0]?.trim();
    if (!firstPart) return undefined;

    return firstPart.split('.').pop();
}

/**
 * Get badge color for a protocol.
 */
export function getProtocolBadgeColor(protocolName?: ProtocolName): string {
    if (!protocolName) return PROTOCOL_BADGE_COLORS.default;
    return PROTOCOL_BADGE_COLORS[protocolName] || PROTOCOL_BADGE_COLORS.default;
}

/**
 * Get badge color for a protocol handler (short name).
 */
export function getProtocolHandlerBadgeColor(handlerShortName?: string): string {
    if (!handlerShortName) return PROTOCOL_HANDLER_BADGE_COLORS.default;
    return PROTOCOL_HANDLER_BADGE_COLORS[handlerShortName] || PROTOCOL_HANDLER_BADGE_COLORS.default;
}

/**
 * OrchestrationStep with enhanced technical profile data
 */
export interface OrchestrationStepWithTechnicalProfile {
    order: number;
    type: string;
    
    /** Technical profiles referenced in this step */
    technicalProfiles?: TechnicalProfile[];

    /** Cpim issuer technical profile reference (used by SendClaims/GetClaims) */
    cpimIssuerTechnicalProfileReferenceId?: string;
    
    /** Claims exchanges */
    claimsExchanges?: Array<{
        id: string;
        technicalProfileReferenceId: string;
        technicalProfile?: TechnicalProfile;
    }>;
    
    /** Claims provider selections */
    claimsProviderSelections?: Array<{
        targetClaimsExchangeId?: string;
        validationClaimsExchangeId?: string;
    }>;
    
    /** Raw XML of this orchestration step */
    rawXml?: string;
}
