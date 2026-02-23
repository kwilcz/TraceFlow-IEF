import { InspectorSection } from "../inspector-section";
import { CopyButton } from "../../shared";

// ============================================================================
// Validation TPs Section — lists validation technical profiles
// ============================================================================

interface ValidationTpsSectionProps {
    validationTps: string[];
}

export function ValidationTpsSection({ validationTps }: ValidationTpsSectionProps) {
    if (validationTps.length === 0) return null;

    return (
        <InspectorSection title="Validation Technical Profiles" count={validationTps.length}>
            {validationTps.map((tp) => (
                <div key={tp} className="group flex items-center justify-between py-1">
                    <span className="text-xs font-mono text-violet-700 dark:text-violet-300 truncate">
                        {tp}
                    </span>
                    <CopyButton value={tp} label="VTP ID" />
                </div>
            ))}
        </InspectorSection>
    );
}
