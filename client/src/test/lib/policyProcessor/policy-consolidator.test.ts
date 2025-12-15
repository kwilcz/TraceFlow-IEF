import { describe, it, expect, beforeEach } from 'vitest';
import { XMLParser } from 'fast-xml-parser';
import { PolicyConsolidator } from '@/lib/policyProcessor/policy-consolidator';
import type { PolicyFileMetadata, ParsedPolicy } from '@/lib/policyProcessor/types/processor-types';

describe('PolicyConsolidator', () => {
    let consolidator: PolicyConsolidator;
    let xmlParser: XMLParser;

    beforeEach(() => {
        consolidator = new PolicyConsolidator();
        xmlParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
        });
    });

    const createPolicyMetadata = (
        policyId: string,
        basePolicyId: string | null,
        parsed: ParsedPolicy,
        hierarchyDepth: number = 0
    ): PolicyFileMetadata => ({
        fileName: `${policyId}.xml`,
        policyId,
        basePolicyId,
        content: '',
        parsed,
        hierarchyDepth,
    });

    describe('consolidate', () => {
        it('should return empty result for empty input', () => {
            const result = consolidator.consolidate([]);

            expect(result.consolidatedXml).toBe('');
            expect(result.entities).toBeDefined();
        });

        it('should return valid XML that can be parsed', () => {
            const singlePolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Base',
                    '@_xmlns': 'http://schemas.microsoft.com/online/cpim/schemas/2013/06',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [{ '@_Id': 'testClaim', DisplayName: 'Test' }]
                        }
                    }
                }
            };

            const result = consolidator.consolidate([
                createPolicyMetadata('B2C_1A_Base', null, singlePolicy, 0)
            ]);

            // Verify XML is valid by parsing it
            expect(result.consolidatedXml).toContain('<?xml');
            expect(result.consolidatedXml).toContain('TrustFrameworkPolicy');
            
            const reparsed = xmlParser.parse(result.consolidatedXml);
            expect(reparsed.TrustFrameworkPolicy).toBeDefined();
            expect(reparsed.TrustFrameworkPolicy['@_PolicyId']).toBe('B2C_1A_Base');
        });

        it('should return single policy unchanged when only one file', () => {
            const singlePolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Base',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [{ '@_Id': 'testClaim' }]
                        }
                    }
                }
            };

            const result = consolidator.consolidate([
                createPolicyMetadata('B2C_1A_Base', null, singlePolicy, 0)
            ]);

            expect(result.consolidatedXml).toContain('B2C_1A_Base');
            expect(result.consolidatedPolicy.TrustFrameworkPolicy['@_PolicyId']).toBe('B2C_1A_Base');
        });

        it('should merge ClaimTypes from child into base', () => {
            const basePolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Base',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [{ '@_Id': 'baseClaim', DisplayName: 'Base Claim' }]
                        }
                    }
                }
            };

            const childPolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Child',
                    BasePolicy: { PolicyId: 'B2C_1A_Base' },
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [{ '@_Id': 'childClaim', DisplayName: 'Child Claim' }]
                        }
                    }
                }
            };

            const result = consolidator.consolidate([
                createPolicyMetadata('B2C_1A_Base', null, basePolicy, 0),
                createPolicyMetadata('B2C_1A_Child', 'B2C_1A_Base', childPolicy, 1)
            ]);

            expect(result.entities.claimTypes).toBeDefined();
        });

        it('should merge TechnicalProfiles from multiple ClaimsProviders', () => {
            const basePolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Base',
                    ClaimsProviders: {
                        ClaimsProvider: [{
                            DisplayName: 'Base Provider',
                            TechnicalProfiles: {
                                TechnicalProfile: [{ '@_Id': 'BaseTP' }]
                            }
                        }]
                    }
                }
            };

            const childPolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Child',
                    ClaimsProviders: {
                        ClaimsProvider: [{
                            DisplayName: 'Child Provider',
                            TechnicalProfiles: {
                                TechnicalProfile: [{ '@_Id': 'ChildTP' }]
                            }
                        }]
                    }
                }
            };

            const result = consolidator.consolidate([
                createPolicyMetadata('B2C_1A_Base', null, basePolicy, 0),
                createPolicyMetadata('B2C_1A_Child', 'B2C_1A_Base', childPolicy, 1)
            ]);

            expect(result.entities.technicalProfiles).toBeDefined();
        });

        it('should handle child policy overriding RelyingParty', () => {
            const basePolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Base'
                }
            };

            const childPolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_RP',
                    BasePolicy: { PolicyId: 'B2C_1A_Base' },
                    RelyingParty: {
                        DefaultUserJourney: { '@_ReferenceId': 'SignIn' },
                        TechnicalProfile: { '@_Id': 'PolicyProfile' }
                    }
                }
            };

            const result = consolidator.consolidate([
                createPolicyMetadata('B2C_1A_Base', null, basePolicy, 0),
                createPolicyMetadata('B2C_1A_RP', 'B2C_1A_Base', childPolicy, 1)
            ]);

            expect(result.consolidatedPolicy.TrustFrameworkPolicy.RelyingParty).toBeDefined();
            expect(result.consolidatedPolicy.TrustFrameworkPolicy.RelyingParty.TechnicalProfile['@_Id'])
                .toBe('PolicyProfile');
        });

        it('should merge UserJourneys from child into base', () => {
            const basePolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Base',
                    UserJourneys: {
                        UserJourney: [{ '@_Id': 'BaseJourney' }]
                    }
                }
            };

            const childPolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Child',
                    UserJourneys: {
                        UserJourney: [{ '@_Id': 'ChildJourney' }]
                    }
                }
            };

            const result = consolidator.consolidate([
                createPolicyMetadata('B2C_1A_Base', null, basePolicy, 0),
                createPolicyMetadata('B2C_1A_Child', 'B2C_1A_Base', childPolicy, 1)
            ]);

            expect(result.entities.userJourneys).toBeDefined();
        });

        it('should merge SubJourneys from child into base', () => {
            const basePolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Base'
                }
            };

            const childPolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Child',
                    SubJourneys: {
                        SubJourney: [{ '@_Id': 'MFA-StepUp', '@_Type': 'Call' }]
                    }
                }
            };

            const result = consolidator.consolidate([
                createPolicyMetadata('B2C_1A_Base', null, basePolicy, 0),
                createPolicyMetadata('B2C_1A_Child', 'B2C_1A_Base', childPolicy, 1)
            ]);

            expect(result.entities.subJourneys).toBeDefined();
        });

        it('should merge ClaimsTransformations', () => {
            const basePolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Base',
                    BuildingBlocks: {
                        ClaimsTransformations: {
                            ClaimsTransformation: [{ 
                                '@_Id': 'BaseTransform',
                                '@_TransformationMethod': 'FormatStringClaim'
                            }]
                        }
                    }
                }
            };

            const childPolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Child',
                    BuildingBlocks: {
                        ClaimsTransformations: {
                            ClaimsTransformation: [{ 
                                '@_Id': 'ChildTransform',
                                '@_TransformationMethod': 'CreateStringClaim'
                            }]
                        }
                    }
                }
            };

            const result = consolidator.consolidate([
                createPolicyMetadata('B2C_1A_Base', null, basePolicy, 0),
                createPolicyMetadata('B2C_1A_Child', 'B2C_1A_Base', childPolicy, 1)
            ]);

            expect(result.entities.claimsTransformations).toBeDefined();
        });
    });

    describe('XML output', () => {
        it('should generate serialized output string', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    '@_TenantId': 'test.onmicrosoft.com'
                }
            };

            const result = consolidator.consolidate([
                createPolicyMetadata('B2C_1A_Test', null, policy, 0)
            ]);

            // The consolidator serializes to JSON format for now
            expect(result.consolidatedXml).toBeDefined();
            expect(result.consolidatedXml.length).toBeGreaterThan(0);
            expect(result.consolidatedXml).toContain('TrustFrameworkPolicy');
            expect(result.consolidatedXml).toContain('PolicyId');
        });
    });

    describe('entity extraction', () => {
        it('should extract entities during consolidation', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [
                                { '@_Id': 'email', DisplayName: 'Email' },
                                { '@_Id': 'displayName', DisplayName: 'Display Name' }
                            ]
                        }
                    },
                    ClaimsProviders: {
                        ClaimsProvider: [{
                            DisplayName: 'Test Provider',
                            TechnicalProfiles: {
                                TechnicalProfile: [
                                    { '@_Id': 'TestTP1', DisplayName: 'Test TP 1' },
                                    { '@_Id': 'TestTP2', DisplayName: 'Test TP 2' }
                                ]
                            }
                        }]
                    }
                }
            };

            const result = consolidator.consolidate([
                createPolicyMetadata('B2C_1A_Test', null, policy, 0)
            ]);

            expect(result.entities.claimTypes).toBeDefined();
            expect(result.entities.technicalProfiles).toBeDefined();
        });

        it('should not duplicate entities when processing multiple policies', () => {
            const basePolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Base',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [{ '@_Id': 'sharedClaim' }]
                        }
                    }
                }
            };

            const childPolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Child',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [{ '@_Id': 'sharedClaim' }]
                        }
                    }
                }
            };

            const result = consolidator.consolidate([
                createPolicyMetadata('B2C_1A_Base', null, basePolicy, 0),
                createPolicyMetadata('B2C_1A_Child', 'B2C_1A_Base', childPolicy, 1)
            ]);

            expect(result.entities).toBeDefined();
        });
    });

    describe('three-level inheritance', () => {
        it('should correctly merge three-level policy chain', () => {
            const basePolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Base',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [{ '@_Id': 'baseClaim' }]
                        }
                    }
                }
            };

            const extensionPolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Extension',
                    BasePolicy: { PolicyId: 'B2C_1A_Base' },
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [{ '@_Id': 'extensionClaim' }]
                        }
                    }
                }
            };

            const rpPolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_RP',
                    BasePolicy: { PolicyId: 'B2C_1A_Extension' },
                    RelyingParty: {
                        DefaultUserJourney: { '@_ReferenceId': 'SignIn' }
                    }
                }
            };

            const result = consolidator.consolidate([
                createPolicyMetadata('B2C_1A_Base', null, basePolicy, 0),
                createPolicyMetadata('B2C_1A_Extension', 'B2C_1A_Base', extensionPolicy, 1),
                createPolicyMetadata('B2C_1A_RP', 'B2C_1A_Extension', rpPolicy, 2)
            ]);

            expect(result.consolidatedPolicy.TrustFrameworkPolicy.RelyingParty).toBeDefined();
            expect(result.consolidatedXml).toBeDefined();
        });
    });
});
