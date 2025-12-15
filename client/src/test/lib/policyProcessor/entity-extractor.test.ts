import { describe, it, expect } from 'vitest';
import { EntityExtractor } from '@/lib/policyProcessor/extractors/entity-extractor';
import type { ParsedPolicy, ExtractionContext } from '@/lib/policyProcessor/types/processor-types';
import type { PolicyEntities } from '@/types/trust-framework-entities';

describe('EntityExtractor', () => {
    const extractor = new EntityExtractor();

    const createEmptyEntities = (): PolicyEntities => ({
        claimTypes: {},
        technicalProfiles: {},
        claimsTransformations: {},
        userJourneys: {},
        subJourneys: {},
        claimsProviders: {},
        displayControls: {},
    });

    const createContext = (fileName: string = 'TestPolicy.xml'): ExtractionContext => ({
        fileName,
        policyId: 'B2C_1A_Test',
        hierarchyDepth: 0,
        processedEntityIds: new Set<string>(),
    });

    describe('extractFromPolicy', () => {
        it('should extract entities from all sections', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [{ '@_Id': 'testClaim', DisplayName: 'Test Claim' }]
                        },
                        ClaimsTransformations: {
                            ClaimsTransformation: [{
                                '@_Id': 'testTransform',
                                '@_TransformationMethod': 'FormatStringClaim'
                            }]
                        }
                    },
                    ClaimsProviders: {
                        ClaimsProvider: [{
                            DisplayName: 'Test Provider',
                            TechnicalProfiles: {
                                TechnicalProfile: [{ '@_Id': 'TestTP', DisplayName: 'Test TP' }]
                            }
                        }]
                    },
                    UserJourneys: {
                        UserJourney: [{ '@_Id': 'TestJourney' }]
                    },
                    SubJourneys: {
                        SubJourney: [{ '@_Id': 'TestSubJourney', '@_Type': 'Call' }]
                    }
                }
            };

            const entities = createEmptyEntities();
            const context = createContext();

            extractor.extractFromPolicy(policy, context, entities);

            expect(Object.keys(entities.claimTypes).length).toBeGreaterThan(0);
            expect(Object.keys(entities.technicalProfiles).length).toBeGreaterThan(0);
            expect(Object.keys(entities.claimsTransformations).length).toBeGreaterThan(0);
            expect(Object.keys(entities.userJourneys).length).toBeGreaterThan(0);
            expect(Object.keys(entities.subJourneys).length).toBeGreaterThan(0);
        });

        it('should handle policy with no entities gracefully', () => {
            const emptyPolicy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Empty'
                }
            };

            const entities = createEmptyEntities();
            const context = createContext();

            expect(() => {
                extractor.extractFromPolicy(emptyPolicy, context, entities);
            }).not.toThrow();

            expect(Object.keys(entities.claimTypes).length).toBe(0);
        });
    });

    describe('ClaimType extraction', () => {
        it('should extract ClaimType with all properties', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [{
                                '@_Id': 'email',
                                DisplayName: 'Email Address',
                                DataType: 'string',
                                UserInputType: 'EmailBox',
                                AdminHelpText: 'Admin help',
                                UserHelpText: 'User help',
                            }]
                        }
                    }
                }
            };

            const entities = createEmptyEntities();
            extractor.extractFromPolicy(policy, createContext(), entities);

            const emailClaims = entities.claimTypes['email'];
            expect(emailClaims).toBeDefined();
            expect(emailClaims.length).toBeGreaterThan(0);
            const emailClaim = emailClaims[0];
            expect(emailClaim.id).toBe('email');
            expect(emailClaim.displayName).toBe('Email Address');
            expect(emailClaim.dataType).toBe('string');
            expect(emailClaim.userInputType).toBe('EmailBox');
        });

        it('should extract ClaimType with restriction', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [{
                                '@_Id': 'restrictedClaim',
                                Restriction: {
                                    Pattern: '^[a-z]+$'
                                }
                            }]
                        }
                    }
                }
            };

            const entities = createEmptyEntities();
            extractor.extractFromPolicy(policy, createContext(), entities);

            const claims = entities.claimTypes['restrictedClaim'];
            expect(claims).toBeDefined();
            expect(claims[0].restriction).toBeDefined();
            expect(claims[0].restriction?.pattern).toBe('^[a-z]+$');
        });

        it('should skip ClaimType without Id', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [{ DisplayName: 'No ID' }]
                        }
                    }
                }
            };

            const entities = createEmptyEntities();
            extractor.extractFromPolicy(policy, createContext(), entities);

            expect(Object.keys(entities.claimTypes).length).toBe(0);
        });
    });

    describe('TechnicalProfile extraction', () => {
        it('should extract TechnicalProfile with all properties', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    ClaimsProviders: {
                        ClaimsProvider: [{
                            DisplayName: 'Test Provider',
                            TechnicalProfiles: {
                                TechnicalProfile: [{
                                    '@_Id': 'TestTP',
                                    DisplayName: 'Test Technical Profile',
                                    Protocol: {
                                        '@_Name': 'Proprietary',
                                        '@_Handler': 'Web.TPEngine.Providers.TestProvider'
                                    },
                                    Metadata: {
                                        Item: [
                                            { '@_Key': 'MetaKey1', '#text': 'MetaValue1' }
                                        ]
                                    }
                                }]
                            }
                        }]
                    }
                }
            };

            const entities = createEmptyEntities();
            extractor.extractFromPolicy(policy, createContext(), entities);

            const tps = entities.technicalProfiles['TestTP'];
            expect(tps).toBeDefined();
            expect(tps.length).toBeGreaterThan(0);
            const tp = tps[0];
            expect(tp.id).toBe('TestTP');
            expect(tp.displayName).toBe('Test Technical Profile');
            expect(tp.protocolName).toBe('Proprietary');
        });

        it('should extract multiple TechnicalProfiles from single provider', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    ClaimsProviders: {
                        ClaimsProvider: [{
                            DisplayName: 'Multi TP Provider',
                            TechnicalProfiles: {
                                TechnicalProfile: [
                                    { '@_Id': 'TP1', DisplayName: 'Profile 1' },
                                    { '@_Id': 'TP2', DisplayName: 'Profile 2' },
                                    { '@_Id': 'TP3', DisplayName: 'Profile 3' }
                                ]
                            }
                        }]
                    }
                }
            };

            const entities = createEmptyEntities();
            extractor.extractFromPolicy(policy, createContext(), entities);

            expect(entities.technicalProfiles['TP1']).toBeDefined();
            expect(entities.technicalProfiles['TP2']).toBeDefined();
            expect(entities.technicalProfiles['TP3']).toBeDefined();
        });

        it('should extract TechnicalProfiles from multiple providers', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    ClaimsProviders: {
                        ClaimsProvider: [
                            {
                                DisplayName: 'Provider 1',
                                TechnicalProfiles: {
                                    TechnicalProfile: [{ '@_Id': 'P1_TP1' }]
                                }
                            },
                            {
                                DisplayName: 'Provider 2',
                                TechnicalProfiles: {
                                    TechnicalProfile: [{ '@_Id': 'P2_TP1' }]
                                }
                            }
                        ]
                    }
                }
            };

            const entities = createEmptyEntities();
            extractor.extractFromPolicy(policy, createContext(), entities);

            expect(entities.technicalProfiles['P1_TP1']).toBeDefined();
            expect(entities.technicalProfiles['P2_TP1']).toBeDefined();
        });
    });

    describe('ClaimsTransformation extraction', () => {
        it('should extract ClaimsTransformation with all properties', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    BuildingBlocks: {
                        ClaimsTransformations: {
                            ClaimsTransformation: [{
                                '@_Id': 'CreateDisplayName',
                                '@_TransformationMethod': 'FormatStringMultipleClaims',
                                InputClaims: {
                                    InputClaim: [
                                        { '@_ClaimTypeReferenceId': 'givenName' },
                                        { '@_ClaimTypeReferenceId': 'surname' }
                                    ]
                                },
                                OutputClaims: {
                                    OutputClaim: [
                                        { '@_ClaimTypeReferenceId': 'displayName' }
                                    ]
                                }
                            }]
                        }
                    }
                }
            };

            const entities = createEmptyEntities();
            extractor.extractFromPolicy(policy, createContext(), entities);

            const transforms = entities.claimsTransformations['CreateDisplayName'];
            expect(transforms).toBeDefined();
            expect(transforms.length).toBeGreaterThan(0);
            const transform = transforms[0];
            expect(transform.id).toBe('CreateDisplayName');
            expect(transform.transformationMethod).toBe('FormatStringMultipleClaims');
        });
    });

    describe('UserJourney extraction', () => {
        it('should extract UserJourney with OrchestrationSteps', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    UserJourneys: {
                        UserJourney: [{
                            '@_Id': 'SignIn',
                            OrchestrationSteps: {
                                OrchestrationStep: [
                                    { '@_Order': '1', '@_Type': 'CombinedSignInAndSignUp' },
                                    { '@_Order': '2', '@_Type': 'ClaimsExchange' },
                                    { '@_Order': '3', '@_Type': 'SendClaims' }
                                ]
                            }
                        }]
                    }
                }
            };

            const entities = createEmptyEntities();
            extractor.extractFromPolicy(policy, createContext(), entities);

            const journeys = entities.userJourneys['SignIn'];
            expect(journeys).toBeDefined();
            expect(journeys.length).toBeGreaterThan(0);
            const journey = journeys[0];
            expect(journey.id).toBe('SignIn');
            expect(journey.orchestrationSteps.length).toBe(3);
        });

        it('should extract UserJourney with Preconditions', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    UserJourneys: {
                        UserJourney: [{
                            '@_Id': 'WithPreconditions',
                            OrchestrationSteps: {
                                OrchestrationStep: [{
                                    '@_Order': '1',
                                    '@_Type': 'ClaimsExchange',
                                    Preconditions: {
                                        Precondition: [{
                                            '@_Type': 'ClaimsExist',
                                            '@_ExecuteActionsIf': 'true',
                                            Value: ['objectId'],
                                            Action: 'SkipThisOrchestrationStep'
                                        }]
                                    }
                                }]
                            }
                        }]
                    }
                }
            };

            const entities = createEmptyEntities();
            extractor.extractFromPolicy(policy, createContext(), entities);

            const journeys = entities.userJourneys['WithPreconditions'];
            expect(journeys).toBeDefined();
            expect(journeys[0].orchestrationSteps[0].preconditions).toBeDefined();
        });
    });

    describe('SubJourney extraction', () => {
        it('should extract SubJourney with type', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    SubJourneys: {
                        SubJourney: [{
                            '@_Id': 'MFA-StepUp',
                            '@_Type': 'Call',
                            OrchestrationSteps: {
                                OrchestrationStep: [
                                    { '@_Order': '1', '@_Type': 'ClaimsExchange' }
                                ]
                            }
                        }]
                    }
                }
            };

            const entities = createEmptyEntities();
            extractor.extractFromPolicy(policy, createContext(), entities);

            const subJourneys = entities.subJourneys['MFA-StepUp'];
            expect(subJourneys).toBeDefined();
            expect(subJourneys.length).toBeGreaterThan(0);
            const subJourney = subJourneys[0];
            expect(subJourney.id).toBe('MFA-StepUp');
            expect(subJourney.type).toBe('Call');
        });

        it('should extract multiple SubJourneys', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    SubJourneys: {
                        SubJourney: [
                            { '@_Id': 'SubJourney1', '@_Type': 'Call' },
                            { '@_Id': 'SubJourney2', '@_Type': 'Transfer' }
                        ]
                    }
                }
            };

            const entities = createEmptyEntities();
            extractor.extractFromPolicy(policy, createContext(), entities);

            expect(entities.subJourneys['SubJourney1']).toBeDefined();
            expect(entities.subJourneys['SubJourney2']).toBeDefined();
        });
    });

    describe('entity deduplication', () => {
        it('should mark entities as overrides when already processed', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [{ '@_Id': 'existingClaim', DisplayName: 'New Version' }]
                        }
                    }
                }
            };

            const entities = createEmptyEntities();
            const context = createContext();
            context.processedEntityIds.add('ClaimType:existingClaim');

            extractor.extractFromPolicy(policy, context, entities);

            const claims = entities.claimTypes['existingClaim'];
            expect(claims).toBeDefined();
            expect(claims[0].isOverride).toBe(true);
        });

        it('should update processed entity IDs after extraction', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [
                                { '@_Id': 'claim1' },
                                { '@_Id': 'claim2' }
                            ]
                        }
                    }
                }
            };

            const entities = createEmptyEntities();
            const context = createContext();

            extractor.extractFromPolicy(policy, context, entities);

            expect(context.processedEntityIds.has('ClaimType:claim1')).toBe(true);
            expect(context.processedEntityIds.has('ClaimType:claim2')).toBe(true);
        });
    });

    describe('source tracking', () => {
        it('should track source file for all entities', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    BuildingBlocks: {
                        ClaimsSchema: {
                            ClaimType: [{ '@_Id': 'testClaim' }]
                        }
                    }
                }
            };

            const entities = createEmptyEntities();
            const context = createContext('SourceFile.xml');

            extractor.extractFromPolicy(policy, context, entities);

            const claims = entities.claimTypes['testClaim'];
            expect(claims).toBeDefined();
            expect(claims[0].sourceFile).toBe('SourceFile.xml');
            expect(claims[0].sourcePolicyId).toBe('B2C_1A_Test');
        });

        it('should track hierarchy depth for all entities', () => {
            const policy: ParsedPolicy = {
                TrustFrameworkPolicy: {
                    '@_PolicyId': 'B2C_1A_Test',
                    ClaimsProviders: {
                        ClaimsProvider: [{
                            TechnicalProfiles: {
                                TechnicalProfile: [{ '@_Id': 'TestTP' }]
                            }
                        }]
                    }
                }
            };

            const entities = createEmptyEntities();
            const context: ExtractionContext = {
                fileName: 'Test.xml',
                policyId: 'B2C_1A_Test',
                hierarchyDepth: 2,
                processedEntityIds: new Set(),
            };

            extractor.extractFromPolicy(policy, context, entities);

            const tps = entities.technicalProfiles['TestTP'];
            expect(tps).toBeDefined();
            expect(tps[0].hierarchyDepth).toBe(2);
        });
    });
});
