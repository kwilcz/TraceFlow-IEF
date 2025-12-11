import { Node } from '@xyflow/react';
import { ExtractionContext } from '../types/policy-context';
import { NodeBuilder } from '../builders/node-builder';
import { EdgeBuilder } from '../builders/edge-builder';
import { ensureArray } from '@/lib/utils';
import { addInternalError } from '@/types/internal-error';

export class PreconditionExtractor {
    static extractPreconditions(
        preconditions: any,
        previousNodes: Node[],
        orchestrationStepNode: Node,
        context: ExtractionContext
    ): Node | undefined {
        let lastPreconditionNode: Node | undefined = undefined;
        const preconditionSteps = ensureArray(preconditions.Precondition);

        preconditionSteps.forEach((step: any, index: number) => {
            const preconditionNode = this.createPreconditionNode(
                step,
                index,
                orchestrationStepNode,
                context
            );

            if (!preconditionNode) {
                return;
            }

            NodeBuilder.addNode(preconditionNode, context.graph.nodes);

            if (index === 0) {
                previousNodes.forEach((previousNode) => {
                    EdgeBuilder.connectNodes(previousNode, preconditionNode, context.graph.edges);
                });
            } else if (lastPreconditionNode) {
                EdgeBuilder.connectNodes(lastPreconditionNode, preconditionNode, context.graph.edges);
            }

            const executeActionsIf = step['@_ExecuteActionsIf'] === 'true';
            EdgeBuilder.addEdge(
                EdgeBuilder.createConditionEdge(
                    preconditionNode,
                    orchestrationStepNode,
                    executeActionsIf,
                    context.graph.edges
                ),
                context.graph.edges
            );

            lastPreconditionNode = preconditionNode;
        });

        return lastPreconditionNode;
    }

    private static createPreconditionNode(
        step: any,
        index: number,
        orchestrationStepNode: Node,
        context: ExtractionContext
    ): Node | undefined {
        let nodeLabel = '';
        let claimTypeReferenceId: string | undefined;
        let operatorType: string | undefined;
        let conditionValue: string | undefined;
        let action: string | undefined;
        let executeActionsIf: boolean | undefined;

        switch (step['@_Type']) {
            case 'ClaimsExist':
                nodeLabel = `\`${step.Value}\` has value`;
                claimTypeReferenceId = step.Value;
                operatorType = step['@_Type'];
                action = step.Action;
                executeActionsIf = step['@_ExecuteActionsIf'] === 'true';
                break;
            case 'ClaimEquals':
                nodeLabel = `\`${step.Value[0]}\` is \`${step.Value[1]}\``;
                claimTypeReferenceId = step.Value[0];
                conditionValue = step.Value[1];
                operatorType = step['@_Type'];
                action = step.Action;
                executeActionsIf = step['@_ExecuteActionsIf'] === 'true';
                break;
            default:
                context.policyContext.errors.add(
                    addInternalError(`Unsupported precondition type: ${step['@_Type']}`, 'error')
                );
                return undefined;
        }

        return NodeBuilder.createPreconditionNode(
            orchestrationStepNode.id,
            index,
            {
                label: nodeLabel,
                claimTypeReferenceId,
                operatorType,
                conditionValue,
                action,
                executeActionsIf,
            },
            context.parentNode
        );
    }
}
