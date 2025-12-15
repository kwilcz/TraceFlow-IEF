import { Node } from '@xyflow/react';
import { BaseExtractor } from '../base-extractor';
import { ExtractionContext } from '../../types/policy-context';
import { ParsedOrchestrationStep } from '../../types/orchestration-step';
import { NodeBuilder } from '../../builders/node-builder';
import { isNonEmptyString } from '../../utils/validation-utils';

export class DefaultStepExtractor extends BaseExtractor {
    extract(parsedStep: ParsedOrchestrationStep, context: ExtractionContext): Node[] {
        const { stepOrder, orchestrationStep, rawStep } = parsedStep;
        let label = `Step ${stepOrder} (${rawStep['@_Type']})`;

        if (rawStep.ClaimsExchanges) {
            label = rawStep.ClaimsExchanges.ClaimsExchange.map((ce: any) => ce['@_Id']).join(`\n`);
        }

        const claimsExchangeIds = (orchestrationStep.claimsExchanges ?? [])
            .map((exchange) => exchange.id)
            .filter(isNonEmptyString);

        const nodeData: Record<string, unknown> = {
            label,
            technicalProfiles: orchestrationStep.technicalProfiles,
            stepOrder,
            orchestrationStep,
        };

        if (claimsExchangeIds.length > 0) {
            nodeData.claimsExchanges = Array.from(new Set(claimsExchangeIds));
        }

        const createdNode = NodeBuilder.createOrchestrationStepNode(
            stepOrder,
            'default',
            nodeData,
            context.parentNode
        );

        NodeBuilder.addNode(createdNode, context.graph.nodes);
        return [createdNode];
    }
}
