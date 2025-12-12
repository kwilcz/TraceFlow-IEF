/**
 * @module PolicyConsolidator
 * 
 * Merges multiple Azure AD B2C custom policy files into a single consolidated policy.
 * Implements XML inheritance merging where child policies extend and override base policies.
 * 
 * B2C policies support inheritance through the BasePolicy element. This module
 * processes policies in inheritance order (base → extensions) and merges:
 * - BuildingBlocks (ClaimsSchema, ClaimsTransformations, ContentDefinitions)
 * - ClaimsProviders and TechnicalProfiles
 * - UserJourneys and SubJourneys
 * - RelyingParty configuration
 */

import { XMLBuilder } from 'fast-xml-parser';
import type { 
    ParsedPolicy, 
    PolicyFileMetadata, 
    ConsolidationResult,
    ExtractionContext 
} from './types/processor-types';
import type { PolicyEntities } from '@/types/trust-framework-entities';
import { EntityExtractor } from './extractors/entity-extractor';
import { ensureArray } from '@/lib/utils';

/**
 * Consolidates B2C custom policies by merging inheritance chains.
 * 
 * Processes policies in order (base first) and applies inheritance rules:
 * - Elements with matching IDs in child policies override parent elements
 * - New elements in child policies are added to the consolidated result
 * - Extracts all entities (Claims, TPs, UserJourneys) during consolidation
 */
export class PolicyConsolidator {
    private entityExtractor: EntityExtractor;
    private xmlBuilder: XMLBuilder;

