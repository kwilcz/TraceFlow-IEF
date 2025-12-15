/**
 * TechnicalProfile Parser
 * Extracts and resolves TechnicalProfile data from B2C policy XML
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    TechnicalProfile,
    MetadataItem,
    ClaimReference,
    PersistedClaim,
    ClaimsTransformationReference,
    ValidationTechnicalProfileReference,
    extractProviderName,
    Protocol,
    DisplayClaimReference
} from '@/types/technical-profile';
import { ensureArray } from '@lib/utils';

interface ParsedPolicy {
    TrustFrameworkPolicy: any;
}

/**
 * Extracts all TechnicalProfiles from a parsed policy XML
 */
export function extractTechnicalProfiles(parsedPolicy: ParsedPolicy, sourceFile?: string): Map<string, TechnicalProfile> {
    const profilesMap = new Map<string, TechnicalProfile>();
    const policyId = parsedPolicy.TrustFrameworkPolicy?.['@_PolicyId'];

    if (!parsedPolicy.TrustFrameworkPolicy?.ClaimsProviders) {
        console.warn('No ClaimsProviders found in policy');
        return profilesMap;
    }

    // ClaimsProviders is a container, ClaimsProvider is the array of individual providers
    const claimsProvidersContainer = parsedPolicy.TrustFrameworkPolicy.ClaimsProviders;
    const claimsProviders = ensureArray(claimsProvidersContainer.ClaimsProvider);
    console.log(`Extracting TechnicalProfiles from ${claimsProviders.length} ClaimsProviders`);

    claimsProviders.forEach((provider: any) => {
        if (!provider.TechnicalProfiles?.TechnicalProfile) {
            return;
        }

        const technicalProfiles = ensureArray(provider.TechnicalProfiles.TechnicalProfile);

        technicalProfiles.forEach((tp: any) => {
            const profile = parseTechnicalProfile(tp, policyId, sourceFile);
            if (profile) {
                profilesMap.set(profile.id, profile);
            }
        });
    });

    console.log(`Extracted ${profilesMap.size} TechnicalProfiles:`, Array.from(profilesMap.keys()).slice(0, 20));

    return profilesMap;
}

/**
 * Parses a single TechnicalProfile element
 */
function parseTechnicalProfile(tp: any, sourcePolicyId?: string, sourceFile?: string): TechnicalProfile | null {
    const id = tp['@_Id'];
    if (!id) return null;

    const protocol: Protocol | undefined = tp.Protocol ? {
        name: tp.Protocol['@_Name'],
        handler: tp.Protocol['@_Handler']
    } : undefined;

    const providerName = extractProviderName(protocol?.handler);

    const profile: TechnicalProfile = {
        id,
        displayName: tp.DisplayName,
        description: tp.Description,
        protocol,
        providerName,
        inputTokenFormat: tp.InputTokenFormat,
        outputTokenFormat: tp.OutputTokenFormat,
        metadata: parseMetadata(tp.Metadata),
        cryptographicKeys: parseCryptographicKeys(tp.CryptographicKeys),
        inputClaimsTransformations: parseClaimsTransformations(tp.InputClaimsTransformations),
        inputClaims: parseClaims(tp.InputClaims?.InputClaim),
        displayClaims: parseDisplayClaims(tp.DisplayClaims?.DisplayClaim),
        persistedClaims: parsePersistedClaims(tp.PersistedClaims?.PersistedClaim),
        outputClaims: parseClaims(tp.OutputClaims?.OutputClaim),
        outputClaimsTransformations: parseClaimsTransformations(tp.OutputClaimsTransformations),
        validationTechnicalProfiles: parseValidationProfiles(tp.ValidationTechnicalProfiles),
        includeTechnicalProfileReferenceId: tp.IncludeTechnicalProfile?.['@_ReferenceId'],
        useTechnicalProfileForSessionManagement: tp.UseTechnicalProfileForSessionManagement?.['@_ReferenceId'],
        enabledForUserJourneys: tp.EnabledForUserJourneys,
        sourcePolicyId,
        sourceFile,
        inheritance: {
            directParents: [],
            includedProfiles: []
        }
    };

    return profile;
}

