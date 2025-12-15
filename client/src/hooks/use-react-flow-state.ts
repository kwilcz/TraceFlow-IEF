import { Node, Edge } from "@xyflow/react";
import useReactFlowStore from "@hooks/use-react-flow-store";


export const useReactFlowState = (initialNodes: Node[], initialEdges: Edge[]) => {
    const store = useReactFlowStore();
    const {nodes, edges} = store;

    // Set initial state if the store is empty
    if (nodes.length === 0 && edges.length === 0) {
        useReactFlowStore.setState({nodes: initialNodes, edges: initialEdges});
    }

    return store;
};