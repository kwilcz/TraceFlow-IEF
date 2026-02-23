import { Badge } from "@/components/ui/badge";
import { InspectorSection } from "../inspector-section";

// ============================================================================
// Provider Details Section — shows provider type & protocol for TP nodes
// ============================================================================

interface ProviderDetailsSectionProps {
    providerType: string;
    protocolType?: string;
}

export function ProviderDetailsSection({ providerType, protocolType }: ProviderDetailsSectionProps) {
    return (
        <InspectorSection title="Provider Details">
            <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground">Provider</span>
                <Badge variant="outline" className="text-xs font-mono">
                    {providerType}
                </Badge>
            </div>
            {protocolType && (
                <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-muted-foreground">Protocol</span>
                    <Badge variant="outline" className="text-xs font-mono">
                        {protocolType}
                    </Badge>
                </div>
            )}
        </InspectorSection>
    );
}
