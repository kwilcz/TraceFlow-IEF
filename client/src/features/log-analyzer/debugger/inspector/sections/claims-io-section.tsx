import { InspectorSection } from "../inspector-section";
import { CopyButton } from "../../shared";

// ============================================================================
// Claims I/O Section — input claims, input parameters, output claims
// ============================================================================

interface ClaimsIoSectionProps {
    inputClaims?: Array<{ claimType: string; value: string }>;
    inputParameters?: Array<{ id: string; value: string }>;
    outputClaims?: Array<{ claimType: string; value: string }>;
}

/** Renders a single claim/parameter key-value row. */
function ClaimKvRow({
    label,
    value,
    muted = false,
}: {
    label: string;
    value: string;
    muted?: boolean;
}) {
    return (
        <div className="group flex items-center justify-between gap-2 py-0.5">
            <span className="text-xs font-mono text-muted-foreground shrink-0">
                {label}
            </span>
            <div className="flex items-center gap-1 min-w-0">
                <span
                    className={
                        muted
                            ? "text-xs font-mono text-muted-foreground/70 truncate"
                            : "text-xs font-mono truncate"
                    }
                >
                    {value || "(empty)"}
                </span>
                <CopyButton value={value} label={label} />
            </div>
        </div>
    );
}

export function ClaimsIoSection({
    inputClaims,
    inputParameters,
    outputClaims,
}: ClaimsIoSectionProps) {
    const hasInputs =
        (inputClaims && inputClaims.length > 0) ||
        (inputParameters && inputParameters.length > 0);
    const hasOutputs = outputClaims && outputClaims.length > 0;

    if (!hasInputs && !hasOutputs) return null;

    return (
        <>
            {hasInputs && (
                <InspectorSection title="Input Claims / Parameters">
                    {inputClaims && inputClaims.length > 0 && (
                        <div className="space-y-0.5">
                            {inputClaims.map((c, i) => (
                                <ClaimKvRow
                                    key={`${c.claimType}-${i}`}
                                    label={c.claimType}
                                    value={c.value}
                                />
                            ))}
                        </div>
                    )}
                    {inputParameters && inputParameters.length > 0 && (
                        <div className="space-y-0.5 mt-2">
                            {inputParameters.map((p, i) => (
                                <ClaimKvRow
                                    key={`${p.id}-${i}`}
                                    label={p.id}
                                    value={p.value}
                                    muted
                                />
                            ))}
                        </div>
                    )}
                </InspectorSection>
            )}

            {hasOutputs && (
                <InspectorSection title="Output Claims">
                    <div className="space-y-0.5">
                        {outputClaims!.map((c, i) => (
                            <ClaimKvRow
                                key={`${c.claimType}-${i}`}
                                label={c.claimType}
                                value={c.value}
                            />
                        ))}
                    </div>
                </InspectorSection>
            )}
        </>
    );
}
