import { TechnicalProfile, OrchestrationStepWithTechnicalProfile } from '@/types/technical-profile';
import { ensureArray } from '@/lib/utils';
import { isNonEmptyString } from '../utils/validation-utils';
import { extractTechnicalProfileReferencesFromStep } from '@/lib/policyParser/technical-profile-parser';

export class OrchestrationStepDataExtractor {
    static extractClaimsExchanges(
        step: any,
        technicalProfiles?: Map<string, TechnicalProfile>
    ): OrchestrationStepWithTechnicalProfile['claimsExchanges'] {
        if (!step?.ClaimsExchanges?.ClaimsExchange) {
            return undefined;
        }

        const exchanges = ensureArray(step.ClaimsExchanges.ClaimsExchange);

        const normalized = exchanges
            .map((exchange: any) => {
                const exchangeId = exchange['@_Id'] || exchange['@_TargetClaimsExchangeId'];
                const technicalProfileReferenceId = exchange['@_TechnicalProfileReferenceId'];

                if (!isNonEmptyString(exchangeId) && !isNonEmptyString(technicalProfileReferenceId)) {
                    return undefined;
                }

                return {
                    id: exchangeId || technicalProfileReferenceId,
                    technicalProfileReferenceId,
                    technicalProfile: isNonEmptyString(technicalProfileReferenceId)
                        ? technicalProfiles?.get(technicalProfileReferenceId)
                        : undefined,
                };
            })
            .filter((exchange): exchange is NonNullable<typeof exchange> => Boolean(exchange));

        return normalized.length > 0 ? normalized : undefined;
    }

    static extractClaimsProviderSelections(
        step: any
    ): OrchestrationStepWithTechnicalProfile['claimsProviderSelections'] {
        if (!step?.ClaimsProviderSelections?.ClaimsProviderSelection) {
            return undefined;
        }

        const selections = ensureArray(step.ClaimsProviderSelections.ClaimsProviderSelection);

        const normalized = selections
            .map((selection: any) => {
                const targetClaimsExchangeId = selection['@_TargetClaimsExchangeId'];
                const validationClaimsExchangeId = selection['@_ValidationClaimsExchangeId'];

                if (!isNonEmptyString(targetClaimsExchangeId) && !isNonEmptyString(validationClaimsExchangeId)) {
                    return undefined;
                }

                return {
                    targetClaimsExchangeId: isNonEmptyString(targetClaimsExchangeId) ? targetClaimsExchangeId : undefined,
                    validationClaimsExchangeId: isNonEmptyString(validationClaimsExchangeId) ? validationClaimsExchangeId : undefined,
                };
            })
            .filter((selection): selection is NonNullable<typeof selection> => Boolean(selection));

        return normalized.length > 0 ? normalized : undefined;
    }

    static resolveStepTechnicalProfiles(
        references: string[],
        technicalProfiles?: Map<string, TechnicalProfile>
    ): TechnicalProfile[] | undefined {
        if (!technicalProfiles) {
            return undefined;
        }

        const resolved: TechnicalProfile[] = [];
        const seen = new Set<string>();

        for (const reference of references) {
            if (!isNonEmptyString(reference) || seen.has(reference)) {
                continue;
            }

            seen.add(reference);
            const profile = technicalProfiles.get(reference);
            if (profile) {
                resolved.push(profile);
            }
        }

        return resolved.length > 0 ? resolved : undefined;
    }

    static buildOrchestrationStepData(
        step: any,
        stepOrder: number,
        technicalProfiles?: Map<string, TechnicalProfile>
    ): OrchestrationStepWithTechnicalProfile {
        const claimsExchanges = this.extractClaimsExchanges(step, technicalProfiles);
        const claimsProviderSelections = this.extractClaimsProviderSelections(step);
        const references = extractTechnicalProfileReferencesFromStep(step);
        const stepType = isNonEmptyString(step?.['@_Type']) ? step['@_Type'] : 'Unknown';
        const cpimIssuerTechnicalProfileReferenceId = isNonEmptyString(step?.['@_CpimIssuerTechnicalProfileReferenceId'])
            ? step['@_CpimIssuerTechnicalProfileReferenceId']
            : undefined;

        if (claimsExchanges) {
            claimsExchanges.forEach((exchange) => {
                if (isNonEmptyString(exchange.technicalProfileReferenceId)) {
                    references.push(exchange.technicalProfileReferenceId);
                }
            });
        }

        const technicalProfilesForStep = this.resolveStepTechnicalProfiles(references, technicalProfiles);

        return {
            order: stepOrder,
            type: stepType,
            technicalProfiles: technicalProfilesForStep,
            claimsExchanges,
            claimsProviderSelections,
            cpimIssuerTechnicalProfileReferenceId,
        };
    }
}
