import { Position, type Edge, type Node } from "@xyflow/react";
import { NODE_TYPES } from "@components/nodeTypes";

let nodeIndex = 0;
let edgeIndex = 0;

interface BaseNodeData extends Record<string, unknown> {
    label?: string;
    isCollapsed?: boolean;
    details?: unknown;
}

export interface NodeFixtureOptions<TData extends BaseNodeData = BaseNodeData> {
    id?: string;
    type?: Node["type"];
    data?: TData;
    position?: { x: number; y: number };
    width?: number;
    height?: number;
    parentId?: string;
}

export const createNodeFixture = <TData extends BaseNodeData = BaseNodeData>(
    options?: NodeFixtureOptions<TData>
): Node<TData> => {
    const id = options?.id ?? `node-${++nodeIndex}`;

    return {
        id,
        type: options?.type ?? NODE_TYPES.GROUP,
        data: {
            label: options?.data?.label ?? id,
            isCollapsed: options?.data?.isCollapsed ?? false,
            details: options?.data?.details ?? {},
            ...options?.data,
        },
        position: options?.position ?? { x: 0, y: 0 },
        width: options?.width,
        height: options?.height,
        measured: options?.width && options?.height ? { width: options.width, height: options.height } : undefined,
        parentId: options?.parentId,
    } as Node<TData>;
};

interface EdgeFixtureOptions {
    id?: string;
    source?: string;
    target?: string;
    sourceHandle?: string;
    targetHandle?: string;
    animated?: boolean;
}

export const createEdgeFixture = (options?: EdgeFixtureOptions): Edge => {
    const id = options?.id ?? `edge-${++edgeIndex}`;
    const source = options?.source ?? `node-${edgeIndex}`;
    const target = options?.target ?? `node-${edgeIndex + 1}`;

    return {
        id,
        source,
        target,
        sourceHandle: options?.sourceHandle,
        targetHandle: options?.targetHandle,
        animated: options?.animated ?? false,
    };
};

export const resetFixtureCounters = () => {
    nodeIndex = 0;
    edgeIndex = 0;
};

export const createGroupNodeFixture = (options?: NodeFixtureOptions) =>
    createNodeFixture({
        type: NODE_TYPES.GROUP,
        data: {
            label: options?.data?.label ?? "Group",
            isCollapsed: options?.data?.isCollapsed ?? false,
            details: options?.data?.details ?? {},
            ...options?.data,
        },
        width: options?.width ?? 320,
        height: options?.height ?? 240,
        ...options,
    });

export const createHandlePositions = (overrides?: Partial<Record<"targetPosition" | "sourcePosition", Position>>) => ({
    targetPosition: overrides?.targetPosition ?? Position.Top,
    sourcePosition: overrides?.sourcePosition ?? Position.Bottom,
});
