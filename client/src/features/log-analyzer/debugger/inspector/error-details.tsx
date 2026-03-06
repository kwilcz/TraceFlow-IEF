import { useState } from "react";
import { XCircleIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import type { StepError } from "@/types/flow-node";
import type { GlobalFlowError, UiSettings } from "@/types/trace";

// ============================================================================
// ErrorDetails — unified error card for inspector renderers
// ============================================================================

export interface ErrorDetailsProps {
    errorType?: string;
    kind?: "Handled" | "Unhandled";
    message?: string;
    /** WITHOUT "0x" prefix; callers normalize empty → undefined */
    hResult?: string;
    errorCode?: string;
    description?: string;
    diagnostics?: string;
    /** Structured key-value extra data (e.g. Exception.Data) */
    data?: Record<string, unknown>;
}

export function ErrorDetails({ errorType, kind, message, hResult, errorCode, description, diagnostics, data }: ErrorDetailsProps) {
    return (
        <div className="bg-danger/10 border border-danger/40 rounded-md p-3 space-y-2">
            {/* Header row — always rendered */}
            <div className="flex items-center gap-2">
                <XCircleIcon className="text-danger w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold text-danger">
                    {errorType ?? "Exception"}
                </span>
                {kind === "Unhandled" && (
                    <Badge variant="destructive">Unhandled</Badge>
                )}
                {kind === "Handled" && (
                    <Badge variant="outline" className="border-danger/40 text-danger">Handled</Badge>
                )}
            </div>

            {/* Message */}
            {message && (
                <p className="text-sm text-foreground">{message}</p>
            )}

            {/* HResult */}
            {hResult && (
                <LabelValueRow label="HResult" value={`0x${hResult}`} mono />
            )}

            {/* Error Code */}
            {errorCode && (
                <LabelValueRow label="Error Code" value={errorCode} mono />
            )}

            {/* Description */}
            {description && (
                <LabelValueRow label="Description / URL" value={description} />
            )}

            {/* Diagnostics */}
            {diagnostics && (
                <JsonDataSection label="Diagnostics" json={diagnostics} />
            )}

            {/* Exception.Data */}
            {data && (
                <JsonDataSection label="Data" json={data} />
            )}
        </div>
    );
}

// ============================================================================
// Adapter functions
// ============================================================================

/** Normalize StepError → ErrorDetailsProps */
export function fromStepError(err: StepError): ErrorDetailsProps {
    return {
        kind: err.kind,
        message: err.message || undefined,
        hResult: err.hResult || undefined,
        data: err.data,
    };
}

/** Normalize GlobalFlowError → ErrorDetailsProps */
export function fromGlobalFlowError(ge: GlobalFlowError): ErrorDetailsProps {
    return {
        errorType: ge.errorType,
        message: ge.message || undefined,
        hResult: ge.hResult || undefined,
        errorCode: ge.errorCode,
        description: ge.description,
        diagnostics: ge.diagnostics,
    };
}

/** Normalize UiSettings inline error → ErrorDetailsProps | null. Returns null if no error data. */
export function fromUiSettingsError(ui: UiSettings): ErrorDetailsProps | null {
    if (!ui.errorMessage && !ui.errorCode && !ui.errorHResult) return null;
    return {
        message: ui.errorMessage,
        errorCode: ui.errorCode,
        hResult: ui.errorHResult || undefined,
    };
}

// ============================================================================
// Shared sub-components
// ============================================================================

/**
 * Collapsible key-value section for JSON data (Exception.Data, diagnostics).
 * Collapsed by default; matches the ▸/▾ toggle pattern used in StatebagSection.
 */
function JsonDataSection({ label, json }: { label: string; json: Record<string, unknown> | string | undefined }) {
    const [open, setOpen] = useState(false);

    if (!json) return null;

    let entries: [string, unknown][];
    let parseError = false;

    if (typeof json === "string") {
        try {
            const parsed = JSON.parse(json) as unknown;
            if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
                entries = Object.entries(parsed as Record<string, unknown>);
            } else {
                // Parsed but not a plain object — fall back to raw display
                entries = [];
                parseError = true;
            }
        } catch {
            entries = [];
            parseError = true;
        }
    } else {
        entries = Object.entries(json);
    }

    const count = parseError ? 0 : entries.length;

    return (
        <div className="space-y-0.5">
            <button
                type="button"
                onClick={() => setOpen((s) => !s)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
                {open ? "▾ Hide" : "▸ Show"} {label}
                {!parseError && count > 0 && (
                    <span className="font-normal ml-1">({count} {count === 1 ? "item" : "items"})</span>
                )}
            </button>

            {open && (
                parseError ? (
                    <pre className="text-xs font-mono bg-muted/50 rounded p-2 overflow-auto whitespace-pre-wrap break-all max-h-48">
                        {typeof json === "string" ? json : JSON.stringify(json, null, 2)}
                    </pre>
                ) : (
                    <div className="mt-1 border border-border/50 rounded overflow-hidden">
                        {entries.map(([key, value]) => (
                            <div
                                key={key}
                                className="grid grid-cols-[minmax(140px,35%)_1fr] gap-x-2 px-2 py-1 even:bg-muted/30 items-start"
                            >
                                <span className="text-xs font-mono text-muted-foreground truncate" title={key}>
                                    {key}
                                </span>
                                <span className="text-xs font-mono break-all">
                                    {value === null ? "(null)" : value === "" ? "(empty)" : String(value)}
                                </span>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

interface LabelValueRowProps {
    label: string;
    value: string;
    mono?: boolean;
}

function LabelValueRow({ label, value, mono = false }: LabelValueRowProps) {
    return (
        <div className="flex items-start gap-2 py-0.5">
            <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
            <span
                className={`text-xs break-all ${mono ? "font-mono" : ""}`}
                title={value}
            >
                {value}
            </span>
        </div>
    );
}
