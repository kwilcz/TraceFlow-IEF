/**
 * @module processor-types
 * 
 * TypeScript interfaces for the policy processor module.
 * Defines structures for parsed policies, metadata, and processing results.
 */

import type { PolicyEntities } from '@/types/trust-framework-entities';
import type { PolicyFileInfo, PolicyInheritanceGraph } from '@/types/policy-store';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Parsed B2C policy XML structure.
 * 
 * Represents the TrustFrameworkPolicy XML schema after parsing.
 * Uses `any` for deeply nested elements that vary by policy type.
 */
export interface ParsedPolicy {
    TrustFrameworkPolicy: {
        /** Unique policy identifier */
        '@_PolicyId'?: string;
        /** Azure AD B2C tenant identifier */
        '@_TenantId'?: string;
        /** Parent policy reference for inheritance */
        BasePolicy?: {
            TenantId?: string;
            PolicyId?: string;
        };
        /** Schema definitions: ClaimTypes, Transformations, Localization */
        BuildingBlocks?: {
            ClaimsSchema?: {
                ClaimType?: any | any[];
            };
            ClaimsTransformations?: {
                ClaimsTransformation?: any | any[];
            };
            Localization?: any;
        };
        /** Identity providers and their TechnicalProfiles */
        ClaimsProviders?: {
            ClaimsProvider?: any | any[];
        };
        /** Complete authentication flow definitions */
        UserJourneys?: {
            UserJourney?: any | any[];
        };
        /** Reusable journey fragments */
        SubJourneys?: {
            SubJourney?: any | any[];
        };
        /** Application-specific configuration */
        RelyingParty?: any;
        [key: string]: any;
    };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Internal metadata for a policy file during processing.
 */
export interface PolicyFileMetadata {
    /** Original filename */
    fileName: string;
    /** Policy's unique identifier from XML */
    policyId: string;
    /** Parent policy ID (null for base policies) */
    basePolicyId: string | null;
    /** Raw XML content */
    content: string;
    /** Parsed XML structure */
    parsed: ParsedPolicy;
    /** Position in inheritance chain (0 = base) */
    hierarchyDepth: number;
}

/**
 * Result from the consolidation phase.
 */
export interface ConsolidationResult {
    /** Merged XML as string */
    consolidatedXml: string;
    /** Merged XML as parsed object */
    consolidatedPolicy: ParsedPolicy;
    /** Extracted entities from all policies */
    entities: PolicyEntities;
}

/**
 * Validation result with errors collection.
 */
export interface ValidationResult {
    /** True if no errors (warnings allowed) */
    isValid: boolean;
    /** All validation errors and warnings */
    errors: ValidationError[];
}

/**
 * A single validation error or warning.
 */
export interface ValidationError {
    /** Source file where error occurred */
    fileName: string;
    /** Human-readable error description */
    message: string;
    /** XPath-style location in XML */
    path?: string;
    /** Error severity level */
    severity: 'error' | 'warning';
}

/**
 * Final result from processing policies.
 */
export interface ProcessedPolicyResult {
    /** Metadata for each processed file */
    files: PolicyFileInfo[];
    /** Parent-child relationships between policies */
    inheritanceGraph: PolicyInheritanceGraph;
    /** All extracted entities */
    entities: PolicyEntities;
    /** Consolidated XML output */
    consolidatedXml: string;
    /** Validation errors (if any) */
    validationErrors?: ValidationError[];
}

/**
 * Context passed during entity extraction.
 * Tracks source file and prevents duplicate extraction.
 */
export interface ExtractionContext {
    /** Source filename for attribution */
    fileName: string;
    /** Source policy ID */
    policyId: string;
    /** Position in inheritance chain */
    hierarchyDepth: number;
    /** IDs already processed (prevents duplicates) */
    processedEntityIds: Set<string>;
}
