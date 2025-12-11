import { Node, Edge } from '@xyflow/react';
import { NODE_TYPES } from '@/components/nodeTypes';

export class EdgeBuilder {
    static createEdge(
        sourceNode: Node,
        targetNode: Node,
        sourceHandle?: string,
        type?: string,
        data?: Record<string, unknown>
    ): Edge {
        const edgeId = sourceHandle
            ? `${sourceNode.id}:${sourceHandle}->${targetNode.id}`
            : `${sourceNode.id}->${targetNode.id}`;

        const edge: Edge = {
            id: edgeId,
            source: sourceNode.id,
            target: targetNode.id,
        };

        if (sourceHandle) {
            edge.sourceHandle = sourceHandle;
        }

        if (type) {
            edge.type = type;
        }

        if (data) {
            edge.data = data;
        }

        return edge;
    }

    static createSimpleEdge(
        sourceNode: Node,
        targetNode: Node,
        existingEdges?: Edge[]
    ): Edge {
        if (sourceNode.type === NODE_TYPES.CONDITIONED) {
            return this.createConditionEdge(
                sourceNode,
                targetNode,
                null,
                existingEdges
            );
        }

        return this.createEdge(sourceNode, targetNode);
    }

    static createConditionEdge(
        sourceNode: Node,
        targetNode: Node,
        onCondition: boolean | null,
        existingEdges?: Edge[]
    ): Edge {
        let handle = `${onCondition}`;
        let label = `${onCondition}`;

        if (onCondition === null && existingEdges) {
            const existingEdge = existingEdges.find(
                (e) => e.source === sourceNode.id && e.id.includes(':')
            );
            const existingHandle = existingEdge?.sourceHandle === 'true';
            handle = `${!existingHandle}`;
            label = `${!existingHandle}`;
        }

        return this.createEdge(
            sourceNode,
            targetNode,
            handle,
            'condition-edge',
            { label }
        );
    }

    static addEdge(edge: Edge, edges: Edge[]): Edge {
        const existingEdge = edges.find((e) => e.id === edge.id);

        if (existingEdge) {
            return existingEdge;
        }

        edges.push(edge);
        return edge;
    }

    static connectNodes(
        sourceNode: Node,
        targetNode: Node,
        edges: Edge[]
    ): Edge {
        const edge = this.createSimpleEdge(sourceNode, targetNode, edges);
        return this.addEdge(edge, edges);
    }

    static connectMultipleToSingle(
        sourceNodes: Node[],
        targetNode: Node,
        edges: Edge[]
    ): void {
        sourceNodes.forEach((sourceNode) => {
            this.connectNodes(sourceNode, targetNode, edges);
        });
    }
}
