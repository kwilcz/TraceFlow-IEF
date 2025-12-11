import {create} from 'zustand';
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    Node,
    NodeChange
} from '@xyflow/react';
import {type AppState} from '@/types/app-state';
import {NODE_TYPES} from '@/components/nodeTypes';
import {DagreLayout} from "@lib/dagre-policy-layout";
import {GROUP_NODE_COLLAPSED_HEIGHT} from "@/constants/node-layout";

/**
 * Hides or shows all child node tree based on the collapsed node
 * @param nodes - List of all nodes
 * @param nodeId - The id of the currently collapsed node
 * @param collapsedNode - The root node that is collapsed
 * @param hidden - Whether the node should be hidden or not
 */
function hideNodes(nodes: Node[], nodeId: string, collapsedNode: Node, hidden: boolean = false): NodeChange<Node>[] {
    const changes: NodeChange<Node>[] = [];

    nodes.forEach((node) => {
        if (node.id === nodeId) {
            hidden = !(collapsedNode.data?.isCollapsed ?? false);
            changes.push(createNodeHideChange(node, hidden, true));
            return;
        }

        if (node.parentId !== nodeId) return;

        // Recursively hide children, but only if this node is not already collapsed
        if (node.type === NODE_TYPES.GROUP && !node.data?.isCollapsed) {
            changes.push(...hideNodes(nodes, node.id, collapsedNode, hidden));
        }

        changes.push(createNodeHideChange(node, hidden, false));
    });

    return changes;
}

function createNodeHideChange(node: Node, hidden: boolean, shouldCollapse: boolean): NodeChange {
    if (shouldCollapse) {
        return {
            id: node.id,
            type: "replace",
            item: {
                ...node,
                height: hidden ? GROUP_NODE_COLLAPSED_HEIGHT : (node.height ?? GROUP_NODE_COLLAPSED_HEIGHT),
                width: (node.width ?? 50),
                measured: {
                    ...node.measured,
                    height: hidden ? GROUP_NODE_COLLAPSED_HEIGHT : (node.height ?? GROUP_NODE_COLLAPSED_HEIGHT),
                    width: (node.width ?? 50),
                },
                data: {
                    ...node.data,
                    isCollapsed: hidden,
                },
            },
        };
    }

    return {
        id: node.id,
        type: "replace",
        item: {
            ...node,
            hidden,
        },
    };
}

const useReactFlowStore = create<AppState>(
    (set, get) => ({
        nodes: [],
        edges: [],
        nodesCollapsed: false,
        onNodesChange: (changes) => {
            set({
                nodes: applyNodeChanges(changes, get().nodes),
            });
        },
        onEdgesChange: (changes) => {
            set({
                edges: applyEdgeChanges(changes, get().edges),
            });
        },
        onConnect: (connection) => {
            set({
                edges: addEdge(connection, get().edges),
            });
        },
        setNodes: (nodes) => {
            set({nodes});
        },
        setEdges: (edges) => {
            set({edges});
        },
        toggleCollapse: (nodeId) => {
            const collapsedNode = get().nodes.find((node) => node.id === nodeId);
            if (collapsedNode?.type !== NODE_TYPES.GROUP) {
                return;
            }

            const changes = hideNodes(get().nodes, nodeId, collapsedNode);
            get().onNodesChange(changes);
            
            const dagreLayout = new DagreLayout();
            const {nodes: layoutedNodes} = dagreLayout.applyLayout(get().nodes, get().edges);
            get().setNodes(
                get().nodes.map((node) => {
                    const updatedNode = layoutedNodes.find((layoutedNode) => layoutedNode.id === node.id);
                    return {...node, ...updatedNode};
                }));
            set({nodesCollapsed: !get().nodesCollapsed});
        },
        // Search state
        searchTerm: '',
        setSearchTerm: (term) => set({ searchTerm: term }),
        highlightedNodes: new Set(),
        highlightedEndNodes: new Set(),
        focusedNodeId: null,
        searchResults: [],
        currentResultIndex: -1,
        clearSearch: () => set({
            searchTerm: '',
            highlightedNodes: new Set(),
            highlightedEndNodes: new Set(),
            focusedNodeId: null,
            searchResults: [],
            currentResultIndex: -1
        }),
        navigateToNext: () => {
            const { searchResults, currentResultIndex } = get();
            if (searchResults.length === 0) return;
            const nextIndex = (currentResultIndex + 1) % searchResults.length;
            set({ currentResultIndex: nextIndex, focusedNodeId: searchResults[nextIndex].nodeId });
        },
        navigateToPrevious: () => {
            const { searchResults, currentResultIndex } = get();
            if (searchResults.length === 0) return;
            const prevIndex = currentResultIndex === 0 ? searchResults.length - 1 : currentResultIndex - 1;
            set({ currentResultIndex: prevIndex, focusedNodeId: searchResults[prevIndex].nodeId });
        }
    }),
);

export default useReactFlowStore;