import type { ProtocolName } from '@/types/technical-profile';

/**
 * Comprehensive type definitions for all Azure AD B2C TrustFramework entities
 * Based on TrustFrameworkPolicy_0.3.0.0.xsd schema and backend models
 * 
 * ## Important: Entity Storage Structure
 * 
 * All entities are stored as arrays to preserve the inheritance chain.
 * Each entity ID maps to an array of entity versions from different policy files.
 * 
 * Example:
 * ```typescript
 * entities.technicalProfiles['SelfAsserted-LocalAccountSignin-Email'] = [
 *   { ...entity from Base.xml, hierarchyDepth: 0 },
 *   { ...entity from Extension.xml, hierarchyDepth: 1 },
 *   { ...entity from SignUpOrSignIn.xml, hierarchyDepth: 2 }
 * ]
 * ```
 * 
 * ## Working with Entities
 * 
 * ### Default Display (Consolidated View)
 * Use `getEntity()` to get the "default" entity for UI display:
 * - Returns the entity from ConsolidatedPolicy if available
 * - Otherwise returns the first entity in the array
 * 
 * ```typescript
 * const profile = getEntity(entities, 'TechnicalProfile', 'SelfAsserted-LocalAccountSignin-Email');
 * // This is what you display in the graph, nodes, and default sidebar
 * ```
 * 
 * ### Inheritance Chain Navigation
 * Use `getAllEntities()` to get all versions for inheritance navigation:
 * 
 * ```typescript
 * const allVersions = getAllEntities(entities, 'TechnicalProfile', 'SelfAsserted-LocalAccountSignin-Email');
 * // Use this when user clicks through the inheritance chain to see different policy versions
 * allVersions.forEach(version => {
 *   console.log(`${version.sourcePolicyId}: ${version.sourceFile}`);
 * });
 * ```
 * 
 * ### Best Practices
 * - **Always use helper functions** (`getEntity`, `getAllEntities`, `hasEntity`) instead of direct dictionary access
 * - **Default display**: Use `getEntity()` for graph rendering and initial sidebar display
 * - **Inheritance navigation**: Use `getAllEntities()` when user navigates through policy hierarchy
 * - **ConsolidatedPolicy** is the "merged" view and should be the default when available
 */

/**
 * Base interface for all TrustFramework policy entities
 */
export interface TrustFrameworkEntity {
    id: string;
    entityType: string;
    sourceFile: string;
    sourcePolicyId: string;
    xpath: string;
    hierarchyDepth: number;
    isOverride: boolean;
    rawXml: string;
}

/**
 * Enumeration item for claim restrictions
 */
export interface EnumerationItem {
    value: string;
    text: string;
    selectByDefault: boolean;
}

/**
 * Restriction information for claims
 */
export interface RestrictionInfo {
    pattern?: string;
    enumeration: EnumerationItem[];
}

/**
 * ClaimType entity from ClaimsSchema
 */
export interface ClaimTypeEntity extends TrustFrameworkEntity {
    entityType: 'ClaimType';
    displayName?: string;
    dataType?: string;
    userInputType?: string;
    mask?: string;
    adminHelpText?: string;
    userHelpText?: string;
    defaultPartnerClaimTypes: Record<string, string>;
    restriction?: RestrictionInfo;
    predicateValidationReference?: string;
}

/**
 * Metadata item
 */
export interface MetadataItemInfo {
    key: string;
    value: string;
}

/**
 * Claim reference information
 */
export interface ClaimReferenceInfo {
    claimTypeReferenceId?: string;
    partnerClaimType?: string;
    defaultValue?: string;
    alwaysUseDefaultValue?: boolean;
    required?: boolean;
    displayControlReferenceId?: string;
}

/**
 * Inheritance information
 */
export interface InheritanceInfo {
    profileId: string;
    policyId: string;
    fileName: string;
    inheritanceType: 'Direct' | 'Include';
}

/**
 * TechnicalProfile entity
 */
export interface TechnicalProfileEntity extends TrustFrameworkEntity {
    entityType: 'TechnicalProfile';
    displayName?: string;
    description?: string;
    protocolName?: ProtocolName;
    protocolHandler?: string;
    claimsProviderDisplayName?: string;
    metadata: MetadataItemInfo[];
    inputClaimsTransformations: string[];
    inputClaims: ClaimReferenceInfo[];
    displayClaims: ClaimReferenceInfo[];
    displayControls: string[];
    persistedClaims: ClaimReferenceInfo[];
    outputClaims: ClaimReferenceInfo[];
    outputClaimsTransformations: string[];
    validationTechnicalProfiles: string[];
    includeTechnicalProfile?: string;
    inheritanceChain: InheritanceInfo[];
}

/**
 * Input parameter for claims transformation
 */
export interface InputParameterInfo {
    id: string;
    dataType: string;
    value: string;
}

/**
 * ClaimsTransformation entity
 */
export interface ClaimsTransformationEntity extends TrustFrameworkEntity {
    entityType: 'ClaimsTransformation';
    transformationMethod: string;
    inputClaims: ClaimReferenceInfo[];
    inputParameters: InputParameterInfo[];
    outputClaims: ClaimReferenceInfo[];
}

