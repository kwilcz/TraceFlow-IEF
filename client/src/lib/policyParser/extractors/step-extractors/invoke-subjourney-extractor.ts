import { Node } from '@xyflow/react';
import { BaseExtractor } from '../base-extractor';
import { ExtractionContext } from '../../types/policy-context';
import { ParsedOrchestrationStep } from '../../types/orchestration-step';
import { SubJourneyExtractor } from '../sub-journey-extractor';

export class InvokeSubJourneyExtractor extends BaseExtractor {
    private subJourneyExtractor: SubJourneyExtractor;

    constructor() {
        super();
        this.subJourneyExtractor = new SubJourneyExtractor();
    }

    extract(parsedStep: ParsedOrchestrationStep, context: ExtractionContext): Node[] {
        const { rawStep } = parsedStep;
        const subJourneyId = rawStep.JourneyList?.Candidate?.['@_SubJourneyReferenceId'];

        if (!subJourneyId) {
            this.addError(
                "'SubJourneyReferenceId' not found in 'Candidate' for an 'InvokeSubJourney' step.",
                'error',
                context
            );
            return [];
        }

        const subJourneyToParse = this.subJourneyExtractor.findSubJourneyById(
            subJourneyId,
            context.policyContext.parsedPolicy
        );

        if (!subJourneyToParse) {
            this.addError(
                `SubJourney with ID '${subJourneyId}' not found.`,
                'warning',
                context
            );
            return [this.subJourneyExtractor.createEmptySubJourneyNode(subJourneyId, context)];
        }

        return this.subJourneyExtractor.extract(subJourneyToParse, context);
    }
}
