import { XMLParser } from 'fast-xml-parser';
import { ensureArray } from '@/lib/utils';

export class XmlParserService {
    private parser: XMLParser;

    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
        });
    }

    parse(xmlContent: string): any {
        if (xmlContent === '') {
            throw new Error('XML content is empty');
        }

        const parsedPolicy = this.parser.parse(xmlContent);
        this.normalizePolicy(parsedPolicy);
        return parsedPolicy;
    }

    private normalizePolicy(policy: any): void {
        const { UserJourneys, SubJourneys } = policy.TrustFrameworkPolicy;

        if (UserJourneys) {
            UserJourneys.UserJourney = ensureArray(UserJourneys.UserJourney);
            this.normalizeJourneys(UserJourneys.UserJourney);
        }

        if (SubJourneys) {
            SubJourneys.SubJourney = ensureArray(SubJourneys.SubJourney);
            this.normalizeJourneys(SubJourneys.SubJourney);
        }
    }

    private normalizeJourneys(journeys: any[]): void {
        journeys.forEach((journey: any) => {
            if (journey.OrchestrationSteps) {
                journey.OrchestrationSteps.OrchestrationStep = ensureArray(
                    journey.OrchestrationSteps.OrchestrationStep
                );

                journey.OrchestrationSteps.OrchestrationStep.forEach((step: any) => {
                    if (step.Preconditions) {
                        step.Preconditions.Precondition = ensureArray(step.Preconditions.Precondition);
                    }

                    if (step.ClaimsExchanges) {
                        step.ClaimsExchanges.ClaimsExchange = ensureArray(step.ClaimsExchanges.ClaimsExchange);
                    }

                    if (step.ClaimsProviderSelections) {
                        step.ClaimsProviderSelections.ClaimsProviderSelection = ensureArray(
                            step.ClaimsProviderSelections.ClaimsProviderSelection
                        );
                    }
                });
            }
        });
    }
}
