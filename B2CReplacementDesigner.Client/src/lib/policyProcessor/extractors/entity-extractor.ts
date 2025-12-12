/**
 * @module EntityExtractor
 * 
 * Extracts B2C policy entities from parsed XML into structured TypeScript objects.
 * 
 * Extracted entities include:
 * - ClaimTypes: Custom claim definitions with data types and display info
 * - ClaimsTransformations: Claim value transformations
 * - TechnicalProfiles: Identity provider and validation configurations
 * - ClaimsProviders: Grouped collections of TechnicalProfiles
 * - UserJourneys: Complete authentication flow definitions
 * - SubJourneys: Reusable journey fragments
 * - DisplayControls: UI component definitions
 * 
 * Each entity includes source tracking (fileName, policyId, hierarchyDepth)
 * for debugging and inheritance tracing.
 */

import type { ParsedPolicy, ExtractionContext } from '../types/processor-types';
import type { 
    PolicyEntities,
    TechnicalProfileEntity,
    ClaimTypeEntity,
    ClaimsTransformationEntity,
    UserJourneyEntity,
    SubJourneyEntity,
    ClaimsProviderEntity,
    DisplayControlEntity,
    ClaimReferenceInfo,
    MetadataItemInfo,
    InputParameterInfo,
    OrchestrationStepInfo,
    ClaimsExchangeInfo,
    PreconditionInfo,
} from '@/types/trust-framework-entities';
import { ensureArray } from '@/lib/utils';

/**
 * Extracts entities from B2C custom policy XML.
 * 
 * Processes the parsed policy structure and populates a PolicyEntities
 * collection with typed entity objects for each element type.
 */
export class EntityExtractor {
    /**
     * Extract all entities from a policy into the entities collection.
     * 
     * @param policy - Parsed policy XML object
     * @param context - Extraction context with source file info
     * @param entities - Target collection to populate
     */
    extractFromPolicy(
        policy: ParsedPolicy,
        context: ExtractionContext,
        entities: PolicyEntities
    ): void {
        const tfp = policy.TrustFrameworkPolicy;

        if (tfp.BuildingBlocks) {
            this.extractBuildingBlocks(tfp.BuildingBlocks, context, entities);
        }

        if (tfp.ClaimsProviders?.ClaimsProvider) {
            const providers = ensureArray(tfp.ClaimsProviders.ClaimsProvider);
            for (const provider of providers) {
                this.extractClaimsProvider(provider, context, entities);
            }
        }

        if (tfp.UserJourneys?.UserJourney) {
            const journeys = ensureArray(tfp.UserJourneys.UserJourney);
            for (const journey of journeys) {
                this.extractUserJourney(journey, context, entities);
            }
        }

        if (tfp.SubJourneys?.SubJourney) {
            const subJourneys = ensureArray(tfp.SubJourneys.SubJourney);
            for (const subJourney of subJourneys) {
                this.extractSubJourney(subJourney, context, entities);
            }
        }
    }

    /**
     * Extract ClaimTypes and ClaimsTransformations from BuildingBlocks.
     */
    private extractBuildingBlocks(
        /* eslint-disable @typescript-eslint/no-explicit-any */
        buildingBlocks: any,
        /* eslint-enable @typescript-eslint/no-explicit-any */
        context: ExtractionContext,
        entities: PolicyEntities
    ): void {
        if (buildingBlocks.ClaimsSchema?.ClaimType) {
            const claimTypes = ensureArray(buildingBlocks.ClaimsSchema.ClaimType);
            for (const claimType of claimTypes) {
                this.extractClaimType(claimType, context, entities);
            }
        }

        if (buildingBlocks.ClaimsTransformations?.ClaimsTransformation) {
            const transformations = ensureArray(buildingBlocks.ClaimsTransformations.ClaimsTransformation);
            for (const transformation of transformations) {
                this.extractClaimsTransformation(transformation, context, entities);
            }
        }
    }

