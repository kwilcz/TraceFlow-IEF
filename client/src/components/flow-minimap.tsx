"use client";

import React, { memo, useCallback } from "react";
import { MiniMap, type MiniMapNodeProps, type Node, type XYPosition, useReactFlow } from "@xyflow/react";
import { NODE_TYPES } from "@components/nodeTypes/node-types";
import { cn } from "@lib/utils";

/**
 * Visual palette used when rendering a miniature node. Grouping the colors keeps the SVG markup terse and lets us
 * express design intent (surface, outline, accents) without hard coding literal values everywhere.
 */
type NodeTheme = {
    fill: string;
    stroke: string;
    accent: string;
    detail: string;
};

const DEFAULT_THEME: NodeTheme = {
    fill: "var(--flow-minimap-node-surface)",
    stroke: "var(--flow-minimap-node-outline)",
    accent: "var(--flow-minimap-node-accent)",
    detail: "var(--flow-minimap-node-detail)",
};

const NODE_THEME_OVERRIDES: Partial<Record<string, NodeTheme>> = {
    [NODE_TYPES.START]: {
        fill: "hsl(var(--chart-2) / 0.25)",
        stroke: "hsl(var(--chart-2))",
        accent: "hsl(var(--chart-2))",
        detail: "hsl(var(--chart-2) / 0.55)",
    },
    [NODE_TYPES.END]: {
        fill: "hsl(var(--chart-5) / 0.25)",
        stroke: "hsl(var(--chart-5))",
        accent: "hsl(var(--chart-5))",
        detail: "hsl(var(--chart-5) / 0.5)",
    },
    [NODE_TYPES.CONDITIONED]: {
        fill: "hsl(var(--chart-1) / 0.2)",
        stroke: "hsl(var(--chart-1))",
        accent: "hsl(var(--chart-1))",
        detail: "hsl(var(--chart-1) / 0.5)",
    },
    [NODE_TYPES.CLAIMS_EXCHANGE]: {
        fill: "hsl(var(--chart-3) / 0.25)",
        stroke: "hsl(var(--chart-3))",
        accent: "hsl(var(--chart-3))",
        detail: "hsl(var(--chart-3) / 0.55)",
    },
    [NODE_TYPES.COMBINED_SIGNIN_SIGNUP]: {
        fill: "hsl(var(--chart-4) / 0.22)",
        stroke: "hsl(var(--chart-4))",
        accent: "hsl(var(--chart-4))",
        detail: "hsl(var(--chart-4) / 0.5)",
    },
    [NODE_TYPES.COMMENT]: {
        fill: "hsl(var(--muted) / 0.65)",
        stroke: "hsl(var(--muted-foreground))",
        accent: "hsl(var(--muted-foreground))",
        detail: "hsl(var(--muted-foreground) / 0.45)",
    },
    [NODE_TYPES.GROUP]: {
        fill: "transparent",
        stroke: "var(--flow-minimap-group-stroke)",
        accent: "var(--flow-minimap-group-accent)",
        detail: "var(--flow-minimap-group-stroke)",
    },
};

type ShapeProps = MiniMapNodeProps & {
    theme: NodeTheme;
};
type NodeWithAbsolute = Node & { positionAbsolute?: XYPosition };

/**
 * Custom node renderer that mirrors our full-size cards (headers, detail rows, group outlines) so the minimap conveys
 * structure instead of showing generic rectangles.
 */
const FlowMiniMapNode = memo((props: MiniMapNodeProps) => {
    const reactFlow = useReactFlow();
    const node = reactFlow.getNode(props.id);
    const nodeType = node?.type ?? "default";
    const theme = NODE_THEME_OVERRIDES[nodeType] ?? DEFAULT_THEME;

    if (nodeType === NODE_TYPES.GROUP) {
        return GroupMiniMapShape({ ...props, theme });
    }

    return StandardMiniMapShape({ ...props, theme });
});

FlowMiniMapNode.displayName = "FlowMiniMapNode";

/**
 * Wraps React Flow's MiniMap with rich styling, type-aware coloring, and click-to-pan behavior so the overview feels
 * actionable and informative on complex policies.
 */
