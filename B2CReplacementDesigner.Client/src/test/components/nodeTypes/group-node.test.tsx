import React from "react";
import { render } from "@testing-library/react";
import { ReactFlowProvider, NodeProps } from "@xyflow/react";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import GroupNodeComponent, { GroupNode } from "@components/nodeTypes/group-node";
import { createGroupNodeFixture, createHandlePositions, resetFixtureCounters } from "@/test/fixtures/node-fixtures";

const updateNodeInternalsMock = vi.fn();

vi.mock("@xyflow/react", async () => {
    const actual = await vi.importActual<typeof import("@xyflow/react")>("@xyflow/react");

    return {
        ...actual,
        useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
        useNodes: () => [],
        useUpdateNodeInternals: () => updateNodeInternalsMock,
    };
});

const createGroupProps = (overrides?: Partial<NodeProps<GroupNode>>) =>
    ({
        ...createGroupNodeFixture({ id: "group-1" }),
        ...createHandlePositions(),
        positionAbsolute: { x: 0, y: 0 },
        positionAbsoluteX: 0,
        positionAbsoluteY: 0,
        selected: false,
        dragging: false,
        isConnectable: true,
        zIndex: 0,
        draggingHandle: null,
        measured: { width: 320, height: 240 },
        ...overrides,
    }) as unknown as NodeProps<GroupNode>;

describe("GroupNode", () => {
    beforeEach(() => {
        updateNodeInternalsMock.mockClear();
        resetFixtureCounters();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("updates node internals when mounted and when collapse state changes", () => {
        const { rerender } = render(
            <ReactFlowProvider>
                <GroupNodeComponent {...createGroupProps()} />
            </ReactFlowProvider>
        );

        expect(updateNodeInternalsMock).toHaveBeenCalledWith("group-1");

        updateNodeInternalsMock.mockClear();

        rerender(
            <ReactFlowProvider>
                <GroupNodeComponent
                    {...createGroupProps({ data: { isCollapsed: true, label: "Group 1", details: {} } })}
                />
            </ReactFlowProvider>
        );

        expect(updateNodeInternalsMock).toHaveBeenCalledWith("group-1");
    });

    it("queues a delayed handle measurement flush to capture transition effects", () => {
        vi.useFakeTimers();

        render(
            <ReactFlowProvider>
                <GroupNodeComponent {...createGroupProps()} />
            </ReactFlowProvider>
        );

        expect(updateNodeInternalsMock).toHaveBeenCalledTimes(1);

        vi.runOnlyPendingTimers();

        expect(updateNodeInternalsMock).toHaveBeenCalledTimes(2);
    });
});
