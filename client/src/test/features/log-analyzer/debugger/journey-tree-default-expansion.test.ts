import { describe, expect, it } from "vitest";
import type { TreeNode } from "@/features/log-analyzer/debugger/types";
import { collectDefaultExpandedIds } from "@/features/log-analyzer/debugger/journey-tree/journey-tree.utils";

function node(id: string, type: TreeNode["type"], children?: TreeNode[]): TreeNode {
    return {
        id,
        type,
        label: id,
        children,
    };
}

describe("collectDefaultExpandedIds", () => {
    it("expands userjourney, subjourney, and step nodes by default", () => {
        const tree: TreeNode[] = [
            node("root-journey", "userjourney", [
                node("sj-1", "subjourney", [
                    node("step-1", "step", [
                        node("tp-1", "technicalProfile"),
                        node("ct-1", "transformation"),
                    ]),
                ]),
            ]),
        ];

        const expanded = collectDefaultExpandedIds(tree);

        expect(expanded.has("root-journey")).toBe(true);
        expect(expanded.has("sj-1")).toBe(true);
        expect(expanded.has("step-1")).toBe(true);
        expect(expanded.has("tp-1")).toBe(false);
        expect(expanded.has("ct-1")).toBe(false);
    });
});