/**
 * Parse metadata items
 */
function parseMetadata(metadata: any): MetadataItem[] | undefined {
    if (!metadata?.Item) return undefined;

    const items = ensureArray(metadata.Item);
    return items.map((item: any) => ({
        key: item['@_Key'],
        value: item['#text'] || item._ || ''
    }));
}

/**
 * Parse cryptographic keys
 */
function parseCryptographicKeys(cryptographicKeys: any): any[] | undefined {
    if (!cryptographicKeys?.Key) return undefined;

    const keys = ensureArray(cryptographicKeys.Key);
    return keys.map((key: any) => ({
        id: key['@_Id'],
        storageReferenceId: key['@_StorageReferenceId']
    }));
}

/**
 * Parse claims transformations
 */
function parseClaimsTransformations(transformations: any): ClaimsTransformationReference[] | undefined {
    if (!transformations) return undefined;

    // Handle nested array structure from XML parser
    const flatTransformations: any[] = [];
    if (Array.isArray(transformations)) {
        transformations.forEach(group => {
            if (Array.isArray(group)) {
                flatTransformations.push(...group);
            } else if (group.InputClaimsTransformation) {
                const items = ensureArray(group.InputClaimsTransformation);
                flatTransformations.push(...items);
            } else if (group.OutputClaimsTransformation) {
                const items = ensureArray(group.OutputClaimsTransformation);
                flatTransformations.push(...items);
            }
        });
    }

    return flatTransformations.map((ct: any) => ({
        id: ct['@_ReferenceId'],
        transformationMethod: ct['@_TransformationMethod']
    }));
}

/**
 * Parse claims
 */
function parseClaims(claims: any): ClaimReference[] | undefined {
    if (!claims) return undefined;

    const claimArray = ensureArray(claims);
    return claimArray.map((claim: any) => ({
        claimTypeReferenceId: claim['@_ClaimTypeReferenceId'],
        partnerClaimType: claim['@_PartnerClaimType'],
        defaultValue: claim['@_DefaultValue'],
        alwaysUseDefaultValue: claim['@_AlwaysUseDefaultValue'] === 'true',
        required: claim['@_Required'] === 'true'
    }));
}

/**
 * Parse display claims
 */
function parseDisplayClaims(claims: any): DisplayClaimReference[] | undefined {
    if (!claims) return undefined;

    const claimArray = ensureArray(claims);
    return claimArray.map((claim: any) => ({
        claimTypeReferenceId: claim['@_ClaimTypeReferenceId'],
        displayControlReferenceId: claim['@_DisplayControlReferenceId'],
        required: claim['@_Required'] === 'true'
    }));
}

/**
 * Parse persisted claims
 */
function parsePersistedClaims(claims: any): PersistedClaim[] | undefined {
    if (!claims) return undefined;

    const claimArray = ensureArray(claims);
    return claimArray.map((claim: any) => ({
        claimTypeReferenceId: claim['@_ClaimTypeReferenceId'],
        partnerClaimType: claim['@_PartnerClaimType'],
        defaultValue: claim['@_DefaultValue'],
        alwaysUseDefaultValue: claim['@_AlwaysUseDefaultValue'] === 'true',
        required: claim['@_Required'] === 'true',
        overwriteIfExists: claim['@_OverwriteIfExists'] !== 'false' // Default is true
    }));
}

/**
 * Parse validation technical profiles
 */
function parseValidationProfiles(validationProfiles: any): ValidationTechnicalProfileReference[] | undefined {
    if (!validationProfiles) return undefined;

    const profiles: any[] = [];
    
    // Handle nested array structure
    if (Array.isArray(validationProfiles)) {
        validationProfiles.forEach(group => {
            if (Array.isArray(group)) {
                profiles.push(...group);
            } else if (group.ValidationTechnicalProfile) {
                const items = ensureArray(group.ValidationTechnicalProfile);
                profiles.push(...items);
            }
        });
    }

    return profiles.map((vtp: any) => ({
        referenceId: vtp['@_ReferenceId'],
        continueOnSuccess: vtp['@_ContinueOnSuccess'] !== 'false', // Default is true
        continueOnError: vtp['@_ContinueOnError'] === 'true' // Default is false
    }));
}