    /**
     * Extract a ClaimType entity
     */
    private extractClaimType(
        /* eslint-disable @typescript-eslint/no-explicit-any */
        claimType: any,
        /* eslint-enable @typescript-eslint/no-explicit-any */
        context: ExtractionContext,
        entities: PolicyEntities
    ): void {
        const id = claimType['@_Id'];
        if (!id) return;

        const entity: ClaimTypeEntity = {
            id,
            entityType: 'ClaimType',
            sourceFile: context.fileName,
            sourcePolicyId: context.policyId,
            xpath: `/TrustFrameworkPolicy/BuildingBlocks/ClaimsSchema/ClaimType[@Id="${id}"]`,
            hierarchyDepth: context.hierarchyDepth,
            isOverride: context.processedEntityIds.has(`ClaimType:${id}`),
            rawXml: JSON.stringify(claimType),
            displayName: claimType.DisplayName,
            dataType: claimType.DataType,
            userInputType: claimType.UserInputType,
            mask: claimType.Mask,
            adminHelpText: claimType.AdminHelpText,
            userHelpText: claimType.UserHelpText,
            defaultPartnerClaimTypes: {},
            restriction: claimType.Restriction ? {
                pattern: claimType.Restriction.Pattern,
                enumeration: ensureArray(claimType.Restriction.Enumeration?.Enumeration).map(
                    (e: { '@_Value'?: string; '@_Text'?: string; '@_SelectByDefault'?: string }) => ({
                        value: e['@_Value'] || '',
                        text: e['@_Text'] || '',
                        selectByDefault: e['@_SelectByDefault'] === 'true',
                    })
                ),
            } : undefined,
            predicateValidationReference: claimType.PredicateValidationReference?.['@_Id'],
        };

        this.addEntity(entities.claimTypes, id, entity);
        context.processedEntityIds.add(`ClaimType:${id}`);
    }

    /**
     * Extract a ClaimsTransformation entity
     */
    private extractClaimsTransformation(
        /* eslint-disable @typescript-eslint/no-explicit-any */
        transformation: any,
        /* eslint-enable @typescript-eslint/no-explicit-any */
        context: ExtractionContext,
        entities: PolicyEntities
    ): void {
        const id = transformation['@_Id'];
        if (!id) return;

        const entity: ClaimsTransformationEntity = {
            id,
            entityType: 'ClaimsTransformation',
            sourceFile: context.fileName,
            sourcePolicyId: context.policyId,
            xpath: `/TrustFrameworkPolicy/BuildingBlocks/ClaimsTransformations/ClaimsTransformation[@Id="${id}"]`,
            hierarchyDepth: context.hierarchyDepth,
            isOverride: context.processedEntityIds.has(`ClaimsTransformation:${id}`),
            rawXml: JSON.stringify(transformation),
            transformationMethod: transformation['@_TransformationMethod'] || '',
            inputClaims: this.extractClaimReferences(transformation.InputClaims?.InputClaim),
            inputParameters: this.extractInputParameters(transformation.InputParameters?.InputParameter),
            outputClaims: this.extractClaimReferences(transformation.OutputClaims?.OutputClaim),
        };

        this.addEntity(entities.claimsTransformations, id, entity);
        context.processedEntityIds.add(`ClaimsTransformation:${id}`);
    }

