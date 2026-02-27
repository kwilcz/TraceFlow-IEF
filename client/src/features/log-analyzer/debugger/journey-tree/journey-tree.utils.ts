import type { TreeNode } from "../types";

/** Collect default expanded node IDs (journey containers + steps). */
export function collectDefaultExpandedIds(nodes: TreeNode[]): Set<string> {
    const ids = new Set<string>();
    const stack = [...nodes];
    while (stack.length > 0) {
        const node = stack.pop()!;
        if (node.type === "userjourney" || node.type === "subjourney" || node.type === "step") {
            ids.add(node.id);
        }
        if (node.children) {
            stack.push(...node.children);
        }
    }
    return ids;
}
