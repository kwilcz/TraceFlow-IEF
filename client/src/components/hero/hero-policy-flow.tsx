import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  getNodesBounds,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useStore,
  useStoreApi,
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

const DESKTOP_BREAKPOINT = 1024; // Tailwind lg
const MAX_CONTENT_WIDTH = 1280; // Tailwind max-w-7xl
const CONTENT_HORIZONTAL_PADDING = 48; // Tailwind px-6 (24px) * 2
const COLUMN_GAP = 64; // Tailwind gap-16
const MOBILE_BOTTOM_PADDING = 140;

const viewportWidthSelector = (state: ReactFlowState) => state.width;
const viewportHeightSelector = (state: ReactFlowState) => state.height;

function InnerHeroPolicyFlow({ graph, className }: HeroPolicyFlowProps) {
  const { resolvedTheme } = useTheme();
  const { getNodes, setEdges, setNodes, setViewport } = useReactFlow();
  const store = useStoreApi();

  const viewportWidth = useStore(viewportWidthSelector);
  const viewportHeight = useStore(viewportHeightSelector);
  const nodesInitialized = useNodesInitialized();

  const hasRevealedRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  const hiddenNodes = useMemo(
    () =>
      graph.nodes.map((node) => ({
        ...node,
        style: {
          ...node.style,
          opacity: 0,
          transition: 'opacity 300ms ease',
        },
      })),
    [graph.nodes],
  );

  const hiddenEdges = useMemo(
    () =>
      graph.edges.map((edge) => ({
        ...edge,
        style: {
          ...edge.style,
          opacity: 0,
          transition: 'opacity 300ms ease',
        },
      })),
    [graph.edges],
  );

  const revealIfNeeded = useCallback(() => {
    if (hasRevealedRef.current) return;

    hasRevealedRef.current = true;

    setNodes((nodes) =>
      nodes.map((node) => ({
        ...node,
        style: {
          ...node.style,
          opacity: 1,
        },
      })),
    );

    setEdges((edges) =>
      edges.map((edge) => ({
        ...edge,
        style: {
          ...edge.style,
          opacity: 1,
        },
      })),
    );
  }, [setNodes, setEdges]);

  const adjustViewport = useCallback(() => {
    const nodes = getNodes();
    if (nodes.length === 0) return;

    const { width, height, nodeLookup } = store.getState();
    if (width === 0 || height === 0) return;

    const bounds = getNodesBounds(nodes, { nodeLookup });

    const baseZoom = width < 640 ? 0.65 : width < DESKTOP_BREAKPOINT ? 0.8 : 1;
    const desktopView = width >= DESKTOP_BREAKPOINT;

    const contentWidth = Math.min(width - CONTENT_HORIZONTAL_PADDING, MAX_CONTENT_WIDTH);
    const sideGutter = (width - contentWidth) / 2;

    const rightColumnWidth = (contentWidth - COLUMN_GAP) / 2;
    const rightColumnLeft = sideGutter + (contentWidth + COLUMN_GAP) / 2;

    const maxZoomX = desktopView ? rightColumnWidth / bounds.width : width / bounds.width;
    const maxZoomY = desktopView ? height / bounds.height : height / bounds.height;
    const zoom = Math.min(baseZoom, maxZoomX, maxZoomY);

    const flowWidth = bounds.width * zoom;
    const flowHeight = bounds.height * zoom;

    const desiredBoundsLeft = desktopView
      ? rightColumnLeft + Math.max(0, (rightColumnWidth - flowWidth) / 2)
      : width / 2 - flowWidth / 2;

    const desiredBoundsTop = desktopView
      ? height / 2 - flowHeight / 2
      : height - flowHeight - MOBILE_BOTTOM_PADDING;

    const viewportX = desiredBoundsLeft - bounds.x * zoom;
    const viewportY = desiredBoundsTop - bounds.y * zoom;

    setViewport({ x: viewportX, y: viewportY, zoom });

    revealIfNeeded();
  }, [getNodes, revealIfNeeded, setViewport, store]);

  const scheduleViewportAdjust = useCallback(() => {
    if (rafIdRef.current != null) {
      window.cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = window.requestAnimationFrame(() => {
      adjustViewport();
      rafIdRef.current = null;
    });
  }, [adjustViewport]);

  useEffect(() => {
    hasRevealedRef.current = false;

    scheduleViewportAdjust();
  }, [hiddenNodes, hiddenEdges, scheduleViewportAdjust]);

  useEffect(() => {
    scheduleViewportAdjust();
  }, [viewportWidth, viewportHeight, nodesInitialized, scheduleViewportAdjust]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full h-full">
      <ReactFlow
        defaultNodes={hiddenNodes}
        defaultEdges={hiddenEdges}
        nodeTypes={POLICY_NODE_TYPES}
        edgeTypes={POLICY_EDGE_TYPES}
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
        onInit={scheduleViewportAdjust}
      >
        <Background variant={BackgroundVariant.Lines} />
      </ReactFlow>
    </div>
  );
}

export default function HeroPolicyFlow(props: HeroPolicyFlowProps) {
  return (
    <ReactFlowProvider>
      <InnerHeroPolicyFlow {...props} />
    </ReactFlowProvider>
  );
}