    /**
     * Extract a ClaimsProvider entity
     */
    extractClaimsProvider(
        /* eslint-disable @typescript-eslint/no-explicit-any */
        provider: any,
        /* eslint-enable @typescript-eslint/no-explicit-any */
        context: ExtractionContext,
        entities: PolicyEntities
    ): void {
        const displayName = provider.DisplayName || 'Unknown';
        const id = displayName;

        const tpIds: string[] = [];
        if (provider.TechnicalProfiles?.TechnicalProfile) {
            const profiles = ensureArray(provider.TechnicalProfiles.TechnicalProfile);
            for (const profile of profiles) {
                const tpId = profile['@_Id'];
                if (tpId) {
                    tpIds.push(tpId);
                    this.extractTechnicalProfile(profile, context, entities, displayName);
                }
            }
        }

        const entity: ClaimsProviderEntity = {
            id,
            entityType: 'ClaimsProvider',
            sourceFile: context.fileName,
            sourcePolicyId: context.policyId,
            xpath: `/TrustFrameworkPolicy/ClaimsProviders/ClaimsProvider[DisplayName="${displayName}"]`,
            hierarchyDepth: context.hierarchyDepth,
            isOverride: context.processedEntityIds.has(`ClaimsProvider:${id}`),
            rawXml: JSON.stringify(provider),
            displayName,
            technicalProfileIds: tpIds,
        };

        this.addEntity(entities.claimsProviders, id, entity);
        context.processedEntityIds.add(`ClaimsProvider:${id}`);
    }

    /**
     * Extract a TechnicalProfile entity
     */
    extractTechnicalProfile(
        /* eslint-disable @typescript-eslint/no-explicit-any */
        profile: any,
        /* eslint-enable @typescript-eslint/no-explicit-any */
        context: ExtractionContext,
        entities: PolicyEntities,
        claimsProviderDisplayName?: string
    ): void {
        const id = profile['@_Id'];
        if (!id) return;

        const entity: TechnicalProfileEntity = {
            id,
            entityType: 'TechnicalProfile',
            sourceFile: context.fileName,
            sourcePolicyId: context.policyId,
            xpath: `/TrustFrameworkPolicy/ClaimsProviders/ClaimsProvider/TechnicalProfiles/TechnicalProfile[@Id="${id}"]`,
            hierarchyDepth: context.hierarchyDepth,
            isOverride: context.processedEntityIds.has(`TechnicalProfile:${id}`),
            rawXml: JSON.stringify(profile),
            displayName: profile.DisplayName,
            description: profile.Description,
            protocolName: profile.Protocol?.['@_Name'],
            protocolHandler: profile.Protocol?.['@_Handler'],
            providerName: profile.Provider?.['@_Name'],
            claimsProviderDisplayName,
            metadata: this.extractMetadata(profile.Metadata?.Item),
            inputClaimsTransformations: this.extractTransformationReferences(
                profile.InputClaimsTransformations?.InputClaimsTransformation
            ),
            inputClaims: this.extractClaimReferences(profile.InputClaims?.InputClaim),
            displayClaims: this.extractClaimReferences(profile.DisplayClaims?.DisplayClaim),
            displayControls: this.extractDisplayControlReferences(profile.DisplayClaims?.DisplayClaim),
            persistedClaims: this.extractClaimReferences(profile.PersistedClaims?.PersistedClaim),
            outputClaims: this.extractClaimReferences(profile.OutputClaims?.OutputClaim),
            outputClaimsTransformations: this.extractTransformationReferences(
                profile.OutputClaimsTransformations?.OutputClaimsTransformation
            ),
            validationTechnicalProfiles: this.extractValidationProfiles(
                profile.ValidationTechnicalProfiles?.ValidationTechnicalProfile
            ),
            includeTechnicalProfile: profile.IncludeTechnicalProfile?.['@_ReferenceId'],
            inheritanceChain: [],
        };

        this.addEntity(entities.technicalProfiles, id, entity);
        context.processedEntityIds.add(`TechnicalProfile:${id}`);
    }

