import { Node } from '@xyflow/react';
import { NODE_TYPES } from '@/components/nodeTypes';

export class NodeBuilder {
    static createNode(
        id: string,
        type: string,
        data: Record<string, unknown>,
        parentNode?: Node
    ): Node {
        const node: Node = {
            id,
            type,
            data,
            position: { x: 0, y: 0 },
        };

        if (parentNode) {
            node.parentId = parentNode.id;
            node.extent = 'parent';
        }

        return node;
    }

    static createStartNode(parentNode?: Node): Node {
        const nodeId = parentNode?.id ?? 'root';
        return this.createNode(
            `${nodeId}-start`,
            NODE_TYPES.START,
            { label: 'Start' },
            parentNode
        );
    }

    static createEndNode(parentNode?: Node): Node {
        const nodeId = parentNode?.id ?? 'root';
        return this.createNode(
            `${nodeId}-end`,
            NODE_TYPES.END,
            { label: 'End' },
            parentNode
        );
    }

    static createGroupNode(
        id: string,
        label: string,
        parentNode?: Node
    ): Node {
        return this.createNode(
            id,
            NODE_TYPES.GROUP,
            { label },
            parentNode
        );
    }

    static createOrchestrationStepNode(
        stepOrder: number,
        type: string,
        data: Record<string, unknown>,
        parentNode?: Node
    ): Node {
        const id = parentNode 
            ? `${parentNode.id}-Step${stepOrder}`
            : `Step${stepOrder}`;

        return this.createNode(id, type, data, parentNode);
    }

    static createPreconditionNode(
        orchestrationStepNodeId: string,
        index: number,
        data: Record<string, unknown>,
        parentNode?: Node
    ): Node {
        return this.createNode(
            `${orchestrationStepNodeId}-Precondition-${index}`,
            NODE_TYPES.CONDITIONED,
            data,
            parentNode
        );
    }

    static ensureUniqueId(node: Node, existingNodes: Node[]): Node {
        const existingNode = existingNodes.find(
            (n) => n.id === node.id || n.id.startsWith(node.id)
        );

        if (existingNode) {
            node.id = `${node.id}-${existingNodes.length}`;
        }

        return node;
    }

    static addNode(node: Node, nodes: Node[]): Node {
        const uniqueNode = this.ensureUniqueId(node, nodes);
        nodes.push(uniqueNode);
        return uniqueNode;
    }
}
