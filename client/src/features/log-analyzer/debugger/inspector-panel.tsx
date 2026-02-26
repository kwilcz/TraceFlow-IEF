import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLogStore } from "@/stores/log-store";
import { buildFlowNodeIndex } from "@/lib/trace/domain/flow-node-utils";
import { FlowNodeType } from "@/types/flow-node";
import { useDebuggerContext } from "./debugger-context";
import {
    StepRenderer,
    TpRenderer,
    CtRenderer,
    HrdRenderer,
    DcRenderer,
} from "./inspector/renderers";

// ============================================================================
// Inspector Panel
// ============================================================================

/**
 * Center column of the debugger workspace.
 *
 * Routes to the appropriate type-adaptive renderer based on the current
 * debugger selection type. Each renderer composes the shared inspector
 * primitives (header, breadcrumb, sections) into a layout tailored to
 * the selected entity type.
 */
export function InspectorPanel() {
    const { selection, dispatch } = useDebuggerContext();
    const flowTree = useLogStore(useShallow((s) => s.flowTree));

    const nodeIndex = useMemo(
        () => (flowTree ? buildFlowNodeIndex(flowTree) : new Map()),
        [flowTree],
    );

    if (!selection) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Select a step to view details</p>
            </div>
        );
    }

    const stepNode = nodeIndex.get(selection.stepIndex);
    if (!stepNode || stepNode.data.type !== FlowNodeType.Step) return null;

    return (
        <ScrollArea className="h-full">
            <div className="px-3 pb-4">
                {selection.type === "step" && (
                    <StepRenderer stepNode={stepNode} selection={selection} dispatch={dispatch} />
                )}
                {selection.type === "technicalProfile" && (
                    <TpRenderer stepNode={stepNode} selection={selection} dispatch={dispatch} />
                )}
                {selection.type === "transformation" && (
                    <CtRenderer stepNode={stepNode} selection={selection} dispatch={dispatch} />
                )}
                {selection.type === "hrd" && (
                    <HrdRenderer stepNode={stepNode} selection={selection} dispatch={dispatch} />
                )}
                {selection.type === "displayControl" && (
                    <DcRenderer stepNode={stepNode} selection={selection} dispatch={dispatch} />
                )}
            </div>
        </ScrollArea>
    );
}