/**
 * Resolves TechnicalProfile inheritance
 * Processes both direct inheritance (same ID from base policies) and 
 * indirect inheritance (IncludeTechnicalProfile references)
 */
export function resolveTechnicalProfileInheritance(
    profilesMap: Map<string, TechnicalProfile>,
    basePolicies?: Map<string, Map<string, TechnicalProfile>>
): Map<string, TechnicalProfile> {
    const resolvedProfiles = new Map<string, TechnicalProfile>();

    profilesMap.forEach((profile, profileId) => {
        const resolvedProfile = resolveInheritanceChain(profile, profilesMap, basePolicies);
        resolvedProfiles.set(profileId, resolvedProfile);
    });

    return resolvedProfiles;
}

/**
 * Resolve inheritance for a single profile
 */
function resolveInheritanceChain(
    profile: TechnicalProfile,
    currentPolicyProfiles: Map<string, TechnicalProfile>,
    basePolicies?: Map<string, Map<string, TechnicalProfile>>
): TechnicalProfile {
    const resolved: TechnicalProfile = { ...profile };
    const inheritanceChain: TechnicalProfile[] = [];

    // Resolve IncludeTechnicalProfile references
    if (profile.includeTechnicalProfileReferenceId) {
        const includedProfile = currentPolicyProfiles.get(profile.includeTechnicalProfileReferenceId);
        if (includedProfile) {
            inheritanceChain.push(includedProfile);
            
            if (!resolved.inheritance) {
                resolved.inheritance = { directParents: [], includedProfiles: [] };
            }
            
            resolved.inheritance.includedProfiles.push({
                policyId: includedProfile.sourcePolicyId || '',
                profileId: includedProfile.id,
                fileName: includedProfile.sourceFile || ''
            });
        }
    }

    // Resolve direct inheritance from base policies
    if (basePolicies) {
        basePolicies.forEach((basePolicyProfiles, basePolicyId) => {
            const baseProfile = basePolicyProfiles.get(profile.id);
            if (baseProfile) {
                inheritanceChain.push(baseProfile);
                
                if (!resolved.inheritance) {
                    resolved.inheritance = { directParents: [], includedProfiles: [] };
                }
                
                resolved.inheritance.directParents.push({
                    policyId: basePolicyId,
                    profileId: baseProfile.id,
                    fileName: baseProfile.sourceFile || ''
                });
            }
        });
    }

    // Merge inherited data
    if (inheritanceChain.length > 0) {
        resolved.computed = computeMergedData(profile, inheritanceChain);
    }

    return resolved;
}

/**
 * Compute merged data from inheritance chain
 */
function computeMergedData(
    profile: TechnicalProfile,
    inheritanceChain: TechnicalProfile[]
): TechnicalProfile['computed'] {
    // Start with inherited data, then overlay current profile
    const allInputClaims = [...(inheritanceChain.flatMap(p => p.inputClaims || []))];
    const allOutputClaims = [...(inheritanceChain.flatMap(p => p.outputClaims || []))];
    const allPersistedClaims = [...(inheritanceChain.flatMap(p => p.persistedClaims || []))];
    const allInputTransformations = [...(inheritanceChain.flatMap(p => p.inputClaimsTransformations || []))];
    const allOutputTransformations = [...(inheritanceChain.flatMap(p => p.outputClaimsTransformations || []))];
    const allMetadata = [...(inheritanceChain.flatMap(p => p.metadata || []))];

    // Add current profile's data (overriding duplicates)
    if (profile.inputClaims) {
        mergeClaims(allInputClaims, profile.inputClaims);
    }
    if (profile.outputClaims) {
        mergeClaims(allOutputClaims, profile.outputClaims);
    }
    if (profile.persistedClaims) {
        mergePersistedClaims(allPersistedClaims, profile.persistedClaims);
    }
    if (profile.inputClaimsTransformations) {
        mergeTransformations(allInputTransformations, profile.inputClaimsTransformations);
    }
    if (profile.outputClaimsTransformations) {
        mergeTransformations(allOutputTransformations, profile.outputClaimsTransformations);
    }
    if (profile.metadata) {
        mergeMetadata(allMetadata, profile.metadata);
    }

    return {
        allInputClaims: allInputClaims.length > 0 ? allInputClaims : undefined,
        allOutputClaims: allOutputClaims.length > 0 ? allOutputClaims : undefined,
        allPersistedClaims: allPersistedClaims.length > 0 ? allPersistedClaims : undefined,
        allInputTransformations: allInputTransformations.length > 0 ? allInputTransformations : undefined,
        allOutputTransformations: allOutputTransformations.length > 0 ? allOutputTransformations : undefined,
        allMetadata: allMetadata.length > 0 ? allMetadata : undefined
    };
}

