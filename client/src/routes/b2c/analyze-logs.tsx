import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LogAnalyzerLanding } from "@/features/log-analyzer/log-analyzer-landing.tsx";
import { LogAnalyzerWorkspace } from "@/features/log-analyzer/log-analyzer-workspace.tsx";
import { LogAnalyzerDialog } from "@/features/log-analyzer/log-analyzer-dialog.tsx";
import { useLogStore } from "@/stores/log-store";
import { useCredentialPersistence } from "@/hooks/use-credential-persistence";

export const Route = createFileRoute("/b2c/analyze-logs")({
    component: AnalyzeLogsPage,
});

/**
 * Route-level orchestrator for the log analyzer feature.
 *
 * Responsibilities:
 * - Restores persisted credentials into the store on mount.
 * - Derives connected state from the store.
 * - Renders either the landing page or the workspace depending on connection status.
 * - Manages the connection dialog lifecycle.
 */
function AnalyzeLogsPage() {
    const [dialogOpen, setDialogOpen] = React.useState(false);

    const credentials = useLogStore((state) => state.credentials);
    const setCredentials = useLogStore((state) => state.setCredentials);
    const { loadCredentials } = useCredentialPersistence();

    const isConnected = Boolean(credentials.applicationId.trim() && credentials.apiKey.trim());

    // Restore persisted credentials on mount (runs once).
    React.useEffect(() => {
        const stored = loadCredentials();
        if (stored?.applicationId && stored?.apiKey) {
            setCredentials({ applicationId: stored.applicationId, apiKey: stored.apiKey });
        }
        // loadCredentials is a stable module-level function; setCredentials is from Zustand.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleConnect = (creds: { applicationId: string; apiKey: string }) => {
        setCredentials(creds);
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
