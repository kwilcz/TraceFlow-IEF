import { CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { InspectorSection } from "../inspector-section";
import { CopyButton } from "../../shared";

// ============================================================================
// Available Providers Section — selectable identity providers for HRD nodes
// ============================================================================

interface AvailableProvidersSectionProps {
    providers: string[];
    selectedOption?: string;
}

export function AvailableProvidersSection({
    providers,
    selectedOption,
}: AvailableProvidersSectionProps) {
    if (providers.length === 0) return null;

    return (
        <InspectorSection title="Available Identity Providers" count={providers.length}>
            {providers.map((provider) => {
                const isSelected = provider === selectedOption;
                return (
                    <div
                        key={provider}
                        className="group flex items-center justify-between py-1"
                    >
                        <div className="flex items-center gap-1.5 min-w-0">
                            {isSelected ? (
                                <CheckCircleIcon
                                    weight="fill"
                                    className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0"
                                />
                            ) : (
                                <CircleIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            )}
                            <span
                                className={cn(
                                    "text-xs font-mono truncate",
                                    isSelected
                                        ? "text-emerald-700 dark:text-emerald-300 font-medium"
                                        : "text-foreground",
                                )}
                            >
                                {provider}
                            </span>
                        </div>
                        <CopyButton value={provider} label="Provider" />
                    </div>
                );
            })}
        </InspectorSection>
    );
}
