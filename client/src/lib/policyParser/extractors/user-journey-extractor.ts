import { Node } from '@xyflow/react';
import { BaseExtractor } from './base-extractor';
import { ExtractionContext } from '../types/policy-context';
import { OrchestrationStepsExtractor } from './orchestration-steps-extractor';

export class UserJourneyExtractor extends BaseExtractor {
    private orchestrationStepsExtractor: OrchestrationStepsExtractor | null = null;

    private getOrchestrationStepsExtractor(): OrchestrationStepsExtractor {
        if (!this.orchestrationStepsExtractor) {
            this.orchestrationStepsExtractor = new OrchestrationStepsExtractor();
        }
        return this.orchestrationStepsExtractor;
    }

    extract(rawData: unknown, context: ExtractionContext): Node[] {
        const journey = rawData as any;

        if (!journey.OrchestrationSteps?.OrchestrationStep) {
            return [];
        }

        return this.getOrchestrationStepsExtractor().extract(
            journey.OrchestrationSteps,
            context
        );
    }
}
