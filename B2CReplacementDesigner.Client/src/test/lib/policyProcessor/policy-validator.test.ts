import { describe, it, expect } from 'vitest';
import { PolicyValidator } from '@/lib/policyProcessor/policy-validator';
import type { ParsedPolicy } from '@/lib/policyProcessor/types/processor-types';

describe('PolicyValidator', () => {
    const validator = new PolicyValidator();

    describe('validate', () => {
        it('should pass validation for valid policy', () => {
            const validPolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_TestPolicy',
                    '@_TenantId': 'test.onmicrosoft.com',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [
                                { '@_Id': 'objectId', DisplayName: 'Object ID', DataType: 'string' }
                            ]
                        }
                    }
                }
            };

            const result = validator.validate(validPolicy, 'TestPolicy.xml');

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should fail when TrustFrameworkPolicy root is missing', () => {
            const invalidPolicy = {} as ParsedPolicy;

            const result = validator.validate(invalidPolicy, 'Invalid.xml');

            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('Missing TrustFrameworkPolicy');
        });

        it('should fail when PolicyId attribute is missing', () => {
            const policyWithoutId: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_TenantId': 'test.onmicrosoft.com'
                }
            };

            const result = validator.validate(policyWithoutId, 'NoId.xml');

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.message.includes('PolicyId'))).toBe(true);
        });

        it('should fail when BasePolicy exists but PolicyId is missing', () => {
            const policyWithBadBasePolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Child',
                    BasePolicy: {
                        TenantId: 'test.onmicrosoft.com'
                    }
                }
            };

            const result = validator.validate(policyWithBadBasePolicy, 'BadBase.xml');

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.message.includes('BasePolicy'))).toBe(true);
        });
    });

    describe('validateBuildingBlocks', () => {
        it('should fail when ClaimType is missing Id', () => {
            const policyWithBadClaimType: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: { DisplayName: 'Test', DataType: 'string' }
                        }
                    }
                }
            };

            const result = validator.validate(policyWithBadClaimType, 'BadClaim.xml');

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.message.includes('ClaimType missing Id'))).toBe(true);
        });

        it('should fail when ClaimsTransformation is missing Id', () => {
            const policyWithBadTransformation: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    BuildingBlocks: {
                        ClaimsTransformations: {
                            ClaimsTransformation: { 
                                '@_TransformationMethod': 'FormatStringClaim'
                            }
                        }
                    }
                }
            };

            const result = validator.validate(policyWithBadTransformation, 'BadTransform.xml');

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.message.includes('ClaimsTransformation missing Id'))).toBe(true);
        });

        it('should handle array of ClaimTypes', () => {
            const policyWithMultipleClaims: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [
                                { '@_Id': 'claim1', DisplayName: 'Claim 1' },
                                { '@_Id': 'claim2', DisplayName: 'Claim 2' }
                            ]
                        }
                    }
                }
            };

            const result = validator.validate(policyWithMultipleClaims, 'MultipleClaims.xml');

            expect(result.isValid).toBe(true);
        });
    });

    describe('validateClaimsProviders', () => {
        it('should fail when TechnicalProfile is missing Id', () => {
            const policyWithBadTP: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    ClaimsProviders: {
                        ClaimsProvider: {
                            DisplayName: 'Test Provider',
                            TechnicalProfiles: {
                                TechnicalProfile: { DisplayName: 'Missing ID' }
                            }
                        }
                    }
                }
            };

            const result = validator.validate(policyWithBadTP, 'BadTP.xml');

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.message.includes('TechnicalProfile missing Id'))).toBe(true);
        });

        it('should handle multiple ClaimsProviders', () => {
            const policyWithMultipleProviders: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    ClaimsProviders: {
                        ClaimsProvider: [
                            {
                                DisplayName: 'Provider 1',
                                TechnicalProfiles: {
                                    TechnicalProfile: { '@_Id': 'TP1' }
                                }
                            },
                            {
                                DisplayName: 'Provider 2',
                                TechnicalProfiles: {
                                    TechnicalProfile: { '@_Id': 'TP2' }
                                }
                            }
                        ]
                    }
                }
            };

            const result = validator.validate(policyWithMultipleProviders, 'MultipleProviders.xml');

            expect(result.isValid).toBe(true);
        });
    });

    describe('validateUserJourneys', () => {
        it('should fail when UserJourney is missing Id', () => {
            const policyWithBadJourney: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    UserJourneys: {
                        UserJourney: { OrchestrationSteps: {} }
                    }
                }
            };

            const result = validator.validate(policyWithBadJourney, 'BadJourney.xml');

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.message.includes('UserJourney missing Id'))).toBe(true);
        });

        it('should validate multiple UserJourneys', () => {
            const policyWithMultipleJourneys: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    UserJourneys: {
                        UserJourney: [
                            { '@_Id': 'SignIn' },
                            { '@_Id': 'SignUp' }
                        ]
                    }
                }
            };

            const result = validator.validate(policyWithMultipleJourneys, 'MultipleJourneys.xml');

            expect(result.isValid).toBe(true);
        });
    });

    describe('error severity', () => {
        it('should distinguish between errors and warnings', () => {
            const result = validator.validate({} as ParsedPolicy, 'Empty.xml');

            expect(result.errors.every(e => e.severity === 'error' || e.severity === 'warning')).toBe(true);
        });

        it('should include fileName in all errors', () => {
            const result = validator.validate({} as ParsedPolicy, 'TestFile.xml');

            expect(result.errors.every(e => e.fileName === 'TestFile.xml')).toBe(true);
        });
    });
});
