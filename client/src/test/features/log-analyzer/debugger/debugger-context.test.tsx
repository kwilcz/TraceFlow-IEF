import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
    DebuggerProvider,
    useDebuggerContext,
} from "@/features/log-analyzer/debugger/debugger-context";

describe("useDebuggerContext", () => {
    beforeEach(() => {
        cleanup();
    });

    it("throws when used outside DebuggerProvider", () => {
        expect(() => renderHook(() => useDebuggerContext())).toThrow(
            "useDebuggerContext must be used within a <DebuggerProvider>",
        );
    });

    it("returns context when used inside DebuggerProvider", () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <DebuggerProvider>{children}</DebuggerProvider>
        );

        const { result } = renderHook(() => useDebuggerContext(), { wrapper });

        expect(result.current.selection).toBeNull();
        expect(typeof result.current.dispatch).toBe("function");
    });

    it("dispatch updates selection state", () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <DebuggerProvider>{children}</DebuggerProvider>
        );

        const { result } = renderHook(() => useDebuggerContext(), { wrapper });

        act(() => {
            result.current.dispatch({ type: "select-step", stepIndex: 2 });
        });

        expect(result.current.selection).toEqual({ type: "step", stepIndex: 2 });
    });

    it("dispatch clear resets selection to null", () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <DebuggerProvider>{children}</DebuggerProvider>
        );

        const { result } = renderHook(() => useDebuggerContext(), { wrapper });

        act(() => {
            result.current.dispatch({ type: "select-tp", stepIndex: 1, tpId: "TP-1" });
        });
        expect(result.current.selection).not.toBeNull();

        act(() => {
            result.current.dispatch({ type: "clear" });
        });
        expect(result.current.selection).toBeNull();
    });
});
