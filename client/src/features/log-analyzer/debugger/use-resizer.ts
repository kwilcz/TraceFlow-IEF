import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "debugger-split-ratio";
const DEFAULT_RATIO = 0.6;
const MIN_RATIO = 0.2;
const MAX_RATIO = 0.8;
const STEP = 0.05;

// ============================================================================
// Helpers
// ============================================================================

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function readStoredRatio(): number {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) return DEFAULT_RATIO;
        const parsed = Number(raw);
        if (Number.isNaN(parsed)) return DEFAULT_RATIO;
        return clamp(parsed, MIN_RATIO, MAX_RATIO);
    } catch {
        return DEFAULT_RATIO;
    }
}

function persistRatio(ratio: number): void {
    try {
        localStorage.setItem(STORAGE_KEY, String(ratio));
    } catch {
        // localStorage unavailable — silently ignore
    }
}

// ============================================================================
// Hook
// ============================================================================

export interface UseResizerResult {
    /** Current split ratio (0.2–0.8). Top panel = ratio, bottom = 1 - ratio. */
    splitRatio: number;
    /** Props to spread onto the resizer drag-handle element. */
    resizerProps: {
        role: "separator";
        "aria-label": string;
        "aria-valuenow": number;
        "aria-valuemin": number;
        "aria-valuemax": number;
        "aria-orientation": "horizontal";
        tabIndex: 0;
        onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
    };
    /** Ref to attach to the outer container (needed for height measurement). */
    containerRef: React.RefCallback<HTMLDivElement>;
}

/**
 * Manages the vertical split between the top (tree + inspector) and bottom
 * (statebag / claims-diff) panels of the debugger workspace.
 *
 * - rAF-based pointer tracking for smooth 60 fps dragging
 * - ARIA `role="separator"` with keyboard support (↑/↓ ±5 %, Home/End)
 * - Persists the ratio to localStorage
 * - Applies `--split-ratio` CSS custom property on the container
 */
export function useResizer(): UseResizerResult {
    const [splitRatio, setSplitRatio] = useState<number>(readStoredRatio);

    // Refs for drag state — avoids re-renders during drag
    const containerElRef = useRef<HTMLDivElement | null>(null);
    const draggingRef = useRef(false);
    const rafIdRef = useRef<number>(0);
    const pendingRatioRef = useRef<number>(splitRatio);

    // ── Container ref callback (also applies CSS var) ───────────────────
    const containerRef = useCallback(
        (node: HTMLDivElement | null) => {
            containerElRef.current = node;
            if (node) {
                node.style.setProperty("--split-ratio", String(splitRatio));
            }
        },
        [splitRatio],
    );

    // Keep CSS var in sync when splitRatio changes (post-drag commit)
    useEffect(() => {
        const el = containerElRef.current;
        if (el) {
            el.style.setProperty("--split-ratio", String(splitRatio));
        }
    }, [splitRatio]);

    // ── Commit: flush pending ratio to React state + persist ────────────
    const commit = useCallback((ratio: number) => {
        const clamped = Math.round(clamp(ratio, MIN_RATIO, MAX_RATIO) * 100) / 100;
        setSplitRatio(clamped);
        persistRatio(clamped);
    }, []);

    // ── Pointer handlers ────────────────────────────────────────────────
    const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);
        draggingRef.current = true;

        // Add will-change hint for GPU compositing during drag
        const container = containerElRef.current;
        if (container) {
            container.style.willChange = "flex-basis";
        }

        const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
            if (!draggingRef.current || !container) return;
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = requestAnimationFrame(() => {
                const rect = container.getBoundingClientRect();
                if (rect.height === 0) return;
                const y = moveEvent.clientY - rect.top;
                const ratio = clamp(y / rect.height, MIN_RATIO, MAX_RATIO);
                pendingRatioRef.current = ratio;
                container.style.setProperty("--split-ratio", String(ratio));
            });
        };

        const onPointerUp = () => {
            draggingRef.current = false;
            try { target.releasePointerCapture(e.pointerId); } catch { /* already released */ }
            if (container) {
                container.style.willChange = "";
            }
            commit(pendingRatioRef.current);

            document.removeEventListener("pointermove", onPointerMove);
            document.removeEventListener("pointerup", onPointerUp);
        };

        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
    }, [commit]);

    // ── Keyboard handler ────────────────────────────────────────────────
    const onKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            let next: number | null = null;

            switch (e.key) {
                case "ArrowUp":
                    next = clamp(splitRatio - STEP, MIN_RATIO, MAX_RATIO);
                    break;
                case "ArrowDown":
                    next = clamp(splitRatio + STEP, MIN_RATIO, MAX_RATIO);
                    break;
                case "Home":
                    next = MIN_RATIO;
                    break;
                case "End":
                    next = MAX_RATIO;
                    break;
                default:
                    return; // don't prevent default for unhandled keys
            }

            e.preventDefault();
            commit(next);
        },
        [splitRatio, commit],
    );

    // ── Cleanup rAF on unmount ──────────────────────────────────────────
    useEffect(() => {
        return () => cancelAnimationFrame(rafIdRef.current);
    }, []);

    return {
        splitRatio,
        resizerProps: {
            role: "separator" as const,
            "aria-label": "Resize workspace panels",
            "aria-valuenow": Math.round(splitRatio * 100),
            "aria-valuemin": Math.round(MIN_RATIO * 100),
            "aria-valuemax": Math.round(MAX_RATIO * 100),
            "aria-orientation": "horizontal" as const,
            tabIndex: 0 as const,
            onPointerDown,
            onKeyDown,
        },
        containerRef,
    };
}
