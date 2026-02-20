import { describe, expect, it } from "vitest";
import { selectionReducer } from "@/features/log-analyzer/debugger/debugger-context";
import type { Selection, SelectionAction } from "@/features/log-analyzer/debugger/types";

describe("selectionReducer", () => {
    const existingSelection: Selection = { type: "step", stepIndex: 0 };

    describe("select-step", () => {
        it("produces a step selection from null", () => {
            const result = selectionReducer(null, { type: "select-step", stepIndex: 3 });
            expect(result).toEqual({ type: "step", stepIndex: 3 });
        });

        it("overwrites an existing selection", () => {
            const result = selectionReducer(existingSelection, { type: "select-step", stepIndex: 5 });
            expect(result).toEqual({ type: "step", stepIndex: 5 });
        });
    });

    describe("select-tp", () => {
        it("produces a technicalProfile selection", () => {
            const result = selectionReducer(null, { type: "select-tp", stepIndex: 1, tpId: "TP-SignIn" });
            expect(result).toEqual({ type: "technicalProfile", stepIndex: 1, itemId: "TP-SignIn" });
        });

        it("overwrites an existing selection", () => {
            const result = selectionReducer(existingSelection, { type: "select-tp", stepIndex: 2, tpId: "TP-Read" });
            expect(result).toEqual({ type: "technicalProfile", stepIndex: 2, itemId: "TP-Read" });
        });
    });

    describe("select-ct", () => {
        it("produces a transformation selection", () => {
            const result = selectionReducer(null, { type: "select-ct", stepIndex: 4, ctId: "CT-CreateEmail" });
            expect(result).toEqual({ type: "transformation", stepIndex: 4, itemId: "CT-CreateEmail" });
        });
    });

    describe("select-hrd", () => {
        it("produces an hrd selection", () => {
            const result = selectionReducer(null, { type: "select-hrd", stepIndex: 2 });
            expect(result).toEqual({ type: "hrd", stepIndex: 2 });
        });
    });

    describe("select-dc", () => {
        it("produces a displayControl selection with metadata", () => {
            const metadata = { displayControlId: "captcha", action: "Verify" };
            const result = selectionReducer(null, {
                type: "select-dc",
                stepIndex: 1,
                dcId: "captcha",
                metadata,
            });
            expect(result).toEqual({
                type: "displayControl",
                stepIndex: 1,
                itemId: "captcha",
                metadata,
            });
        });
    });

    describe("clear", () => {
        it("returns null from an existing selection", () => {
            const result = selectionReducer(existingSelection, { type: "clear" });
            expect(result).toBeNull();
        });

        it("returns null from null", () => {
            const result = selectionReducer(null, { type: "clear" });
            expect(result).toBeNull();
        });
    });

    describe("unknown action", () => {
        it("returns state unchanged", () => {
            const result = selectionReducer(existingSelection, { type: "unknown" } as unknown as SelectionAction);
            expect(result).toBe(existingSelection);
        });

        it("returns null state unchanged", () => {
            const result = selectionReducer(null, { type: "unknown" } as unknown as SelectionAction);
            expect(result).toBeNull();
        });
    });
});
