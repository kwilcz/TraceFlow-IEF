import { useShallow } from "zustand/react/shallow";
import { useLogStore } from "@/stores/log-store";
import { useDebuggerContext } from "./debugger-context";
import {
    StepPanel,
    TechnicalProfilePanel,
    ClaimsTransformationPanel,
    HrdPanel,
    DisplayControlPanel,
} from "@/components/policy-logs/panels";

// ============================================================================
// Inspector Panel
// ============================================================================

/**
 * Center column of the debugger workspace.
 *
 * Routes to the appropriate detail panel based on the current debugger
 * selection type. All panels are pre-existing, theme-safe components from
 * `@/components/policy-logs/panels`.
 */
export function InspectorPanel() {
    const { selection } = useDebuggerContext();
    const traceSteps = useLogStore(useShallow((s) => s.traceSteps));

    if (!selection) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Select a step to view details</p>
            </div>
        );
    }

    const selectedStep = traceSteps[selection.stepIndex];
    if (!selectedStep) return null;

    const previousStep = selection.stepIndex > 0 ? traceSteps[selection.stepIndex - 1] : null;

    switch (selection.type) {
        case "step":
            return <StepPanel step={selectedStep} previousStep={previousStep} />;
        case "technicalProfile":
            return selection.itemId ? (
                <TechnicalProfilePanel step={selectedStep} tpId={selection.itemId} />
            ) : null;
        case "transformation":
            return selection.itemId ? (
                <ClaimsTransformationPanel step={selectedStep} ctId={selection.itemId} />
            ) : null;
        case "hrd":
            return <HrdPanel step={selectedStep} />;
        case "displayControl": {
            const dcId = selection.metadata?.displayControlId;
            if (typeof dcId === "string" && dcId) {
                return (
                    <DisplayControlPanel
                        step={selectedStep}
                        displayControlId={dcId}
                        action={selection.metadata?.action as string | undefined}
                    />
                );
            }
            return null;
        }
        default:
            return null;
    }
}
