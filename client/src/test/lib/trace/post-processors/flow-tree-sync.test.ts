import { describe, it, expect } from "vitest";

// flow-tree-sync is deprecated — FlowNode tree is now the source of truth.
// The module is an empty stub; all sync logic was removed.
// These tests are skipped because syncFlowTreeFromSteps no longer exists.

describe.skip("syncFlowTreeFromSteps (DEPRECATED)", () => {
    it("was deprecated — FlowNode tree is now the source of truth", () => {
        expect(true).toBe(true);
    });
});