    constructor() {
        this.entityExtractor = new EntityExtractor();
        this.xmlBuilder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            format: true,
            indentBy: '  ',
            suppressEmptyNode: true,
        });
    }

    /**
     * Consolidate multiple policies into a single merged policy.
     * 
     * @param policyFiles - Policies sorted by inheritance order (base first)
     * @returns Consolidated XML, parsed policy, and extracted entities
     */
    consolidate(policyFiles: PolicyFileMetadata[]): ConsolidationResult {
        const entities: PolicyEntities = this.createEmptyEntities();
        const processedEntityIds = new Set<string>();

        let consolidatedPolicy: ParsedPolicy | null = null;

        for (const policyFile of policyFiles) {
            const context: ExtractionContext = {
                fileName: policyFile.fileName,
                policyId: policyFile.policyId,
                hierarchyDepth: policyFile.hierarchyDepth,
                processedEntityIds,
            };

            if (consolidatedPolicy === null) {
                consolidatedPolicy = this.deepClone(policyFile.parsed);
                this.entityExtractor.extractFromPolicy(
                    consolidatedPolicy,
                    context,
                    entities
                );
            } else {
                consolidatedPolicy = this.mergePolicies(
                    consolidatedPolicy,
                    policyFile.parsed,
                    context,
                    entities
                );
            }
        }

        if (consolidatedPolicy === null) {
            return {
                consolidatedXml: '',
                consolidatedPolicy: { TrustFrameworkPolicy: {} } as ParsedPolicy,
                entities,
            };
        }

        const finalContext: ExtractionContext = {
            fileName: 'ConsolidatedPolicy',
            policyId: 'ConsolidatedPolicy',
            hierarchyDepth: policyFiles.length,
            processedEntityIds,
        };

        this.entityExtractor.extractFromPolicy(
            consolidatedPolicy,
            finalContext,
            entities
        );

        return {
            consolidatedXml: this.policyToXml(consolidatedPolicy),
            consolidatedPolicy,
            entities,
        };
    }

    /**
     * Merge two policies together
     */
    private mergePolicies(
        base: ParsedPolicy,
        child: ParsedPolicy,
        context: ExtractionContext,
        entities: PolicyEntities
    ): ParsedPolicy {
        const merged = this.deepClone(base);
        const childTfp = child.TrustFrameworkPolicy;

        this.mergeBuildingBlocks(merged, childTfp, context, entities);
        this.mergeClaimsProviders(merged, childTfp, context, entities);
        this.mergeUserJourneys(merged, childTfp, context, entities);
        this.mergeSubJourneys(merged, childTfp, context, entities);

        if (childTfp.RelyingParty) {
            merged.TrustFrameworkPolicy.RelyingParty = childTfp.RelyingParty;
        }

        return merged;
    }

    /**
     * Merge BuildingBlocks section
     */
    private mergeBuildingBlocks(
        merged: ParsedPolicy,
        childTfp: ParsedPolicy['TrustFrameworkPolicy'],
        context: ExtractionContext,
        entities: PolicyEntities
    ): void {
        if (!childTfp.BuildingBlocks) return;

        if (!merged.TrustFrameworkPolicy.BuildingBlocks) {
            merged.TrustFrameworkPolicy.BuildingBlocks = {};
        }

        const mergedBb = merged.TrustFrameworkPolicy.BuildingBlocks;
        const childBb = childTfp.BuildingBlocks;

        if (childBb.ClaimsSchema?.ClaimType) {
            this.mergeById(
                mergedBb,
                'ClaimsSchema',
                'ClaimType',
                childBb.ClaimsSchema.ClaimType,
                '@_Id',
                context,
                entities
            );
        }

        if (childBb.ClaimsTransformations?.ClaimsTransformation) {
            this.mergeById(
                mergedBb,
                'ClaimsTransformations',
                'ClaimsTransformation',
                childBb.ClaimsTransformations.ClaimsTransformation,
                '@_Id',
                context,
                entities
            );
        }

        if (childBb.Localization) {
            this.mergeLocalization(mergedBb, childBb.Localization, context, entities);
        }
    }

    /**
     * Merge ClaimsProviders section
     */
    private mergeClaimsProviders(
        merged: ParsedPolicy,
        childTfp: ParsedPolicy['TrustFrameworkPolicy'],
        context: ExtractionContext,
        entities: PolicyEntities
    ): void {
        if (!childTfp.ClaimsProviders?.ClaimsProvider) return;

        if (!merged.TrustFrameworkPolicy.ClaimsProviders) {
            merged.TrustFrameworkPolicy.ClaimsProviders = { ClaimsProvider: [] };
        }

        const mergedProviders = ensureArray(
            merged.TrustFrameworkPolicy.ClaimsProviders.ClaimsProvider
        );
        const childProviders = ensureArray(childTfp.ClaimsProviders.ClaimsProvider);

        for (const childProvider of childProviders) {
            const displayName = childProvider.DisplayName;
            const existingIdx = mergedProviders.findIndex(
                (p: unknown) => (p as { DisplayName?: string }).DisplayName === displayName
            );

            if (existingIdx >= 0) {
                this.mergeProvider(mergedProviders[existingIdx], childProvider, context, entities);
            } else {
                mergedProviders.push(this.deepClone(childProvider));
                this.entityExtractor.extractClaimsProvider(childProvider, context, entities);
            }
        }

        merged.TrustFrameworkPolicy.ClaimsProviders.ClaimsProvider = mergedProviders;
    }

    /**
     * Merge technical profiles within a claims provider
     */
    private mergeProvider(
        base: { TechnicalProfiles?: { TechnicalProfile?: unknown[] }; [key: string]: unknown },
        child: { TechnicalProfiles?: { TechnicalProfile?: unknown[] }; [key: string]: unknown },
        context: ExtractionContext,
        entities: PolicyEntities
    ): void {
        if (!child.TechnicalProfiles?.TechnicalProfile) return;

        if (!base.TechnicalProfiles) {
            base.TechnicalProfiles = { TechnicalProfile: [] };
        }

        const baseTps = ensureArray(base.TechnicalProfiles.TechnicalProfile);
        const childTps = ensureArray(child.TechnicalProfiles.TechnicalProfile);

        for (const childTp of childTps) {
            const tpId = (childTp as { '@_Id'?: string })['@_Id'];
            const existingIdx = baseTps.findIndex(
                (tp: unknown) => (tp as { '@_Id'?: string })['@_Id'] === tpId
            );

            if (existingIdx >= 0) {
                baseTps[existingIdx] = this.mergeElement(baseTps[existingIdx], childTp);
            } else {
                baseTps.push(this.deepClone(childTp));
            }

            this.entityExtractor.extractTechnicalProfile(childTp, context, entities);
        }

        base.TechnicalProfiles.TechnicalProfile = baseTps;
    }

    /**
     * Merge UserJourneys section
     */
    private mergeUserJourneys(
        merged: ParsedPolicy,
        childTfp: ParsedPolicy['TrustFrameworkPolicy'],
        context: ExtractionContext,
        entities: PolicyEntities
    ): void {
        if (!childTfp.UserJourneys?.UserJourney) return;

        if (!merged.TrustFrameworkPolicy.UserJourneys) {
            merged.TrustFrameworkPolicy.UserJourneys = { UserJourney: [] };
        }

        this.mergeById(
            merged.TrustFrameworkPolicy,
            'UserJourneys',
            'UserJourney',
            childTfp.UserJourneys.UserJourney,
            '@_Id',
            context,
            entities
        );
    }

    /**
     * Merge SubJourneys section
     */
    private mergeSubJourneys(
        merged: ParsedPolicy,
        childTfp: ParsedPolicy['TrustFrameworkPolicy'],
        context: ExtractionContext,
        entities: PolicyEntities
    ): void {
        if (!childTfp.SubJourneys?.SubJourney) return;

        if (!merged.TrustFrameworkPolicy.SubJourneys) {
            merged.TrustFrameworkPolicy.SubJourneys = { SubJourney: [] };
        }

        this.mergeById(
            merged.TrustFrameworkPolicy,
            'SubJourneys',
            'SubJourney',
            childTfp.SubJourneys.SubJourney,
            '@_Id',
            context,
            entities
        );
    }

    /**
     * Generic merge by ID
     */
    private mergeById(
        /* eslint-disable @typescript-eslint/no-explicit-any */
        parent: any,
        containerName: string,
        elementName: string,
        childElements: any | any[],
        idAttribute: string,
        context: ExtractionContext,
        entities: PolicyEntities
        /* eslint-enable @typescript-eslint/no-explicit-any */
    ): void {
        if (!parent[containerName]) {
            parent[containerName] = { [elementName]: [] };
        }

        const container = parent[containerName];
        if (!container[elementName]) {
            container[elementName] = [];
        }

        const baseElements = ensureArray(container[elementName]);
        const children = ensureArray(childElements);

        for (const child of children) {
            const childId = child[idAttribute];
            const existingIdx = baseElements.findIndex(
                (el: unknown) => (el as Record<string, unknown>)[idAttribute] === childId
            );

            if (existingIdx >= 0) {
                baseElements[existingIdx] = this.mergeElement(baseElements[existingIdx], child);
            } else {
                baseElements.push(this.deepClone(child));
            }

            this.entityExtractor.extractElement(elementName, child, context, entities);
        }

        container[elementName] = baseElements;
    }

    /**
     * Merge localization (special handling for SupportedLanguages)
     */
    private mergeLocalization(
        /* eslint-disable @typescript-eslint/no-explicit-any */
        mergedBb: any,
        childLocalization: any,
        _context: ExtractionContext,
        _entities: PolicyEntities
        /* eslint-enable @typescript-eslint/no-explicit-any */
    ): void {
        if (!mergedBb.Localization) {
            mergedBb.Localization = this.deepClone(childLocalization);
            return;
        }

        if (childLocalization.SupportedLanguages?.SupportedLanguage) {
            if (!mergedBb.Localization.SupportedLanguages) {
                mergedBb.Localization.SupportedLanguages = { SupportedLanguage: [] };
            }

            const baseLangs = ensureArray(mergedBb.Localization.SupportedLanguages.SupportedLanguage);
            const childLangs = ensureArray(childLocalization.SupportedLanguages.SupportedLanguage);

            for (const childLang of childLangs) {
                const exists = baseLangs.some(
                    (l: unknown) => JSON.stringify(l) === JSON.stringify(childLang)
                );
                if (!exists) {
                    baseLangs.push(this.deepClone(childLang));
                }
            }

            mergedBb.Localization.SupportedLanguages.SupportedLanguage = baseLangs;
        }

        if (childLocalization.LocalizedResources) {
            if (!mergedBb.Localization.LocalizedResources) {
                mergedBb.Localization.LocalizedResources = this.deepClone(childLocalization.LocalizedResources);
            }
        }
    }

    /**
     * Merge two elements (child attributes override base)
     */
    private mergeElement<T>(base: T, child: T): T {
        const merged = this.deepClone(base);

        for (const key of Object.keys(child as object)) {
            const childValue = (child as Record<string, unknown>)[key];
            (merged as Record<string, unknown>)[key] = this.deepClone(childValue);
        }

        return merged;
    }

    /**
     * Deep clone an object
     */
    private deepClone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Convert parsed policy back to XML string
     */
    private policyToXml(policy: ParsedPolicy): string {
        const xmlDeclaration = '<?xml version="1.0" encoding="utf-8"?>\n';
        
        // Remove ?xml declaration from parsed object if present (it gets added by parser)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const policyWithoutXmlDecl = { ...policy } as any;
        if (policyWithoutXmlDecl['?xml']) {
            delete policyWithoutXmlDecl['?xml'];
        }
        
        const xmlContent = this.xmlBuilder.build(policyWithoutXmlDecl);
        return xmlDeclaration + xmlContent;
    }

    /**
     * Create empty entities structure
     */
    private createEmptyEntities(): PolicyEntities {
        return {
            claimTypes: {},
            technicalProfiles: {},
            claimsTransformations: {},
            displayControls: {},
            userJourneys: {},
            subJourneys: {},
            claimsProviders: {},
        };
    }
}