const FlowMiniMap: React.FC<{ className?: string }> = ({ className }) => {
    const reactFlow = useReactFlow();

    const handleMapClick = useCallback(
        (event: React.MouseEvent, position?: XYPosition) => {
            event.stopPropagation();
            if (!position) return;
            const { zoom } = reactFlow.getViewport();
            reactFlow.setCenter(position.x, position.y, {
                zoom,
                duration: 320,
                ease: easeOutCubic,
            });
        },
        [reactFlow]
    );

    const handleNodeClick = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.stopPropagation();
            const center = getNodeCenter(node);
            const { zoom } = reactFlow.getViewport();
            reactFlow.setCenter(center.x, center.y, {
                zoom,
                duration: 260,
                ease: easeOutCubic,
            });
        },
        [reactFlow]
    );

    const nodeClassName = useCallback((node: Node) => {
        return cn("flow-minimap__node", `flow-minimap__node--${normalizeTypeName(node?.type)}`);
    }, []);

    return (
        <MiniMap
            pannable
            zoomable={false}
            ariaLabel="Policy overview minimap"
            className={cn("flow-minimap hidden sm:flex", className)}
            nodeBorderRadius={8}
            nodeStrokeWidth={1.4}
            nodeComponent={FlowMiniMapNode}
            nodeClassName={nodeClassName}
            maskColor="var(--flow-minimap-mask, rgba(15, 23, 42, 0.45))"
            maskStrokeColor="var(--flow-minimap-mask-stroke, rgba(255, 255, 255, 0.4))"
            maskStrokeWidth={1}
            onClick={handleMapClick}
            onNodeClick={handleNodeClick}
        />
    );
};

export default FlowMiniMap;

/**
 * Draws the default card-like silhouette for most nodes, including a faux header band and detail rows that hint at the
 * node's internal content density without incurring layout work.
 */
function StandardMiniMapShape({ x, y, width, height, borderRadius, className, selected, theme }: ShapeProps) {
    const safeWidth = Math.max(width, 6);
    const safeHeight = Math.max(height, 6);
    const headerHeight = Math.min(Math.max(safeHeight * 0.3, 6), 16);
    const detailStartY = headerHeight + 4;
    const detailGap = 3;
    const detailHeight = 2;
    const detailCount = Math.max(
        1,
        Math.min(3, Math.floor((safeHeight - detailStartY - 4) / (detailHeight + detailGap)))
    );

    return (
        <g transform={`translate(${x}, ${y})`} className={className}>
            <rect
                className="flow-minimap__shape"
                x={0.5}
                y={0.5}
                rx={borderRadius}
                ry={borderRadius}
                width={safeWidth - 1}
                height={safeHeight - 1}
                fill={theme.fill}
                stroke={selected ? theme.accent : theme.stroke}
                strokeWidth={selected ? 2 : 1.4}
            />
            <rect
                x={2}
                y={2}
                width={Math.max(safeWidth - 4, 0)}
                height={Math.max(headerHeight - 2, 4)}
                rx={Math.max(borderRadius - 2, 2)}
                fill={theme.accent}
                opacity={0.9}
            />
            {Array.from({ length: detailCount }).map((_, index) => (
                <rect
                    key={`detail-${index}`}
                    x={4}
                    y={detailStartY + index * (detailHeight + detailGap)}
                    width={Math.max(safeWidth - 8, 0)}
                    height={detailHeight}
                    rx={1}
                    fill={theme.detail}
                    opacity={0.85}
                />
            ))}
        </g>
    );
}

/**
 * Renders group containers as translucent, dashed outlines so they communicate hierarchy while staying visually light
 * enough to avoid hiding nested nodes on the minimap.
 */
function GroupMiniMapShape({ x, y, width, height, borderRadius, className, selected, theme }: ShapeProps) {
    const safeWidth = Math.max(width, 8);
    const safeHeight = Math.max(height, 8);
    const headerHeight = Math.min(Math.max(safeHeight * 0.18, 8), 20);

    return (
        <g transform={`translate(${x}, ${y})`} className={className}>
            <rect
                x={0.75}
                y={0.75}
                width={safeWidth - 1.5}
                height={safeHeight - 1.5}
                rx={borderRadius}
                ry={borderRadius}
                fill="transparent"
                stroke={selected ? theme.accent : theme.stroke}
                strokeWidth={selected ? 2 : 1.2}
                strokeDasharray="9 5"
                opacity={0.85}
            />
            <rect
                x={2}
                y={2}
                width={Math.max(safeWidth - 4, 0)}
                height={headerHeight}
                rx={Math.max(borderRadius - 3, 2)}
                fill={theme.accent}
                opacity={0.18}
            />
            <rect
                x={2}
                y={headerHeight + 4}
                width={Math.max(safeWidth - 4, 0)}
                height={Math.max(4, safeHeight * 0.05)}
                fill={theme.accent}
                opacity={0.1}
            />
        </g>
    );
}

/**
 * Gentle easing function we reuse for viewport transitions; keeps navigation snappy without feeling jarring.
 */
function easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Normalizes node type strings into kebab-case so they can be used safely inside CSS class names.
 */
function normalizeTypeName(type?: string) {
    if (!type) return "default";
    return type
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/[\s_]+/g, "-")
        .toLowerCase();
}

/**
 * Computes a node's visual centroid accounting for absolute positioning when available so panning animations land on
 * the element the user clicked inside the minimap.
 */
function getNodeCenter(node: Node): XYPosition {
    const width = node.width ?? 0;
    const height = node.height ?? 0;
    const { positionAbsolute } = node as NodeWithAbsolute;
    const origin = positionAbsolute ?? node.position;
    return {
        x: origin.x + width / 2,
        y: origin.y + height / 2,
    };
}