/**
 * Display control action information
 */
export interface DisplayControlActionInfo {
    id: string;
    validationClaimsExchanges: string[];
}

/**
 * DisplayControl entity
 */
export interface DisplayControlEntity extends TrustFrameworkEntity {
    entityType: 'DisplayControl';
    userInterfaceControlType: string;
    inputClaims: ClaimReferenceInfo[];
    displayClaims: ClaimReferenceInfo[];
    outputClaims: ClaimReferenceInfo[];
    actions: DisplayControlActionInfo[];
}

/**
 * Claims exchange information
 */
export interface ClaimsExchangeInfo {
    id: string;
    technicalProfileReferenceId: string;
}

/**
 * Precondition information
 */
export interface PreconditionInfo {
    type: string;
    executeActionsIf: boolean;
    values: string[];
    action: string;
}

/**
 * Orchestration step information
 */
export interface OrchestrationStepInfo {
    order: number;
    type: string;
    contentDefinitionReferenceId?: string;
    claimsExchanges: ClaimsExchangeInfo[];
    preconditions: PreconditionInfo[];
}

/**
 * UserJourney entity
 */
export interface UserJourneyEntity extends TrustFrameworkEntity {
    entityType: 'UserJourney';
    defaultCpimIssuerTechnicalProfileReferenceId?: string;
    orchestrationSteps: OrchestrationStepInfo[];
}

/**
 * SubJourney entity
 */
export interface SubJourneyEntity extends TrustFrameworkEntity {
    entityType: 'SubJourney';
    type: string;
    orchestrationSteps: OrchestrationStepInfo[];
}

/**
 * ClaimsProvider entity
 */
export interface ClaimsProviderEntity extends TrustFrameworkEntity {
    entityType: 'ClaimsProvider';
    displayName?: string;
    technicalProfileIds: string[];
}

/**
 * Collection of all policy entities
 */
export interface PolicyEntities {
    claimTypes: Record<string, ClaimTypeEntity[]>;
    technicalProfiles: Record<string, TechnicalProfileEntity[]>;
    claimsTransformations: Record<string, ClaimsTransformationEntity[]>;
    displayControls: Record<string, DisplayControlEntity[]>;
    userJourneys: Record<string, UserJourneyEntity[]>;
    subJourneys: Record<string, SubJourneyEntity[]>;
    claimsProviders: Record<string, ClaimsProviderEntity[]>;
}

/**
 * Union type of all entity types
 */
export type AnyTrustFrameworkEntity =
    | ClaimTypeEntity
    | TechnicalProfileEntity
    | ClaimsTransformationEntity
    | DisplayControlEntity
    | UserJourneyEntity
    | SubJourneyEntity
    | ClaimsProviderEntity;

/**
 * Entity type discriminator
 */
export type EntityType =
    | 'ClaimType'
    | 'TechnicalProfile'
    | 'ClaimsTransformation'
    | 'DisplayControl'
    | 'UserJourney'
    | 'SubJourney'
    | 'ClaimsProvider';

/**
 * Constants for consolidated policy identification
 */
export const CONSOLIDATED_FILE_NAME = 'ConsolidatedPolicy';
export const CONSOLIDATED_POLICY_ID = 'Consolidated';

/**
 * Helper to get the default (consolidated) entity from an array of entities.
 * Returns the entity from the consolidated policy if available, otherwise the first entity.
 */
function getDefaultEntity<T extends TrustFrameworkEntity>(
    entities: T[] | undefined
): T | undefined {
    if (!entities || entities.length === 0) return undefined;
    
    const consolidated = entities.find(
        e => e.sourceFile === CONSOLIDATED_FILE_NAME || 
             e.sourcePolicyId === CONSOLIDATED_POLICY_ID
    );
    
    return consolidated || entities[0];
}

/**
 * Helper to get all entities from entities collection by type and ID
 */
export function getAllEntities(
    entities: PolicyEntities,
    type: EntityType,
    id: string
): AnyTrustFrameworkEntity[] {
    switch (type) {
        case 'ClaimType':
            return entities.claimTypes[id] || [];
        case 'TechnicalProfile':
            return entities.technicalProfiles[id] || [];
        case 'ClaimsTransformation':
            return entities.claimsTransformations[id] || [];
        case 'DisplayControl':
            return entities.displayControls[id] || [];
        case 'UserJourney':
            return entities.userJourneys[id] || [];
        case 'SubJourney':
            return entities.subJourneys[id] || [];
        case 'ClaimsProvider':
            return entities.claimsProviders[id] || [];
        default:
            return [];
    }
}

/**
 * Helper to get the default entity from entities collection by type and ID.
 * Returns the consolidated entity if available, otherwise the first entity.
 */
export function getEntity(
    entities: PolicyEntities,
    type: EntityType,
    id: string
): AnyTrustFrameworkEntity | undefined {
    const allEntities = getAllEntities(entities, type, id);
    return getDefaultEntity(allEntities);
}

/**
 * Helper to check if an entity exists
 */
export function hasEntity(
    entities: PolicyEntities,
    type: EntityType,
    id: string
): boolean {
    return getEntity(entities, type, id) !== undefined;
}
