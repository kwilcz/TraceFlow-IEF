import { Node } from '@xyflow/react';
import { BaseExtractor } from './base-extractor';
import { ExtractionContext } from '../types/policy-context';
import { NodeBuilder } from '../builders/node-builder';
import { OrchestrationStepsExtractor } from './orchestration-steps-extractor';
import { ensureArray } from '@/lib/utils';

export class SubJourneyExtractor extends BaseExtractor {
    private orchestrationStepsExtractor: OrchestrationStepsExtractor | null = null;

    private getOrchestrationStepsExtractor(): OrchestrationStepsExtractor {
        if (!this.orchestrationStepsExtractor) {
            this.orchestrationStepsExtractor = new OrchestrationStepsExtractor();
        }
        return this.orchestrationStepsExtractor;
    }

    extract(rawData: unknown, context: ExtractionContext): Node[] {
        const subJourney = rawData as any;
        const subJourneyId: string = subJourney['@_Id'];

        const subJourneyNode = NodeBuilder.createGroupNode(
            subJourneyId,
            subJourneyId,
            context.parentNode
        );

        const createdNode = NodeBuilder.addNode(subJourneyNode, context.graph.nodes);

        if (!subJourney.OrchestrationSteps?.OrchestrationStep) {
            return [createdNode];
        }

        const subContext: ExtractionContext = {
            ...context,
            parentNode: createdNode,
        };

        this.getOrchestrationStepsExtractor().extract(
            subJourney.OrchestrationSteps,
            subContext
        );

        return [createdNode];
    }

    findSubJourneyById(subJourneyId: string, parsedPolicy: any): any | undefined {
        if (!parsedPolicy.TrustFrameworkPolicy.SubJourneys?.SubJourney) {
            return undefined;
        }

        const subJourneys = ensureArray(parsedPolicy.TrustFrameworkPolicy.SubJourneys.SubJourney);
        return subJourneys.find((sj: any) => sj['@_Id'] === subJourneyId);
    }

    createEmptySubJourneyNode(subJourneyId: string, context: ExtractionContext): Node {
        const subJourneyNode = NodeBuilder.createGroupNode(
            subJourneyId,
            subJourneyId,
            context.parentNode
        );

        return NodeBuilder.addNode(subJourneyNode, context.graph.nodes);
    }
}
