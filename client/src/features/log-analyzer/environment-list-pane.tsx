import { Button } from "@/components/ui/button";
import type { LogCredentialEnvironment } from "@/types/logs";

type EnvironmentListPaneProps = {
    environments: LogCredentialEnvironment[];
    selectedEnvironmentId: string | null;
    activeEnvironmentId: string | null;
    onSelectEnvironment: (environmentId: string) => void;
    onAddEnvironment: () => void;
    disabled?: boolean;
};

export const EnvironmentListPane = ({
    environments,
    selectedEnvironmentId,
    activeEnvironmentId,
    onSelectEnvironment,
    onAddEnvironment,
    disabled = false,
}: EnvironmentListPaneProps) => {
    return (
        <div className="min-w-0 space-y-3 rounded-3xl border border-border bg-default/40 p-3">
            <div className="px-1 text-sm font-semibold text-foreground">Environments</div>
            <div className="space-y-2">
                {environments.length > 0 ? (
                    environments.map((environment) => {
                        const isSelected = environment.id === selectedEnvironmentId;
                        return (
                            <Button
                                key={environment.id}
                                variant={isSelected ? "secondary" : "ghost"}
                                className="h-auto w-full justify-between rounded-2xl px-3 py-3"
                                aria-pressed={isSelected}
                                disabled={disabled}
                                onClick={() => onSelectEnvironment(environment.id)}
                            >
                                <span className="truncate text-left">{environment.name}</span>
                                <span className="flex items-center gap-2">
                                    {environment.id === activeEnvironmentId ? (
                                        <span className="inline-flex shrink-0 items-center rounded-2xl border px-2 py-0.5 text-xs font-medium text-foreground">
                                            Active
                                        </span>
                                    ) : null}
                                </span>
                            </Button>
                        );
                    })
                ) : (
                    <div className="rounded-2xl border border-dashed border-border px-3 py-4 text-sm text-muted">
                        No environments saved yet.
                    </div>
                )}
                <Button
                    variant="ghost"
                    className="h-auto w-full justify-start rounded-2xl border border-dashed border-border px-3 py-3"
                    disabled={disabled}
                    onClick={onAddEnvironment}
                >
                    + Add New
                </Button>
            </div>
        </div>
    );
};
