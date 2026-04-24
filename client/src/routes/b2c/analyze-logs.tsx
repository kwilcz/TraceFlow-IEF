import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LogAnalyzerLanding } from "@/features/log-analyzer/log-analyzer-landing.tsx";
import { LogAnalyzerWorkspace } from "@/features/log-analyzer/log-analyzer-workspace.tsx";
import { LogAnalyzerDialog } from "@/features/log-analyzer/log-analyzer-dialog.tsx";
import { useLogStore } from "@/stores/log-store";
import { useCredentialPersistence } from "@/hooks/use-credential-persistence";

const CONNECTED_ENVIRONMENT_ID = "connected-environment";
const CONNECTED_ENVIRONMENT_NAME = "Connected environment";

export const Route = createFileRoute("/b2c/analyze-logs")({
    component: AnalyzeLogsPage,
});

/**
 * Route-level orchestrator for the log analyzer feature.
 *
 * Responsibilities:
 * - Restores persisted credential environments into the store on mount.
 * - Derives connected state from the active environment in the store.
 * - Renders either the landing page or the workspace depending on connection status.
 * - Manages the connection dialog lifecycle.
 */
function AnalyzeLogsPage() {
    const [dialogOpen, setDialogOpen] = React.useState(false);

    const credentials = useLogStore((state) => state.credentials);
    const activeEnvironmentId = useLogStore((state) => state.activeEnvironmentId);
    const setCredentialEnvironments = useLogStore((state) => state.setCredentialEnvironments);
    const { loadCredentialEnvironments } = useCredentialPersistence();

    const isConnected = Boolean(
        activeEnvironmentId &&
        credentials.applicationId.trim() &&
        credentials.apiKey.trim(),
    );

    // Restore persisted credential environments on mount (runs once).
    React.useEffect(() => {
        const stored = loadCredentialEnvironments();
        if (stored.environments.length > 0) {
            setCredentialEnvironments(stored);
        }
        // Persistence helpers are stable module-level functions; store actions come from Zustand.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleConnect = (creds: { applicationId: string; apiKey: string }) => {
        const stored = loadCredentialEnvironments();
        if (stored.environments.length > 0) {
            // The dialog persists before calling onConnect, so the route re-reads storage here
            // to hydrate the full saved environment record instead of only the raw credentials.
            setCredentialEnvironments(stored);
            return;
        }

        setCredentialEnvironments({
            activeEnvironmentId: CONNECTED_ENVIRONMENT_ID,
            environments: [
                {
                    id: CONNECTED_ENVIRONMENT_ID,
                    name: CONNECTED_ENVIRONMENT_NAME,
                    authType: "app-insights",
                    applicationId: creds.applicationId,
                    apiKey: creds.apiKey,
                    persist: false,
                },
            ],
        });
    };

    return (
        <>
            {isConnected ? (
                <LogAnalyzerWorkspace onOpenSettings={() => setDialogOpen(true)} />
            ) : (
                <LogAnalyzerLanding onConnectClick={() => setDialogOpen(true)} />
            )}

            <LogAnalyzerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onConnect={handleConnect}
            />
        </>
    );
}
