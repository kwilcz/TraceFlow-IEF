/**
 * Comprehensive type definitions for Azure AD B2C TrustFramework TechnicalProfile
 * Based on TrustFrameworkPolicy_0.3.0.0.xsd schema
 */

/**
 * Protocol names supported by B2C Technical Profiles
 */
export type ProtocolName = 
    | 'OAuth1'
    | 'OAuth2'
    | 'SAML2'
    | 'OpenIdConnect'
    | 'WsFed'
    | 'WsTrust'
    | 'Proprietary'
    | 'None';

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
    
    /** Provider name extracted from Handler (e.g., 'ClaimsTransformation', 'SelfAsserted', 'OAuth2') */
    providerName?: string;
    
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
 * Map of provider names to badge colors
 * Uses semi-transparent backgrounds to match the design mockup
 */
export const PROVIDER_BADGE_COLORS: Record<string, string> = {
    'RestfulProvider': 'bg-purple-500/90',
    'SelfAssertedAttributeProvider': 'bg-emerald-500',
    'ClaimsTransformationProtocolProvider': 'bg-amber-700',
    'AzureActiveDirectoryProvider': 'bg-indigo-500',
    'OneTimePasswordProtocolProvider': 'bg-orange-500',
    'REST': 'bg-red-500',
    'JwtIssuer': 'bg-yellow-500',
    'SessionManagement': 'bg-pink-500',
    'AzureMfaProtocolProvider': 'bg-teal-500',
    'default': 'bg-slate-500',
};

/**
 * Extract provider name from handler string
 * Format: "Web.TPEngine.Providers.PROVIDER, Web.TPEngine, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null"
 */
export function extractProviderName(handler?: string): string | undefined {
    if (!handler) return undefined;
    
    const match = handler.match(/Web\.TPEngine\.Providers\.([^,]+)/);
    return match ? match[1] : undefined;
}

/**
 * Get badge color for a provider
 */
export function getProviderBadgeColor(providerName?: string): string {
    if (!providerName) return PROVIDER_BADGE_COLORS.default;
    return PROVIDER_BADGE_COLORS[providerName] || PROVIDER_BADGE_COLORS.default;
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
