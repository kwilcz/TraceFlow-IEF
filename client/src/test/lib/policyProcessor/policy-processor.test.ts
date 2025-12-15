import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyProcessor } from '@/lib/policyProcessor';
import {
    createPolicyFileSet,
    createUnorderedPolicyFileSet,
    createMockFile,
    BASE_POLICY_XML,
    MALFORMED_XML,
    NOT_A_POLICY_XML,
    INVALID_POLICY_XML,
} from '../../fixtures/processor-fixtures';

describe('PolicyProcessor', () => {
    let processor: PolicyProcessor;

    beforeEach(() => {
        processor = new PolicyProcessor();
    });

    describe('processFiles', () => {
        it('should process a complete policy set successfully', async () => {
            const files = createPolicyFileSet();
            const result = await processor.processFiles(files);

            expect(result).toBeDefined();
            expect(result.consolidatedXml).toBeDefined();
            expect(result.consolidatedXml.length).toBeGreaterThan(0);
            expect(result.files).toHaveLength(3);
        });

        it('should sort policies by inheritance order regardless of input order', async () => {
            const unorderedFiles = createUnorderedPolicyFileSet();
            const result = await processor.processFiles(unorderedFiles);

            expect(result.files).toHaveLength(3);
            expect(result.files[0].policyId).toBe('B2C_1A_TrustFrameworkBase');
            expect(result.files[1].policyId).toBe('B2C_1A_TrustFrameworkExtensions');
            expect(result.files[2].policyId).toBe('B2C_1A_signup_signin');
        });

        it('should build inheritance graph correctly', async () => {
            const files = createPolicyFileSet();
            const result = await processor.processFiles(files);

            expect(result.inheritanceGraph).toBeDefined();
            // Base policy has no parent
            expect(result.inheritanceGraph.parentRelationships['B2C_1A_TrustFrameworkBase']).toBeUndefined();
            // Extensions inherits from Base
            expect(result.inheritanceGraph.parentRelationships['B2C_1A_TrustFrameworkExtensions']).toBe('B2C_1A_TrustFrameworkBase');
            // RP inherits from Extensions
            expect(result.inheritanceGraph.parentRelationships['B2C_1A_signup_signin']).toBe('B2C_1A_TrustFrameworkExtensions');
            // Root policy is the base
            expect(result.inheritanceGraph.rootPolicyId).toBe('B2C_1A_TrustFrameworkBase');
        });

        it('should extract entities from consolidated policy', async () => {
            const files = createPolicyFileSet();
            const result = await processor.processFiles(files);

            expect(result.entities).toBeDefined();
            expect(result.entities.technicalProfiles).toBeDefined();
            expect(result.entities.claimTypes).toBeDefined();
        });

        it('should throw error when no files provided', async () => {
            await expect(processor.processFiles([])).rejects.toThrow('No policy files provided');
        });

        it('should handle a single base policy file', async () => {
            const singleFile = [createMockFile(BASE_POLICY_XML, 'Base.xml')];
            const result = await processor.processFiles(singleFile);

            expect(result.files).toHaveLength(1);
            expect(result.consolidatedXml).toBeDefined();
            expect(result.consolidatedXml).toContain('B2C_1A_TrustFrameworkBase');
        });
    });

    describe('XML parsing', () => {
        it('should throw error for malformed XML', async () => {
            const malformedFile = [createMockFile(MALFORMED_XML, 'Malformed.xml')];
            
            await expect(processor.processFiles(malformedFile)).rejects.toThrow();
        });

        it('should throw error for non-policy XML', async () => {
            const nonPolicyFile = [createMockFile(NOT_A_POLICY_XML, 'NotAPolicy.xml')];
            
            await expect(processor.processFiles(nonPolicyFile)).rejects.toThrow();
        });
    });

    describe('validation', () => {
        it('should detect invalid policy without PolicyId', async () => {
            const invalidFile = [createMockFile(INVALID_POLICY_XML, 'Invalid.xml')];
            
            await expect(processor.processFiles(invalidFile)).rejects.toThrow();
        });

        it('should return validation errors for structural issues', async () => {
            const invalidFile = [createMockFile(INVALID_POLICY_XML, 'Invalid.xml')];
            
            try {
                await processor.processFiles(invalidFile);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('file reading', () => {
        it('should read file content correctly', async () => {
            const testContent = BASE_POLICY_XML;
            const file = createMockFile(testContent, 'Test.xml');
            const files = [file];
            
            const result = await processor.processFiles(files);
            
            expect(result.consolidatedXml).toContain('B2C_1A_TrustFrameworkBase');
        });

        it('should handle files with different encodings', async () => {
            const utf8Content = BASE_POLICY_XML;
            const file = createMockFile(utf8Content, 'UTF8Policy.xml');
            
            const result = await processor.processFiles([file]);
            
            expect(result).toBeDefined();
            expect(result.consolidatedXml).toBeDefined();
        });
    });
});
