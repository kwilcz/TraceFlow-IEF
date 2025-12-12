/**
 * @module PolicyValidator
 * 
 * Validates Azure AD B2C custom policy XML structure.
 * Checks required elements, attributes, and schema compliance
 * based on TrustFrameworkPolicy specification.
 */

import type { ParsedPolicy, ValidationResult, ValidationError } from './types/processor-types';

/**
 * Validates B2C custom policy structure and schema compliance.
 * 
 * Performs validation on:
 * - Root element structure (TrustFrameworkPolicy)
 * - Required attributes (PolicyId, TenantId)
 * - BuildingBlocks (ClaimsSchema, ContentDefinitions)
 * - ClaimsProviders and TechnicalProfiles
 * - UserJourneys and OrchestrationSteps
 */
export class PolicyValidator {
    /**
     * Validate a parsed policy for schema compliance.
     * 
     * @param policy - Parsed policy object from XMLParser
     * @param fileName - Source filename for error reporting
     * @returns Validation result with success flag and error details
     */
    validate(policy: ParsedPolicy, fileName: string): ValidationResult {
        const errors: ValidationError[] = [];

        if (!policy.TrustFrameworkPolicy) {
            errors.push({
                fileName,
                message: 'Missing TrustFrameworkPolicy root element',
                severity: 'error',
            });
            return { isValid: false, errors };
        }

        const tfp = policy.TrustFrameworkPolicy;

        if (!tfp['@_PolicyId']) {
            errors.push({
                fileName,
                message: 'Missing PolicyId attribute on TrustFrameworkPolicy',
                path: '/TrustFrameworkPolicy/@PolicyId',
                severity: 'error',
            });
        }

        if (tfp.BasePolicy) {
            if (!tfp.BasePolicy.PolicyId) {
                errors.push({
                    fileName,
                    message: 'BasePolicy element exists but PolicyId is missing',
                    path: '/TrustFrameworkPolicy/BasePolicy/PolicyId',
                    severity: 'error',
                });
            }
        }

        if (tfp.BuildingBlocks) {
            this.validateBuildingBlocks(tfp.BuildingBlocks, fileName, errors);
        }

        if (tfp.ClaimsProviders) {
            this.validateClaimsProviders(tfp.ClaimsProviders, fileName, errors);
        }

        if (tfp.UserJourneys) {
            this.validateUserJourneys(tfp.UserJourneys, fileName, errors);
        }

        return {
            isValid: errors.filter(e => e.severity === 'error').length === 0,
            errors,
        };
    }

    /**
     * Validate BuildingBlocks section (ClaimsSchema, ClaimsTransformations, etc.)
     */
    private validateBuildingBlocks(
        buildingBlocks: NonNullable<ParsedPolicy['TrustFrameworkPolicy']['BuildingBlocks']>,
        fileName: string,
        errors: ValidationError[]
    ): void {
        if (buildingBlocks.ClaimsSchema?.ClaimType) {
            const claimTypes = this.ensureArray(buildingBlocks.ClaimsSchema.ClaimType);
            
            for (const claimType of claimTypes) {
                if (!claimType['@_Id']) {
                    errors.push({
                        fileName,
                        message: 'ClaimType missing Id attribute',
                        path: '/TrustFrameworkPolicy/BuildingBlocks/ClaimsSchema/ClaimType',
                        severity: 'error',
                    });
                }
            }
        }

        if (buildingBlocks.ClaimsTransformations?.ClaimsTransformation) {
            const transformations = this.ensureArray(buildingBlocks.ClaimsTransformations.ClaimsTransformation);
            
            for (const transformation of transformations) {
                if (!transformation['@_Id']) {
                    errors.push({
                        fileName,
                        message: 'ClaimsTransformation missing Id attribute',
                        path: '/TrustFrameworkPolicy/BuildingBlocks/ClaimsTransformations/ClaimsTransformation',
                        severity: 'error',
                    });
                }
            }
        }
    }

    private validateClaimsProviders(
        claimsProviders: NonNullable<ParsedPolicy['TrustFrameworkPolicy']['ClaimsProviders']>,
        fileName: string,
        errors: ValidationError[]
    ): void {
        if (!claimsProviders.ClaimsProvider) {
            return;
        }

        const providers = this.ensureArray(claimsProviders.ClaimsProvider);

        for (const provider of providers) {
            if (provider.TechnicalProfiles?.TechnicalProfile) {
                const profiles = this.ensureArray(provider.TechnicalProfiles.TechnicalProfile);
                
                for (const profile of profiles) {
                    if (!profile['@_Id']) {
                        errors.push({
                            fileName,
                            message: `TechnicalProfile missing Id attribute in ClaimsProvider ${provider.DisplayName || 'unknown'}`,
                            path: '/TrustFrameworkPolicy/ClaimsProviders/ClaimsProvider/TechnicalProfiles/TechnicalProfile',
                            severity: 'error',
                        });
                    }
                }
            }
        }
    }

    private validateUserJourneys(
        userJourneys: NonNullable<ParsedPolicy['TrustFrameworkPolicy']['UserJourneys']>,
        fileName: string,
        errors: ValidationError[]
    ): void {
        if (!userJourneys.UserJourney) {
            return;
        }

        const journeys = this.ensureArray(userJourneys.UserJourney);

        for (const journey of journeys) {
            if (!journey['@_Id']) {
                errors.push({
                    fileName,
                    message: 'UserJourney missing Id attribute',
                    path: '/TrustFrameworkPolicy/UserJourneys/UserJourney',
                    severity: 'error',
                });
            }

            if (!journey.OrchestrationSteps?.OrchestrationStep) {
                errors.push({
                    fileName,
                    message: `UserJourney "${journey['@_Id'] || 'unknown'}" has no OrchestrationSteps`,
                    path: `/TrustFrameworkPolicy/UserJourneys/UserJourney[@Id="${journey['@_Id']}"]/OrchestrationSteps`,
                    severity: 'warning',
                });
            }
        }
    }

    private ensureArray<T>(value: T | T[]): T[] {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
    }
}
