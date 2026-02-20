import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useResizer } from "@/features/log-analyzer/debugger/use-resizer";

// ============================================================================
// Storage key used by the hook
// ============================================================================

const STORAGE_KEY = "debugger-split-ratio";

beforeEach(() => {
    window.localStorage.clear();
});

afterEach(() => {
    window.localStorage.clear();
});

// ============================================================================
// Tests
// ============================================================================

describe("useResizer", () => {
    describe("default split ratio", () => {
        it("returns 0.6 when localStorage is empty", () => {
            const { result } = renderHook(() => useResizer());
            expect(result.current.splitRatio).toBe(0.6);
        });

        it("returns 0.6 when localStorage has invalid value", () => {
            window.localStorage.setItem(STORAGE_KEY, "not-a-number");
            const { result } = renderHook(() => useResizer());
            expect(result.current.splitRatio).toBe(0.6);
        });
    });

    describe("localStorage persistence", () => {
        it("reads a persisted ratio on mount", () => {
            window.localStorage.setItem(STORAGE_KEY, "0.45");
            const { result } = renderHook(() => useResizer());
            expect(result.current.splitRatio).toBe(0.45);
        });

        it("persists ratio after keyboard adjustment", () => {
            const { result } = renderHook(() => useResizer());

            // Simulate ArrowDown (increase ratio by 0.05)
            act(() => {
                result.current.resizerProps.onKeyDown({
                    key: "ArrowDown",
                    preventDefault: vi.fn(),
                } as unknown as React.KeyboardEvent<HTMLDivElement>);
            });

            expect(result.current.splitRatio).toBe(0.65);
            expect(window.localStorage.getItem(STORAGE_KEY)).toBe("0.65");
        });
    });

    describe("clamping at min/max", () => {
        it("clamps stored values below minimum to 0.2", () => {
            window.localStorage.setItem(STORAGE_KEY, "0.05");
            const { result } = renderHook(() => useResizer());
            expect(result.current.splitRatio).toBe(0.2);
        });

        it("clamps stored values above maximum to 0.8", () => {
            window.localStorage.setItem(STORAGE_KEY, "0.99");
            const { result } = renderHook(() => useResizer());
            expect(result.current.splitRatio).toBe(0.8);
        });

        it("does not go below 0.2 via keyboard", () => {
            window.localStorage.setItem(STORAGE_KEY, "0.2");
            const { result } = renderHook(() => useResizer());

            act(() => {
                result.current.resizerProps.onKeyDown({
                    key: "ArrowUp",
                    preventDefault: vi.fn(),
                } as unknown as React.KeyboardEvent<HTMLDivElement>);
            });

            expect(result.current.splitRatio).toBe(0.2);
        });

        it("does not go above 0.8 via keyboard", () => {
            window.localStorage.setItem(STORAGE_KEY, "0.8");
            const { result } = renderHook(() => useResizer());

            act(() => {
                result.current.resizerProps.onKeyDown({
                    key: "ArrowDown",
                    preventDefault: vi.fn(),
                } as unknown as React.KeyboardEvent<HTMLDivElement>);
            });

            expect(result.current.splitRatio).toBe(0.8);
        });

        it("Home jumps to minimum", () => {
            const { result } = renderHook(() => useResizer());

            act(() => {
                result.current.resizerProps.onKeyDown({
                    key: "Home",
                    preventDefault: vi.fn(),
                } as unknown as React.KeyboardEvent<HTMLDivElement>);
            });

            expect(result.current.splitRatio).toBe(0.2);
        });

        it("End jumps to maximum", () => {
            const { result } = renderHook(() => useResizer());

            act(() => {
                result.current.resizerProps.onKeyDown({
                    key: "End",
                    preventDefault: vi.fn(),
                } as unknown as React.KeyboardEvent<HTMLDivElement>);
            });

            expect(result.current.splitRatio).toBe(0.8);
        });
    });

    describe("ARIA attributes", () => {
        it("exposes correct ARIA values", () => {
            window.localStorage.setItem(STORAGE_KEY, "0.5");
            const { result } = renderHook(() => useResizer());

            expect(result.current.resizerProps.role).toBe("separator");
            expect(result.current.resizerProps["aria-label"]).toBe("Resize workspace panels");
            expect(result.current.resizerProps["aria-valuenow"]).toBe(50);
            expect(result.current.resizerProps["aria-valuemin"]).toBe(20);
            expect(result.current.resizerProps["aria-valuemax"]).toBe(80);
            expect(result.current.resizerProps["aria-orientation"]).toBe("horizontal");
            expect(result.current.resizerProps.tabIndex).toBe(0);
        });
    });
});
