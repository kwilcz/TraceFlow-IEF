import {useEffect} from 'react';
import {useNodesInitialized} from '@xyflow/react';
import useReactFlowStore from "@hooks/use-react-flow-store";
import {DagreLayout} from "@lib/dagre-policy-layout";

export const useLayout = () => {
    const {nodes, edges, setEdges, setNodes, nodesCollapsed} = useReactFlowStore();
    const nodesInitialized = useNodesInitialized();

    function applyLayout() {
        const dagreLayout = new DagreLayout();
        const {nodes: layoutedNodes, edges: layoutedEdges} = dagreLayout.applyLayout(nodes, edges);
        setNodes(
            nodes.map((node) => {
                const updatedNode = layoutedNodes.find((layoutedNode) => layoutedNode.id === node.id);
                return {...node, ...updatedNode};
            }));
            
        setEdges(
            edges.map((edge) => {
                const updatedEdge = layoutedEdges.find((edgeChange) => edgeChange.id === edge.id);
                return {...edge, ...updatedEdge};
            }));        
    }

    useEffect(() => {
        if (nodesInitialized) {
            applyLayout();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodesInitialized, nodesCollapsed]);

    return applyLayout;
};