    /**
     * Extract a UserJourney entity
     */
    private extractUserJourney(
        /* eslint-disable @typescript-eslint/no-explicit-any */
        journey: any,
        /* eslint-enable @typescript-eslint/no-explicit-any */
        context: ExtractionContext,
        entities: PolicyEntities
    ): void {
        const id = journey['@_Id'];
        if (!id) return;

        const entity: UserJourneyEntity = {
            id,
            entityType: 'UserJourney',
            sourceFile: context.fileName,
            sourcePolicyId: context.policyId,
            xpath: `/TrustFrameworkPolicy/UserJourneys/UserJourney[@Id="${id}"]`,
            hierarchyDepth: context.hierarchyDepth,
            isOverride: context.processedEntityIds.has(`UserJourney:${id}`),
            rawXml: JSON.stringify(journey),
            defaultCpimIssuerTechnicalProfileReferenceId: 
                journey.DefaultUserJourneyBehaviors?.FinalJourneyContextRecorder?.['@_TechnicalProfileReferenceId'],
            orchestrationSteps: this.extractOrchestrationSteps(journey.OrchestrationSteps?.OrchestrationStep),
        };

        this.addEntity(entities.userJourneys, id, entity);
        context.processedEntityIds.add(`UserJourney:${id}`);
    }

    /**
     * Extract a SubJourney entity
     */
    private extractSubJourney(
        /* eslint-disable @typescript-eslint/no-explicit-any */
        subJourney: any,
        /* eslint-enable @typescript-eslint/no-explicit-any */
        context: ExtractionContext,
        entities: PolicyEntities
    ): void {
        const id = subJourney['@_Id'];
        if (!id) return;

        const entity: SubJourneyEntity = {
            id,
            entityType: 'SubJourney',
            sourceFile: context.fileName,
            sourcePolicyId: context.policyId,
            xpath: `/TrustFrameworkPolicy/SubJourneys/SubJourney[@Id="${id}"]`,
            hierarchyDepth: context.hierarchyDepth,
            isOverride: context.processedEntityIds.has(`SubJourney:${id}`),
            rawXml: JSON.stringify(subJourney),
            type: subJourney['@_Type'] || '',
            orchestrationSteps: this.extractOrchestrationSteps(subJourney.OrchestrationSteps?.OrchestrationStep),
        };

        this.addEntity(entities.subJourneys, id, entity);
        context.processedEntityIds.add(`SubJourney:${id}`);
    }

    /**
     * Extract from a generic element (used by consolidator)
     */
    extractElement(
        elementName: string,
        /* eslint-disable @typescript-eslint/no-explicit-any */
        element: any,
        /* eslint-enable @typescript-eslint/no-explicit-any */
        context: ExtractionContext,
        entities: PolicyEntities
    ): void {
        switch (elementName) {
            case 'ClaimType':
                this.extractClaimType(element, context, entities);
                break;
            case 'ClaimsTransformation':
                this.extractClaimsTransformation(element, context, entities);
                break;
            case 'UserJourney':
                this.extractUserJourney(element, context, entities);
                break;
            case 'SubJourney':
                this.extractSubJourney(element, context, entities);
                break;
        }
    }

    /**
     * Helper: Extract claim references
     */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    private extractClaimReferences(claims: any): ClaimReferenceInfo[] {
    /* eslint-enable @typescript-eslint/no-explicit-any */
        if (!claims) return [];
        return ensureArray(claims).map((c: Record<string, unknown>) => ({
            claimTypeReferenceId: c['@_ClaimTypeReferenceId'] as string | undefined,
            partnerClaimType: c['@_PartnerClaimType'] as string | undefined,
            defaultValue: c['@_DefaultValue'] as string | undefined,
            alwaysUseDefaultValue: c['@_AlwaysUseDefaultValue'] === 'true',
            required: c['@_Required'] === 'true',
            displayControlReferenceId: c['@_DisplayControlReferenceId'] as string | undefined,
        }));
    }

    /**
     * Helper: Extract metadata items
     */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    private extractMetadata(items: any): MetadataItemInfo[] {
    /* eslint-enable @typescript-eslint/no-explicit-any */
        if (!items) return [];
        return ensureArray(items).map((item: Record<string, unknown>) => ({
            key: (item['@_Key'] as string) || '',
            value: (item['#text'] as string) || (item as unknown as string) || '',
        }));
    }

