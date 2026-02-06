import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
  type ReactFlowState,
} from '@xyflow/react';

import { useTheme } from '@/components/theme-provider';
import { POLICY_EDGE_TYPES } from '@/components/flow/policy-edge-types';
import { POLICY_NODE_TYPES } from '@/components/flow/policy-node-types';

type HeroPolicyFlowProps = {
  graph: { nodes: Node[]; edges: Edge[] };
  className?: string;
};

const FIT_VIEW_OPTIONS = {
  padding: 0.1,
  maxZoom: 1,
} as const;

const dimensionSelector = (state: ReactFlowState) => ({
  width: state.width,
  height: state.height,
});

function InnerHeroPolicyFlow({ graph, className }: HeroPolicyFlowProps) {
  const { resolvedTheme } = useTheme();
  const { fitView } = useReactFlow();
  const dimensions = useStore(dimensionSelector);

  const handleFitView = useCallback(() => {
    fitView(FIT_VIEW_OPTIONS);
  }, [fitView]);

  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      handleFitView();
    }
  }, [dimensions.width, dimensions.height, handleFitView]);

  return (
    <ReactFlow
      defaultNodes={graph.nodes}
      defaultEdges={graph.edges}
      nodeTypes={POLICY_NODE_TYPES}
      edgeTypes={POLICY_EDGE_TYPES}
      fitView
      fitViewOptions={FIT_VIEW_OPTIONS}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag={false}
      panOnScroll={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
      autoPanOnConnect={false}
      autoPanOnNodeDrag={false}
      elevateNodesOnSelect={false}
      colorMode={resolvedTheme}
      className={className}
    />
  );
}

export default function HeroPolicyFlow(props: HeroPolicyFlowProps) {
  return (
    <ReactFlowProvider>
      <InnerHeroPolicyFlow {...props} />
    </ReactFlowProvider>
  );
}
