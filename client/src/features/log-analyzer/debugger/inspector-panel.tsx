import { useShallow } from "zustand/react/shallow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLogStore } from "@/stores/log-store";
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
    const traceSteps = useLogStore(useShallow((s) => s.traceSteps));

    if (!selection) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Select a step to view details</p>
            </div>
        );
    }

    const step = traceSteps[selection.stepIndex];
    if (!step) return null;

    return (
        <ScrollArea className="h-full">
            <div className="px-3 pb-4">
                {selection.type === "step" && (
                    <StepRenderer step={step} selection={selection} dispatch={dispatch} />
                )}
                {selection.type === "technicalProfile" && (
                    <TpRenderer step={step} selection={selection} dispatch={dispatch} />
                )}
                {selection.type === "transformation" && (
                    <CtRenderer step={step} selection={selection} dispatch={dispatch} />
                )}
                {selection.type === "hrd" && (
                    <HrdRenderer step={step} selection={selection} dispatch={dispatch} />
                )}
                {selection.type === "displayControl" && (
                    <DcRenderer step={step} selection={selection} dispatch={dispatch} />
                )}
            </div>
        </ScrollArea>
    );
}
