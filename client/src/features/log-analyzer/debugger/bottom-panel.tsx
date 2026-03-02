import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLogStore } from "@/stores/log-store";
import { useDebuggerContext } from "./debugger-context";
import type { BottomTab } from "./debugger-context";
import { ClaimsDiffTable } from "./claims-diff-table";
import { RawLogViewer } from "./raw-log-viewer";

// ============================================================================
// Bottom Panel — tabbed container for Claims Diff + Raw Log
// ============================================================================

/**
 * Tabbed bottom panel in the debugger workspace.
 *
 * Contains two tabs:
 * - **Claims Diff** (default): existing claims diff table
 * - **Raw Log**: full JSON viewer for all log records in the selected flow
 *
 * The active tab is controlled by `DebuggerContext.activeBottomTab` so that
 * the "View Source" action in the inspector can programmatically switch tabs.
 */
export function BottomPanel() {
    const { activeBottomTab, setActiveBottomTab } = useDebuggerContext();
    const selectedFlowId = useLogStore((s) => s.selectedFlow?.id);

    return (
        <Tabs
            value={activeBottomTab}
            onValueChange={(v) => setActiveBottomTab(v as BottomTab)}
            className="h-full overflow-hidden min-h-0 gap-0"
        >
            <TabsList variant="line" className="shrink-0 text-xs">
                <TabsTrigger value="claims-diff" className="text-xs px-3 py-1">
                    Claims Diff
                </TabsTrigger>
                <TabsTrigger value="raw-log" className="text-xs px-3 py-1">
                    Raw Log
                </TabsTrigger>
            </TabsList>

            <TabsContent value="claims-diff" className="flex-1 min-h-0">
                <ClaimsDiffTable />
            </TabsContent>

            <TabsContent
                value="raw-log"
                className="flex-1 min-h-0"
                keepMounted={false}
            >
                <RawLogViewer key={selectedFlowId} />
            </TabsContent>
        </Tabs>
    );
}
