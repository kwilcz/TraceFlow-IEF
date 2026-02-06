import { createFileRoute } from "@tanstack/react-router";
import { ReactFlowProvider } from "@xyflow/react";
import { lazy, Suspense } from "react";

const TabbedPolicyFlow = lazy(() => import("@components/tabbed-policy-flow"));

export const Route = createFileRoute("/b2c/policy-graph")({
    component: PolicyGraphPage,
});

// TODO: Expand the fallback with a proper skeleton loader
function PolicyGraphPage() {
    return (
        <ReactFlowProvider>
            <Suspense fallback={<div className="h-96 flex items-center justify-center">Loading policy flow...</div>}>
                <TabbedPolicyFlow />
            </Suspense>
        </ReactFlowProvider>
    );
}
