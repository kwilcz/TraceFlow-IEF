import { Node } from '@xyflow/react';
import { BaseExtractor } from './base-extractor';
import { ExtractionContext } from '../types/policy-context';
import { ParsedOrchestrationStep } from '../types/orchestration-step';
import { NodeBuilder } from '../builders/node-builder';
import { EdgeBuilder } from '../builders/edge-builder';
import { StepExtractorFactory } from './step-extractor-factory';
import { OrchestrationStepDataExtractor } from '../services/orchestration-step-data-extractor';
import { PreconditionExtractor } from './precondition-extractor';
import { ensureArray } from '@/lib/utils';

export class OrchestrationStepsExtractor extends BaseExtractor {
    private stepExtractorFactory: StepExtractorFactory;

    constructor() {
        super();
        this.stepExtractorFactory = new StepExtractorFactory();
    }

    extract(rawData: unknown, context: ExtractionContext): Node[] {
        const orchestrationSteps = rawData as any;
        const startNode = NodeBuilder.createStartNode(context.parentNode);
        NodeBuilder.addNode(startNode, context.graph.nodes);

        let previousNodes: Node[] = [startNode];
        const steps = ensureArray(orchestrationSteps.OrchestrationStep);

        steps.forEach((step: any) => {
            previousNodes = this.extractSingleStep(step, previousNodes, context);
        });

        const endNode = NodeBuilder.createEndNode(context.parentNode);
        NodeBuilder.addNode(endNode, context.graph.nodes);

        EdgeBuilder.connectMultipleToSingle(previousNodes, endNode, context.graph.edges);

        return [startNode, endNode];
    }

    private extractSingleStep(
        step: any,
        previousNodes: Node[],
        context: ExtractionContext
    ): Node[] {
        const stepType: string = step['@_Type'];
        const stepOrder: number = parseInt(step['@_Order'], 10);

        const orchestrationStepData = OrchestrationStepDataExtractor.buildOrchestrationStepData(
            step,
            stepOrder,
            context.policyContext.technicalProfiles
        );

        const parsedStep: ParsedOrchestrationStep = {
            stepType,
            stepOrder,
            orchestrationStep: orchestrationStepData,
            rawStep: step,
        };

        const extractor = this.stepExtractorFactory.getExtractor(stepType);
        const createdNodes = extractor.extract(parsedStep, context);

        if (createdNodes.length === 0) {
            return previousNodes;
        }

        const mainNode = createdNodes[0];
        const nodesToReturn = [mainNode];

        if (step.Preconditions) {
            const lastPreconditionNode = PreconditionExtractor.extractPreconditions(
                step.Preconditions,
                previousNodes,
                mainNode,
                context
            );

            if (lastPreconditionNode) {
                return [lastPreconditionNode, mainNode];
            }

            return previousNodes;
        }

        previousNodes.forEach((previousNode) => {
            EdgeBuilder.connectNodes(previousNode, mainNode, context.graph.edges);
        });

        return nodesToReturn;
    }
}
