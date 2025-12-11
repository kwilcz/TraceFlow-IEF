import {Node} from '@xyflow/react';

/**
 * Class for traversing a hierarchy of nodes in postorder, specifically designed for
 * processing nodes that represent subflows (nodes with children).
 */
export class SubflowNodeTraversal {
    private nodes: Node[];
    private childrenMap: Record<string, Node[]>; // Map to efficiently store and retrieve children of each node

    /**
     * Constructor initializes the nodes and pre-calculates the children for each node
     * for efficient lookup during traversal.
     * @param nodes The array of nodes representing the hierarchy.
     */
    constructor(nodes: Node[]) {
        this.nodes = nodes;

        // Pre-calculate children for each node to optimize child retrieval during traversal
        this.childrenMap = nodes.reduce((acc, node) => {
            if (node.parentId) {
                if (!acc[node.parentId]) {
                    acc[node.parentId] = [];
                }
                acc[node.parentId].push(node);
            }
            return acc;
        }, {} as Record<string, Node[]>);
    }

    /**
     * Performs a postorder depth-first search (DFS) traversal of the nodes,
     * ensuring that child nodes are processed before their parent nodes.
     * This traversal specifically targets nodes that have children (representing subflows).
     * @param callback The function to execute for each node in postorder.
     */
    public traversePostorder(callback: (node: Node, depth: number) => void): void {
        // Keep track of visited nodes to prevent cycles
        const visitedNodes = new Set<string>(); 
        
        const nodeStack: Array<{ node: Node; depth: number }> = this.nodes
            .filter((node) => !node.parentId && this.hasChildren(node.id))
            .map((node) => ({ node, depth: 0 }));

        while (nodeStack.length > 0) {
            const { node: currentProcessedNode, depth } = nodeStack.pop()!;

            // Node and its children have been visited, process it
            if (visitedNodes.has(currentProcessedNode.id)) {
                callback(currentProcessedNode, depth);
                continue;
            }
            
            visitedNodes.add(currentProcessedNode.id);
            nodeStack.push({node: currentProcessedNode, depth});

            const childNodes: Node[] = this.getChildren(currentProcessedNode.id);
            
            for (let i = childNodes.length - 1; i >= 0; i--) {
                const child = childNodes[i];
                // Only push children that have children themselves (represent subflows)
                if (!visitedNodes.has(child.id) && this.hasChildren(child.id)) {
                    nodeStack.push({node: child, depth: depth + 1});
                }
            }
        }
    }

    /**
     * Efficiently checks if a node has children using the pre-calculated `childrenMap`.
     * @param nodeId The ID of the node to check.
     * @returns True if the node has children, false otherwise.
     */
    private hasChildren(nodeId: string): boolean {
        return this.childrenMap[nodeId] && this.childrenMap[nodeId].length > 0;
    }

    /**
     * Efficiently retrieves the children of a node using the pre-calculated `childrenMap`.
     * @param nodeId The ID of the node to retrieve children for.
     * @returns An array of child nodes, or an empty array if the node has no children.
     */
    private getChildren(nodeId: string): Node[] {
        return this.childrenMap[nodeId] || [];
    }
}