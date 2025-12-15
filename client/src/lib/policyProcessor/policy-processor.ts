/**
 * @module PolicyProcessor
 * 
 * Orchestrates the processing pipeline for Azure AD B2C custom policy files.
 * Handles XML parsing, validation, inheritance resolution, and entity extraction.
 * 
 * @example
 * ```typescript
 * const processor = new PolicyProcessor();
 * const result = await processor.processFiles(policyFiles);
 * console.log(result.consolidatedXml);
 * console.log(result.entities.technicalProfiles);
 * ```
 */

import { XMLParser } from 'fast-xml-parser';
import type { 
    ParsedPolicy, 
    PolicyFileMetadata, 
    ProcessedPolicyResult,
    ValidationError 
} from './types/processor-types';
import type { PolicyFileInfo, PolicyInheritanceGraph } from '@/types/policy-store';
import { PolicyValidator } from './policy-validator';
import { PolicyConsolidator } from './policy-consolidator';

/**
 * Processes Azure AD B2C custom policy XML files.
 * 
 * Handles the complete pipeline from raw XML files to consolidated policy
 * with extracted entities. Supports multiple files with inheritance chains.
 */
export class PolicyProcessor {
    private xmlParser: XMLParser;
    private validator: PolicyValidator;
    private consolidator: PolicyConsolidator;

    constructor() {
        this.xmlParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            preserveOrder: false,
        });
        this.validator = new PolicyValidator();
        this.consolidator = new PolicyConsolidator();
    }

    /**
     * Process multiple B2C custom policy files.
     * 
     * @param files - Array of policy XML files to process
     * @returns Consolidated XML and extracted entities
     * @throws {Error} When no files provided or all files fail validation
     */
    async processFiles(files: File[]): Promise<ProcessedPolicyResult> {
        if (files.length === 0) {
            throw new Error('No policy files provided');
        }

        const policyFiles: PolicyFileMetadata[] = [];
        const allErrors: ValidationError[] = [];

        for (const file of files) {
            const content = await this.readFile(file);
            const parsed = this.parseXml(content);
            
            const validationResult = this.validator.validate(parsed, file.name);
            allErrors.push(...validationResult.errors);

            if (!validationResult.isValid) {
                continue;
            }

            const policyId = parsed.TrustFrameworkPolicy['@_PolicyId'] || file.name;
            const basePolicyId = parsed.TrustFrameworkPolicy.BasePolicy?.PolicyId || null;

            policyFiles.push({
                fileName: file.name,
                policyId,
                basePolicyId,
                content,
                parsed,
                hierarchyDepth: 0,
            });
        }

        if (policyFiles.length === 0) {
            throw new Error(`All policy files failed validation: ${allErrors.map(e => e.message).join('; ')}`);
        }

        const sortedPolicies = this.sortByInheritance(policyFiles);

        sortedPolicies.forEach((policy, index) => {
            policy.hierarchyDepth = index;
        });

        const consolidationResult = this.consolidator.consolidate(sortedPolicies);

        const inheritanceGraph = this.buildInheritanceGraph(sortedPolicies);

        const fileInfos = this.buildFileInfos(sortedPolicies);

        return {
            files: fileInfos,
            inheritanceGraph,
            entities: consolidationResult.entities,
            consolidatedXml: consolidationResult.consolidatedXml,
            validationErrors: allErrors.length > 0 ? allErrors : undefined,
        };
    }

    /**
     * Read file content as text using FileReader API.
     * 
     * @param file - File object to read
     * @returns Promise resolving to file content as string
     */
    private async readFile(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsText(file);
        });
    }

    /**
     * Parse XML content into a structured object.
     * 
     * @param content - Raw XML string
     * @returns Parsed policy object
     * @throws {Error} When XML content is empty
     */
    private parseXml(content: string): ParsedPolicy {
        if (!content.trim()) {
            throw new Error('XML content is empty');
        }
        
        return this.xmlParser.parse(content) as ParsedPolicy;
    }

    /**
     * Sort policies by inheritance hierarchy using topological sort.
     * Base policies (no parent) are placed first, followed by their extensions.
     * 
     * @param policyFiles - Unsorted policy files
     * @returns Policies sorted from base to most derived
     */
    private sortByInheritance(policyFiles: PolicyFileMetadata[]): PolicyFileMetadata[] {
        const sorted: PolicyFileMetadata[] = [];
        const remaining = [...policyFiles];
        const maxIterations = policyFiles.length * 2;
        let iterations = 0;

        const root = remaining.find(p => p.basePolicyId === null);
        if (root) {
            sorted.push(root);
            remaining.splice(remaining.indexOf(root), 1);
        }

        while (remaining.length > 0 && iterations < maxIterations) {
            iterations++;
            let added = false;

            for (let i = 0; i < remaining.length; i++) {
                const policy = remaining[i];
                
                const baseIsSorted = sorted.some(s => s.policyId === policy.basePolicyId);
                
                if (baseIsSorted || policy.basePolicyId === null) {
                    sorted.push(policy);
                    remaining.splice(i, 1);
                    added = true;
                    break;
                }
            }

            if (!added && remaining.length > 0) {
                sorted.push(remaining[0]);
                remaining.splice(0, 1);
            }
        }

        return sorted;
    }

    /**
     * Build inheritance graph representing parent-child relationships.
     * 
     * @param policyFiles - Sorted policy files
     * @returns Graph with root, parents, children, and depth info
     */
    private buildInheritanceGraph(policyFiles: PolicyFileMetadata[]): PolicyInheritanceGraph {
        const graph: PolicyInheritanceGraph = {
            rootPolicyId: null,
            parentRelationships: {},
            childRelationships: {},
            hierarchyDepth: {},
        };

        for (const policy of policyFiles) {
            const policyId = policy.policyId;
            const basePolicyId = policy.basePolicyId;

            graph.hierarchyDepth[policyId] = policy.hierarchyDepth;

            if (basePolicyId) {
                graph.parentRelationships[policyId] = basePolicyId;

                if (!graph.childRelationships[basePolicyId]) {
                    graph.childRelationships[basePolicyId] = [];
                }
                graph.childRelationships[basePolicyId].push(policyId);
            } else {
                graph.rootPolicyId = policyId;
            }
        }

        return graph;
    }

    /**
     * Build file info array for store consumption.
     * 
     * @param policyFiles - Processed policy files
     * @returns Array of PolicyFileInfo objects with metadata
     */
    private buildFileInfos(policyFiles: PolicyFileMetadata[]): PolicyFileInfo[] {
        return policyFiles.map(policy => ({
            fileName: policy.fileName,
            policyId: policy.policyId,
            content: policy.content,
            basePolicy: policy.basePolicyId,
            fileSize: new Blob([policy.content]).size,
            uploadedAt: new Date().toISOString(),
        }));
    }
}