    /**
     * Helper: Extract input parameters
     */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    private extractInputParameters(params: any): InputParameterInfo[] {
    /* eslint-enable @typescript-eslint/no-explicit-any */
        if (!params) return [];
        return ensureArray(params).map((p: Record<string, unknown>) => ({
            id: (p['@_Id'] as string) || '',
            dataType: (p['@_DataType'] as string) || '',
            value: (p['@_Value'] as string) || '',
        }));
    }

    /**
     * Helper: Extract transformation references
     */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    private extractTransformationReferences(transformations: any): string[] {
    /* eslint-enable @typescript-eslint/no-explicit-any */
        if (!transformations) return [];
        return ensureArray(transformations).map(
            (t: Record<string, unknown>) => (t['@_ReferenceId'] as string) || ''
        ).filter(Boolean);
    }

    /**
     * Helper: Extract display control references
     */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    private extractDisplayControlReferences(displayClaims: any): string[] {
    /* eslint-enable @typescript-eslint/no-explicit-any */
        if (!displayClaims) return [];
        return ensureArray(displayClaims)
            .filter((dc: Record<string, unknown>) => dc['@_DisplayControlReferenceId'])
            .map((dc: Record<string, unknown>) => dc['@_DisplayControlReferenceId'] as string);
    }

    /**
     * Helper: Extract validation profile references
     */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    private extractValidationProfiles(profiles: any): string[] {
    /* eslint-enable @typescript-eslint/no-explicit-any */
        if (!profiles) return [];
        return ensureArray(profiles).map(
            (p: Record<string, unknown>) => (p['@_ReferenceId'] as string) || ''
        ).filter(Boolean);
    }

    /**
     * Helper: Extract orchestration steps
     */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    private extractOrchestrationSteps(steps: any): OrchestrationStepInfo[] {
    /* eslint-enable @typescript-eslint/no-explicit-any */
        if (!steps) return [];
        return ensureArray(steps).map((step: Record<string, unknown>) => ({
            order: parseInt((step['@_Order'] as string) || '0', 10),
            type: (step['@_Type'] as string) || '',
            contentDefinitionReferenceId: step['@_ContentDefinitionReferenceId'] as string | undefined,
            claimsExchanges: this.extractClaimsExchanges(
                (step.ClaimsExchanges as Record<string, unknown>)?.ClaimsExchange
            ),
            preconditions: this.extractPreconditions(
                (step.Preconditions as Record<string, unknown>)?.Precondition
            ),
        }));
    }

    /**
     * Helper: Extract claims exchanges
     */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    private extractClaimsExchanges(exchanges: any): ClaimsExchangeInfo[] {
    /* eslint-enable @typescript-eslint/no-explicit-any */
        if (!exchanges) return [];
        return ensureArray(exchanges).map((ex: Record<string, unknown>) => ({
            id: (ex['@_Id'] as string) || '',
            technicalProfileReferenceId: (ex['@_TechnicalProfileReferenceId'] as string) || '',
        }));
    }

    /**
     * Helper: Extract preconditions
     */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    private extractPreconditions(preconditions: any): PreconditionInfo[] {
    /* eslint-enable @typescript-eslint/no-explicit-any */
        if (!preconditions) return [];
        return ensureArray(preconditions).map((pc: Record<string, unknown>) => ({
            type: (pc['@_Type'] as string) || '',
            executeActionsIf: pc['@_ExecuteActionsIf'] === 'true',
            values: ensureArray((pc.Value as unknown) || []).map((v: unknown) => String(v)),
            action: (pc.Action as string) || '',
        }));
    }

    /**
     * Helper: Add entity to dictionary (preserves array for inheritance)
     */
    private addEntity<T>(
        dict: Record<string, T[]>,
        id: string,
        entity: T
    ): void {
        if (!dict[id]) {
            dict[id] = [];
        }
        dict[id].push(entity);
    }
}
