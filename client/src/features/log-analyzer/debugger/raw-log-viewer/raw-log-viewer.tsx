import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// NOTE: useEffect kept for View Source navigation (cross-component coordination via context)
import { CopyIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLogStore } from "@/stores/log-store";
import { getLogsForFlow } from "@/lib/trace";
import { formatJsonPayload } from "@/lib/formatters/json-formatters";
import { useDebuggerContext } from "../debugger-context";
import { RawLogCode } from "./raw-log-code";
import type { LogRecord } from "@/types/logs";

// ============================================================================
// Raw Log Viewer — full JSON viewer for flow log records
// ============================================================================

/** Extract the event instance (e.g. "Event:AUTH") from the log's Headers clip. */
function getEventInstance(log: LogRecord): string {
    const headers = log.clips.find((c) => c.Kind === "Headers");
    if (!headers) return "";
    const content = headers.Content as { EventInstance?: string };
    return content.EventInstance ?? "";
}

/**
 * Displays the raw JSON contents of all `LogRecord`s in the selected flow.
 *
 * Features:
 * - Nested tab bar when the flow contains multiple log records
 * - Syntax-highlighted JSON with line numbers (via `RawLogCode`)
 * - Copy JSON button in a compact toolbar
 * - Auto-navigation via `targetLogId` from the debugger context ("View Source" flow)
 *
 * Only the active log page is rendered (unmounted tabs have no content).
 */
export function RawLogViewer() {
    const { targetLogId, setTargetLogId } = useDebuggerContext();

    const logs = useLogStore((s) => s.logs);
    const selectedFlowId = useLogStore((s) => s.selectedFlow?.id);
    const userFlows = useLogStore((s) => s.userFlows);

    // ── Derive flow logs ────────────────────────────────────────────────
    const flowLogs = useMemo(() => {
        if (!selectedFlowId) return [];
        return getLogsForFlow(logs, selectedFlowId, userFlows);
    }, [logs, selectedFlowId, userFlows]);

    // ── Active log index ────────────────────────────────────────────────
    // Reset when flow changes is handled by key={selectedFlowId} on <RawLogViewer>
    const [activeLogIndex, setActiveLogIndex] = useState(0);

    // ── "View Source" auto-navigation ───────────────────────────────────
    useEffect(() => {
        if (!targetLogId || flowLogs.length === 0) return;

        const idx = flowLogs.findIndex((log) => log.id === targetLogId);
        if (idx >= 0) {
            setActiveLogIndex(idx);
        }
        setTargetLogId(null);
    }, [targetLogId, flowLogs, setTargetLogId]);

    // ── Per-logId JSON format cache ──────────────────────────────────────
    // Cache is fresh on mount; component remounts on flow change via key={selectedFlowId}
    const activeLog = flowLogs[activeLogIndex] ?? null;
    const jsonCacheRef = useRef(new Map<string, string>());

    // eslint-disable-next-line react-hooks/exhaustive-deps -- cache lookup uses activeLog but only recomputes on id change
    const formattedJson = useMemo(() => {
        if (!activeLog) return "";
        const existing = jsonCacheRef.current.get(activeLog.id);
        if (existing !== undefined) return existing;
        const formatted = formatJsonPayload(activeLog.parsedPayload);
        jsonCacheRef.current.set(activeLog.id, formatted);
        return formatted;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: use .id for referential stability
    }, [activeLog?.id]);

    // ── Line count for footer ────────────────────────────────────────────
    const lineCount = useMemo(() => {
        if (!formattedJson) return 0;
        let count = 1;
        for (let i = 0; i < formattedJson.length; i++) {
            if (formattedJson.charCodeAt(i) === 10) count++;
        }
        return count;
    }, [formattedJson]);

    // ── Copy handler ────────────────────────────────────────────────────
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(formattedJson).then(
            () => toast.success("JSON copied to clipboard"),
            () => toast.error("Failed to copy JSON"),
        );
    }, [formattedJson]);

    // ── Empty state ─────────────────────────────────────────────────────
    if (!selectedFlowId || flowLogs.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No flow selected
            </div>
        );
    }

    return (
        <Tabs
            value={String(activeLogIndex)}
            onValueChange={(v) => setActiveLogIndex(Number(v))}
            className="flex flex-col h-full overflow-hidden min-h-0 gap-0"
        >
            {/* ── Header: Log tab bar (flat variant) ─────────────────────── */}
            <TabsList variant="flat" className="shrink-0 text-xs">
                {flowLogs.map((log, idx) => {
                    const event = getEventInstance(log);
                    return (
                        <TabsTrigger
                            key={idx}
                            value={String(idx)}
                            className="text-xs px-3 py-1 whitespace-nowrap"
                        >
                            Log {idx + 1}{event ? `: ${event}` : ""}
                        </TabsTrigger>
                    );
                })}
            </TabsList>

            {/* ── Scrollable JSON content ───────────────────────────────────── */}
            <TabsContent
                key={activeLogIndex}
                value={String(activeLogIndex)}
                className="relative flex-1 min-h-0"
            >
                <RawLogCode code={formattedJson} />
                <Button
                    onClick={handleCopy}
                    size="icon-md"
                    variant="tertiary"
                    className="absolute top-2 right-4 z-10 p-1.5"
                    title="Copy JSON to clipboard"
                >
                    <CopyIcon />
                </Button>
            </TabsContent>

            {/* ── Footer ───────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-3 py-1 border-t border-border text-[10px] text-muted-foreground shrink-0">
                <span>{lineCount.toLocaleString()} lines</span>
                <span>Log {activeLogIndex + 1}/{flowLogs.length}</span>
            </div>
        </Tabs>
    );
}
