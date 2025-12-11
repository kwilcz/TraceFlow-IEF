import {
    type Edge,
    type Node,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
} from '@xyflow/react';

export type AppState = {
    nodes: Node[];
    edges: Edge[];
    nodesCollapsed: boolean;
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    toggleCollapse: (nodeId: string) => void;
    // Search state
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    highlightedNodes: Set<string>;
    highlightedEndNodes: Set<string>;
    focusedNodeId: string | null;
    searchResults: SearchResult[];
    currentResultIndex: number;
    clearSearch: () => void;
    navigateToNext: () => void;
    navigateToPrevious: () => void;
};

export interface SearchResult {
    nodeId: string;
    nodeType: string;
    matchedContent: string[];
    relatedEndNodes: string[];
}
