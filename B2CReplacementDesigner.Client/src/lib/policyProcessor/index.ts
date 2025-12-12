/**
 * @module policyProcessor
 * 
 * Azure AD B2C Custom Policy processing module.
 * 
 * Provides complete policy processing including XML parsing, validation,
 * inheritance resolution, consolidation, and entity extraction.
 * 
 * ## Architecture
 * 
 * Processing follows a pipeline pattern:
 * 1. Parse XML files using fast-xml-parser
 * 2. Validate policy structure against schema rules
 * 3. Sort by inheritance (base policies first)
 * 4. Consolidate policies (merge inheritance chain)
 * 5. Extract entities from consolidated policy
 * 
 * ## Usage
 * 
 * ```typescript
 * import { PolicyProcessor } from '@/lib/policyProcessor';
 * 
 * const processor = new PolicyProcessor();
 * const result = await processor.processFiles([
 *   basePolicyFile,
 *   extensionPolicyFile,
 *   signUpOrSignInFile
 * ]);
 * 
 * // result.consolidatedXml - merged policy XML
 * // result.entities - extracted entities (TPs, Claims, etc.)
 * // result.inheritanceGraph - policy hierarchy
 * ```
 */

export { PolicyProcessor } from './policy-processor';
export { PolicyConsolidator } from './policy-consolidator';
export { PolicyValidator } from './policy-validator';
export type { 
    ProcessedPolicyResult,
    PolicyFileMetadata,
    ConsolidationResult,
    ValidationResult 
} from './types/processor-types';
