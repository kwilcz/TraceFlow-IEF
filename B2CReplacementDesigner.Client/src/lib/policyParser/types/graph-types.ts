import { Node, Edge } from '@xyflow/react';

export interface PolicyGraph {
    nodes: Node[];
    edges: Edge[];
}

export interface PolicySubgraphs {
    [journeyId: string]: PolicyGraph;
}
