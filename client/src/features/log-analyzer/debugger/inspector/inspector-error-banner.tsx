import { XCircleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

// ============================================================================
// Inspector Error Banner
// ============================================================================

interface InspectorErrorBannerProps {
    /** Primary error message shown in the banner summary. */
    message: string;
    /** Optional HRESULT code (e.g. "80070005"). */
    hResult?: string;
    /** Optional extended developer-facing message. */
    developerMessage?: string;
}

/**
 * Top-of-panel error banner with expandable details.
 *
 * The banner is always visible when rendered. A "Details" toggle reveals
 * the HResult and/or developer message. Expansion state resets whenever
 * the primary `message` changes.
 */
export function InspectorErrorBanner({ message, hResult, developerMessage }: InspectorErrorBannerProps) {
    const [expanded, setExpanded] = useState(false);

    // Reset expansion when the error message changes.
    useEffect(() => {
        setExpanded(false);
    }, [message]);

    const hasDetails = !!(hResult || developerMessage);

    return (
        <div className="bg-destructive-soft border-l-3 border-l-destructive px-3 py-2 rounded-r-md">
            <div className="flex items-start gap-2">
                <XCircleIcon className="w-4 h-4 text-destructive shrink-0 mt-0.5" />

                <div className="min-w-0 flex-1">
                    <p className="text-sm text-destructive-foreground truncate" title={message}>
                        {message}
                    </p>

                    {hasDetails && (
                        <button
                            type="button"
                            className="text-xs text-destructive underline cursor-pointer mt-0.5"
                            onClick={() => setExpanded((prev) => !prev)}
                        >
                            {expanded ? "Hide details" : "Details"}
                        </button>
                    )}

                    {expanded && hasDetails && (
                        <div className="mt-2 space-y-1 font-mono text-xs text-destructive-foreground">
                            {hResult && (
                                <p>
                                    <span className="font-semibold">HResult:</span> 0x{hResult}
                                </p>
                            )}
                            {developerMessage && (
                                <p className="whitespace-pre-wrap wrap-break-word">{developerMessage}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
