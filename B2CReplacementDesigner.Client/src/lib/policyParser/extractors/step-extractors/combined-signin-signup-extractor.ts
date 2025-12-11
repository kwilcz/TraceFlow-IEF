import { Node } from '@xyflow/react';
import { BaseExtractor } from '../base-extractor';
import { ExtractionContext } from '../../types/policy-context';
import { ParsedOrchestrationStep } from '../../types/orchestration-step';
import { NodeBuilder } from '../../builders/node-builder';
import { NODE_TYPES } from '@/components/nodeTypes';
import { isNonEmptyString } from '../../utils/validation-utils';

export class CombinedSignInAndSignUpExtractor extends BaseExtractor {
    extract(parsedStep: ParsedOrchestrationStep, context: ExtractionContext): Node[] {
        const { stepOrder, orchestrationStep, rawStep } = parsedStep;

        if (!rawStep.ClaimsProviderSelections || 
            !rawStep.ClaimsProviderSelections.ClaimsProviderSelection || 
            rawStep.ClaimsProviderSelections.ClaimsProviderSelection.length < 1) {
            this.addError(
                'CombinedSignInAndSignUp step must have at least 1 ClaimsProviderSelection.',
                'error',
                context
            );
            return [];
        }

        const label = 'CombinedSignInAndSignUp';

        const selectionExchangeIds = (orchestrationStep.claimsProviderSelections ?? [])
            .map((selection) => selection.validationClaimsExchangeId || selection.targetClaimsExchangeId)
            .filter(isNonEmptyString);
        const claimsExchangeIds = (orchestrationStep.claimsExchanges ?? [])
            .map((exchange) => exchange.id)
            .filter(isNonEmptyString);
        const combinedExchangeIds = Array.from(new Set([...selectionExchangeIds, ...claimsExchangeIds]));

        const nodeData: Record<string, unknown> = {
            label,
            stepOrder,
            orchestrationStep,
        };

        if (orchestrationStep.technicalProfiles) {
            nodeData.technicalProfiles = orchestrationStep.technicalProfiles;
        }

        if (combinedExchangeIds.length > 0) {
            nodeData.claimsExchanges = combinedExchangeIds;
        }

        const createdNode = NodeBuilder.createOrchestrationStepNode(
            stepOrder,
            NODE_TYPES.COMBINED_SIGNIN_SIGNUP,
            nodeData,
            context.parentNode
        );

        NodeBuilder.addNode(createdNode, context.graph.nodes);
        return [createdNode];
    }
}
