import { Node } from '@xyflow/react';
import { BaseExtractor } from '../base-extractor';
import { ExtractionContext } from '../../types/policy-context';
import { ParsedOrchestrationStep } from '../../types/orchestration-step';
import { NodeBuilder } from '../../builders/node-builder';
import { NODE_TYPES } from '@/components/nodeTypes';
import { isNonEmptyString } from '../../utils/validation-utils';

export class ClaimsExchangeExtractor extends BaseExtractor {
    extract(parsedStep: ParsedOrchestrationStep, context: ExtractionContext): Node[] {
        const { stepOrder, orchestrationStep, rawStep } = parsedStep;

        if (!rawStep.ClaimsExchanges || 
            !rawStep.ClaimsExchanges.ClaimsExchange || 
            rawStep.ClaimsExchanges.ClaimsExchange.length < 1) {
            this.addError(
                'ClaimsExchange step must have at least 1 ClaimsExchange.',
                'error',
                context
            );
            return [];
        }

        const claimsExchangeRefs = (orchestrationStep.claimsExchanges ?? [])
            .map((exchange) => exchange.technicalProfileReferenceId)
            .filter(isNonEmptyString);

        if (context.policyContext.technicalProfiles) {
            claimsExchangeRefs.forEach((ref) => {
                if (!context.policyContext.technicalProfiles!.has(ref)) {
                    console.warn(`TechnicalProfile not found: ${ref}`);
                }
            });
        } else if (claimsExchangeRefs.length > 0) {
            console.warn('No technicalProfiles map provided to ClaimsExchangeExtractor');
        }

        let nodeLabel = 'Claims Exchange';
        if (orchestrationStep.claimsExchanges && orchestrationStep.claimsExchanges.length === 1) {
            const singleExchangeLabel = orchestrationStep.claimsExchanges[0]?.id;
            if (isNonEmptyString(singleExchangeLabel)) {
                nodeLabel = singleExchangeLabel;
            }
        }

        const nodeData: Record<string, unknown> = {
            label: nodeLabel,
            stepOrder,
            orchestrationStep,
        };

        if (claimsExchangeRefs.length > 0) {
            nodeData.claimsExchanges = claimsExchangeRefs;
        }

        if (orchestrationStep.technicalProfiles) {
            nodeData.technicalProfiles = orchestrationStep.technicalProfiles;
        }

        const createdNode = NodeBuilder.createOrchestrationStepNode(
            stepOrder,
            NODE_TYPES.CLAIMS_EXCHANGE,
            nodeData,
            context.parentNode
        );

        NodeBuilder.addNode(createdNode, context.graph.nodes);
        return [createdNode];
    }
}