/**
 * Merge claims arrays (newer claims override by claimTypeReferenceId)
 */
function mergeClaims(target: ClaimReference[], source: ClaimReference[]) {
    source.forEach(sourceClaim => {
        const existingIndex = target.findIndex(c => c.claimTypeReferenceId === sourceClaim.claimTypeReferenceId);
        if (existingIndex >= 0) {
            target[existingIndex] = sourceClaim;
        } else {
            target.push(sourceClaim);
        }
    });
}

/**
 * Merge persisted claims arrays
 */
function mergePersistedClaims(target: PersistedClaim[], source: PersistedClaim[]) {
    source.forEach(sourceClaim => {
        const existingIndex = target.findIndex(c => c.claimTypeReferenceId === sourceClaim.claimTypeReferenceId);
        if (existingIndex >= 0) {
            target[existingIndex] = sourceClaim;
        } else {
            target.push(sourceClaim);
        }
    });
}

/**
 * Merge transformations arrays
 */
function mergeTransformations(target: ClaimsTransformationReference[], source: ClaimsTransformationReference[]) {
    source.forEach(sourceTransform => {
        const existingIndex = target.findIndex(t => t.id === sourceTransform.id);
        if (existingIndex >= 0) {
            target[existingIndex] = sourceTransform;
        } else {
            target.push(sourceTransform);
        }
    });
}

/**
 * Merge metadata arrays
 */
function mergeMetadata(target: MetadataItem[], source: MetadataItem[]) {
    source.forEach(sourceItem => {
        const existingIndex = target.findIndex(m => m.key === sourceItem.key);
        if (existingIndex >= 0) {
            target[existingIndex] = sourceItem;
        } else {
            target.push(sourceItem);
        }
    });
}

/**
 * Extract TechnicalProfile references from OrchestrationStep
 */
export function extractTechnicalProfileReferencesFromStep(step: any): string[] {
    const references: string[] = [];

    // ClaimsExchange technical profiles
    if (step.ClaimsExchanges?.ClaimsExchange) {
        const exchanges = ensureArray(step.ClaimsExchanges.ClaimsExchange);
        exchanges.forEach((exchange: any) => {
            if (exchange['@_TechnicalProfileReferenceId']) {
                references.push(exchange['@_TechnicalProfileReferenceId']);
            }
        });
    }

    // CombinedSignInAndSignUp validation profiles
    if (step.ClaimsProviderSelections?.ClaimsProviderSelection) {
        const selections = ensureArray(step.ClaimsProviderSelections.ClaimsProviderSelection);
        selections.forEach((selection: any) => {
            if (selection['@_ValidationClaimsExchangeId']) {
                // This is an exchange ID, we need to resolve it separately
                // For now, just track it
            }
        });
    }

    // SendClaims / GetClaims
    if (step['@_CpimIssuerTechnicalProfileReferenceId']) {
        references.push(step['@_CpimIssuerTechnicalProfileReferenceId']);
    }

    return references;
}
