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
}

export function ErrorDetails({ errorType, kind, message, hResult, errorCode, description, diagnostics }: ErrorDetailsProps) {
    return (
        <div className="bg-danger/10 border border-danger/40 rounded-md p-3 space-y-2">
            {/* Header row — always rendered */}
            <div className="flex items-center gap-2">
                <XCircleIcon className="text-danger w-4 h-4 shrink-0" />
                {errorType && (
                    <span className="text-sm font-semibold text-danger">{errorType}</span>
                )}
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
                <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground">Diagnostics</span>
                    <pre className="text-xs font-mono bg-muted/50 rounded p-2 overflow-auto whitespace-pre-wrap break-all max-h-48">
                        {diagnostics}
                    </pre>
                </div>
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
// Shared sub-component
// ============================================================================

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
