import { Node } from '@xyflow/react';
import { BaseExtractor } from '../base-extractor';
import { ExtractionContext } from '../../types/policy-context';
import { ParsedOrchestrationStep } from '../../types/orchestration-step';
import { NodeBuilder } from '../../builders/node-builder';
import { NODE_TYPES } from '@/components/nodeTypes';

export class GetClaimsExtractor extends BaseExtractor {
    extract(parsedStep: ParsedOrchestrationStep, context: ExtractionContext): Node[] {
        const { stepOrder, orchestrationStep, rawStep } = parsedStep;
        const primaryProfile = orchestrationStep.technicalProfiles?.[0];

        if (!primaryProfile) {
            this.addError(
                'GetClaims step should reference a TechnicalProfile via CpimIssuerTechnicalProfileReferenceId.',
                'warning',
                context
            );
        }

        const nodeLabel = primaryProfile?.displayName || rawStep?.['@_Type'] || 'GetClaims';

        const nodeData: Record<string, unknown> = {
            label: nodeLabel,
            stepOrder,
            orchestrationStep,
        };

        if (context.policyContext.relyingPartyProfile?.inputClaims?.length) {
            nodeData.relyingPartyInputClaims = context.policyContext.relyingPartyProfile.inputClaims;
        }

        const node = NodeBuilder.createOrchestrationStepNode(
            stepOrder,
            NODE_TYPES.GET_CLAIMS,
            nodeData,
            context.parentNode
        );

        NodeBuilder.addNode(node, context.graph.nodes);
        return [node];
    }
}