import { describe, it, expect, beforeEach, vi } from "vitest";
import useReactFlowStore from "@hooks/use-react-flow-store";
import { GROUP_NODE_COLLAPSED_HEIGHT } from "@/constants/node-layout";
import { createGroupNodeFixture, resetFixtureCounters } from "@/test/fixtures/node-fixtures";

const dagreLayoutMock = vi.fn((nodes) => ({ nodes, edges: [] }));

vi.mock("@lib/dagre-policy-layout", () => ({
    DagreLayout: class {
        applyLayout = dagreLayoutMock;
    },
}));

describe("useReactFlowStore.toggleCollapse", () => {
    beforeEach(() => {
        dagreLayoutMock.mockClear();
        resetFixtureCounters();
        useReactFlowStore.setState({
            nodes: [createGroupNodeFixture({ id: "group-1", width: 360, height: 280 })],
            edges: [],
            nodesCollapsed: false,
        });
    });

    it("sets collapsed height to the group collapsed constant", () => {
        useReactFlowStore.getState().toggleCollapse("group-1");

        const collapsedNode = useReactFlowStore.getState().nodes[0];
        expect(collapsedNode.data?.isCollapsed).toBe(true);
        expect(collapsedNode.height).toBe(GROUP_NODE_COLLAPSED_HEIGHT);
        expect(collapsedNode.measured?.height).toBe(GROUP_NODE_COLLAPSED_HEIGHT);
    });
});
