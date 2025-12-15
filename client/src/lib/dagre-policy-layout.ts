// src/lib/DagreLayout.ts
import Dagre, { GraphLabel } from "@dagrejs/dagre";
import { Node, Edge } from "@xyflow/react";
import { SubflowNodeTraversal } from "./SubflowNodeTraversal";
import { sortEdgesTopologically } from "./utils";
import {NODE_TYPES} from "@components/nodeTypes";
import {GROUP_NODE_COLLAPSED_HEIGHT} from "@/constants/node-layout";

export class DagreLayout {
    private readonly graph: Dagre.graphlib.Graph;
    private readonly graphSettings: GraphLabel = {
        rankdir: "TB",
        ranksep: 75,
        nodesep: 200,
        edgesep: 200,
        marginx: 50,
        marginy: 25,
    };

    constructor() {
        this.graph = this.createGraph();
    }

    /**
     * Applies the Dagre layout algorithm to the given nodes and edges.
     *
     * @param nodes The nodes to layout.
     * @param edges The edges connecting the nodes.
     * @returns The layouted nodes with updated positions.
     */
    public applyLayout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
        // copy nodes and edges to avoid modifying the original objects
        const nodesToLayout = nodes.map((node) => ({ ...node })).filter((node) => node.type != NODE_TYPES.COMMENT);

        const edgesToLayout = edges.map((edge) => ({ ...edge }));

        const subflowTraversal = new SubflowNodeTraversal(nodesToLayout);
        const sortedEdges = sortEdgesTopologically(edgesToLayout);
        const visibleNodes = nodesToLayout.filter((node) => !node.hidden);

        // Apply layout to subflows bottom-up
        subflowTraversal.traversePostorder((node, depth) => {
            // depth + 1 since we already have root node at depth 0
            this.applyLayoutToSubflow(node, visibleNodes, sortedEdges, depth + 1);
        });

        // Apply layout to top-level nodes
        const topLevelNodes = visibleNodes.filter((node) => !node.parentId);
        const topLevelEdges = sortedEdges.filter(
            (edge) => topLevelNodes.some((n) => n.id === edge.source) && topLevelNodes.some((n) => n.id === edge.target)
        );
        this.applyLayoutToNodes(topLevelNodes, topLevelEdges, this.graph, 0);

        return { nodes: visibleNodes, edges: sortedEdges };
    }

    private createGraph(): Dagre.graphlib.Graph {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        const graph = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
        graph.setGraph(this.graphSettings);
        return graph;
    }

    /**
     * Applies the Dagre layout to a subflow rooted at the given node.
     *
     * @param subflowRoot The root node of the subflow.
     * @param allNodes All nodes in the graph.
     * @param allEdges All edges in the graph.
     * @param depth
     */
    private applyLayoutToSubflow(subflowRoot: Node, allNodes: Node[], allEdges: Edge[], depth: number): void {
        const subflowNodes = allNodes.filter((node) => node.parentId === subflowRoot.id);
        const subflowEdges = allEdges.filter(
            (edge) => subflowNodes.some((n) => n.id === edge.source) && subflowNodes.some((n) => n.id === edge.target)
        );

        // Create a separate Dagre graph for the subflows,
        // as internal dagre setParent fails in some specific cases
        const subgraph = this.createGraph();

        this.applyLayoutToNodes(subflowNodes, subflowEdges, subgraph, depth);
        this.setSubflowNodeSize(subflowRoot, subgraph);
    }

    private setSubflowNodeSize(subflowRoot: Node, subgraph: Dagre.graphlib.Graph): void {
        if (subgraph.graph().height === -Infinity || subgraph.graph().width === -Infinity) {
            subflowRoot.height = GROUP_NODE_COLLAPSED_HEIGHT;
            subflowRoot.width = subflowRoot.width ?? 50;
            return;
        }

        subflowRoot.height = subgraph.graph().height;
        subflowRoot.width = subgraph.graph().width;
    }

    private addEdgesToGraph(edges: Edge[], graph: Dagre.graphlib.Graph): void {
        edges.forEach((edge) => {
            graph.setEdge(edge.source, edge.target);
        });
    }

    private addNodesToGraph(nodes: Node[], graph: Dagre.graphlib.Graph): void {
        nodes.forEach((node) => {
            const width = this.getNodeWidth(node);
            const height = this.getNodeHeight(node);
            graph.setNode(node.id, { width: width, height: height });
        });
    }

    private updateNodePositions(nodes: Node[], graph: Dagre.graphlib.Graph): void {
        nodes.forEach((node) => {
            const dagreNode = graph.node(node.id);
            if (dagreNode) {
                this.setNodePosition(node, dagreNode);
            }
        });
    }

    private updateEdges(edges: Edge[], graph: Dagre.graphlib.Graph<object>, depth: number) {
        edges.forEach((edge) => {
            const dagreEdge = graph.edge(edge.source, edge.target);
            if (dagreEdge) {
                edge.zIndex = depth;
            }
        });
    }

    private getNodeHeight(node: Node) {
        if (node.height ?? 0 > 0) {
            return node.height;
        }
        return node?.measured?.height ?? 0;
    }

    private getNodeWidth(node: Node) {
        if (node.width ?? 0 > 0) {
            return node.width;
        }

        return node?.measured?.width ?? 0;
    }

    /**
     * Applies the Dagre layout to a set of nodes.
     *
     * @param nodes The nodes to layout.
     * @param edges The edges connecting the nodes.
     * @param graph The graph to layout.
     */
    private applyLayoutToNodes(nodes: Node[], edges: Edge[], graph: Dagre.graphlib.Graph, depth: number): void {
        this.addNodesToGraph(nodes, graph);
        this.addEdgesToGraph(edges, graph);

        Dagre.layout(graph, { disableOptimalOrderHeuristic: true });

        this.updateNodePositions(nodes, graph);
        this.updateEdges(edges, graph, depth);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private setNodePosition(node: Node, dagreNode: Dagre.Node): void {
        // Adjusting node positions to match React Flow's anchor point (top-left) from Dagre's anchor point (center)
        node.position = { x: dagreNode.x - dagreNode.width / 2, y: dagreNode.y - dagreNode.height / 2 };
        // node.zIndex = depth;
    }
}
