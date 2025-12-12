import { PolicyProcessor } from './policyProcessor';
import type { PolicyUploadResponse } from '@/types/policy-store';

/**
 * Progress information during policy processing.
 */
interface UploadProgress {
    /** Percentage complete (0-100) */
    progress: number;
    /** Name of the file currently being processed */
    fileName?: string;
    /** Current file index (1-based) */
    currentFile: number;
    /** Total number of files to process */
    totalFiles: number;
}

/**
 * Service for processing Azure AD B2C custom policy files.
 * 
 * Provides methods to consolidate multiple policy XML files,
 * resolve inheritance chains, and extract entities.
 * 
 * @example
 * ```typescript
 * const files = [basePolicy, extensionPolicy, relyingParty];
 * const result = await PolicyApiService.consolidatePolicies(files);
 * console.log(result.entities.technicalProfiles);
 * ```
 */
export class PolicyApiService {
    private static processor = new PolicyProcessor();

    /**
     * Process and consolidate policy files.
     * 
     * @param policies - Array of policy XML files
     * @returns Consolidated policy with extracted entities
     * @throws {Error} When no policies provided
     */
    static async consolidatePolicies(policies: File[]): Promise<PolicyUploadResponse> {
        if (policies.length === 0) {
            throw new Error('No policies provided');
        }

        return this.processor.processFiles(policies);
    }

    /**
     * Process policies with progress callback for UI feedback.
     * 
     * @param policies - Array of policy XML files
     * @param onProgress - Callback invoked with progress updates
     * @returns Consolidated policy with extracted entities
     * @throws {Error} When no policies provided
     */
    static async consolidatePoliciesWithProgress(
        policies: File[], 
        onProgress: (progress: UploadProgress) => void
    ): Promise<PolicyUploadResponse> {
        if (policies.length === 0) {
            throw new Error('No policies provided');
        }

        onProgress({
            progress: 10,
            currentFile: 1,
            totalFiles: policies.length,
            fileName: policies[0]?.name,
        });

        const result = await this.processor.processFiles(policies);

        onProgress({
            progress: 100,
            currentFile: policies.length,
            totalFiles: policies.length,
        });

        return result;
    }

    /**
     * Process policies and return only the consolidated XML string.
     * 
     * @param policies - Array of policy XML files
     * @param onProgress - Callback invoked with progress updates
     * @returns Consolidated XML as string, or empty string if no policies
     */
    static async consolidatePoliciesWithProgressRaw(
        policies: File[], 
        onProgress: (progress: UploadProgress) => void
    ): Promise<string> {
        if (policies.length === 0) 
            return '';

        const result = await this.consolidatePoliciesWithProgress(policies, onProgress);
        return result.consolidatedXml;
    }
}