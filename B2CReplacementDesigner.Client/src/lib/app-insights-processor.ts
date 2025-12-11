/**
 * Application Insights Log Processor
 *
 * Processes raw Application Insights table data into structured LogRecords
 * with parsed clips and journey data.
 */

import { AggregatedLogRow, CustomDimensions, LogRecord, RawLogRow } from "@/types/logs";
import { AppInsightsTable } from "@/lib/api/application-insights-client";
import {
    Clip,
    ClipsArray,
    GenericClip,
    isClip,
    KnownClipKind,
    HeadersContent,
    TransitionContent,
    HandlerResultContent,
    FatalExceptionContent,
    ExceptionContent,
    RecorderRecord,
    Statebag,
    StatebagEntry,
} from "@/types/journey-recorder";

const KNOWN_CLIP_KINDS: readonly KnownClipKind[] = [
    "Headers",
    "Transition",
    "Predicate",
    "Action",
    "HandlerResult",
    "FatalException",
] as const;

const generateFallbackId = (): string =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `log-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export class AppInsightsProcessor {
    static process(table?: AppInsightsTable): LogRecord[] {
        if (!table || !Array.isArray(table.rows) || table.rows.length === 0) {
            return [];
        }

        const rows = this.mapRows(table);
        const aggregated = this.aggregate(rows);
        return aggregated.map((entry) => this.toLogRecord(entry));
    }

    private static mapRows(table: AppInsightsTable): RawLogRow[] {
        const columnIndex = new Map<string, number>();
        table.columns.forEach((column, index) => columnIndex.set(column.name, index));

        const pickValue = (row: unknown[], ...names: string[]): unknown => {
            for (const name of names) {
                const idx = columnIndex.get(name);
                if (idx !== undefined) {
                    return row[idx];
                }
            }
            return undefined;
        };

        return table.rows.map((row) => {
            const customDimensionsRaw = pickValue(row, "customDimensions");
            const customDimensions = this.parseCustomDimensions(customDimensionsRaw);

            return {
                id: this.toStringSafe(pickValue(row, "id")) || generateFallbackId(),
                timestamp: this.toStringSafe(pickValue(row, "timestamp")),
                message: this.toStringSafe(pickValue(row, "message")),
                traceMessage: this.toStringSafe(pickValue(row, "traceMessage")),
                cloudRoleInstance: this.toStringSafe(pickValue(row, "cloudRoleInstance")),
                customDimensions,
                operationId: this.toStringSafe(pickValue(row, "operationId")),
                operationName: this.toStringSafe(pickValue(row, "operationName")),
            } satisfies RawLogRow;
        });
    }

    private static aggregate(rows: RawLogRow[]): AggregatedLogRow[] {
        const aggregated: AggregatedLogRow[] = [];
        rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        let concatenatedMessage = "";
        let entryStartRow: RawLogRow | null = null;
        let idParts: string[] = [];

        for (const row of rows) {
            const messagePart = row.traceMessage || row.message || "";
            const trimmed = messagePart.trim();
            const startsWithOpenBracket = trimmed.startsWith("[");
            const endsWithCloseBracket = trimmed.endsWith("]");

            // Case 1: Plain text message (not a JSON array) - create entry immediately
            if (!startsWithOpenBracket && entryStartRow === null) {
                aggregated.push({
                    compositeId: row.id,
                    idParts: [row.id],
                    timestamp: row.timestamp,
                    cloudRoleInstance: row.cloudRoleInstance,
                    concatenatedMessage: messagePart,
                    customDimensions: row.customDimensions,
                });
                continue;
            }

            // Case 2: New JSON array entry starts
            if (startsWithOpenBracket) {
                concatenatedMessage = messagePart;
                entryStartRow = row;
                idParts = [row.id];
            } else {
                // Case 3: Continuation of previous entry
                concatenatedMessage += messagePart;
                idParts.push(row.id);
            }

            // Entry is complete when we see the closing bracket
            if (endsWithCloseBracket && entryStartRow) {
                aggregated.push({
                    compositeId: idParts.join(":"),
                    idParts: idParts,
                    timestamp: entryStartRow.timestamp,
                    cloudRoleInstance: entryStartRow.cloudRoleInstance,
                    concatenatedMessage: concatenatedMessage,
                    customDimensions: entryStartRow.customDimensions,
                });
                concatenatedMessage = "";
                entryStartRow = null;
                idParts = [];
            }
        }

        // Handle any incomplete entry at the end
        if (entryStartRow && concatenatedMessage) {
            aggregated.push({
                compositeId: idParts.join(":"),
                idParts: idParts,
                timestamp: entryStartRow.timestamp,
                cloudRoleInstance: entryStartRow.cloudRoleInstance,
                concatenatedMessage: concatenatedMessage,
                customDimensions: entryStartRow.customDimensions,
            });
        }

        return aggregated;
    }

    private static toLogRecord(entry: AggregatedLogRow): LogRecord {
        const { parsedPayload, clips } = this.parsePayload(entry.concatenatedMessage);
        const timestamp = new Date(entry.timestamp);
        const customDimensions = entry.customDimensions ?? ({} as CustomDimensions);
        const policyId = customDimensions.userJourney || "Unknown";
        const correlationId = customDimensions.correlationId || entry.idParts[0] || entry.compositeId;

        return {
            id: entry.compositeId || entry.idParts.join(":"),
            timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
            policyId,
            correlationId,
            cloudRoleInstance: entry.cloudRoleInstance,
            rawIds: entry.idParts,
            payloadText: entry.concatenatedMessage,
            parsedPayload,
            clips,
            customDimensions,
        } satisfies LogRecord;
    }

    /**
     * Parses the payload string into structured data.
     * Handles JSON parsing and clips extraction with edge cases.
     */
    private static parsePayload(payload: string): { parsedPayload: unknown; clips: ClipsArray } {
        if (!payload || typeof payload !== "string") {
            return { parsedPayload: payload, clips: [] };
        }

        const trimmed = payload.trim();
        if (!trimmed) {
            return { parsedPayload: "", clips: [] };
        }

        try {
            const parsed = JSON.parse(trimmed);
            const clips = this.parseClipsArray(parsed);
            return { parsedPayload: parsed, clips };
        } catch {
            return { parsedPayload: trimmed, clips: [] };
        }
    }

    /**
     * Parses and validates a clips array from parsed JSON.
     */
    private static parseClipsArray(parsed: unknown): ClipsArray {
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.map((item) => this.parseClip(item)).filter((clip): clip is Clip => clip !== null);
    }

    /**
     * Parses a single clip object with type validation.
     * Returns a typed clip for known types or a generic clip for unknown types.
     */
    private static parseClip(item: unknown): Clip | null {
        if (!isClip(item)) {
            return null;
        }

        const kind = item.Kind;
        const content = item.Content;

        if (KNOWN_CLIP_KINDS.includes(kind as KnownClipKind)) {
            return this.parseKnownClip(kind as KnownClipKind, content);
        }

        return {
            Kind: kind,
            Content: content,
        } satisfies GenericClip;
    }

    /**
     * Parses a known clip type with proper content validation.
     */
    private static parseKnownClip(kind: KnownClipKind, content: unknown): Clip {
        switch (kind) {
            case "Headers":
                return {
                    Kind: "Headers",
                    Content: this.parseHeadersContent(content),
                };
            case "Transition":
                return {
                    Kind: "Transition",
                    Content: this.parseTransitionContent(content),
                };
            case "Predicate":
                return {
                    Kind: "Predicate",
                    Content: this.toStringSafe(content),
                };
            case "Action":
                return {
                    Kind: "Action",
                    Content: this.toStringSafe(content),
                };
            case "HandlerResult":
                return {
                    Kind: "HandlerResult",
                    Content: this.parseHandlerResultContent(content),
                };
            case "FatalException":
                return {
                    Kind: "FatalException",
                    Content: this.parseFatalExceptionContent(content),
                };
            default:
                return { Kind: kind, Content: content } satisfies GenericClip;
        }
    }

    /**
     * Parses Headers clip content.
     * Note: Headers does NOT contain CurrentOrchestrationStep, TargetEntity,
     * or ClaimsProviderProtocolProviderType - those come from Statebag.
     */
    private static parseHeadersContent(content: unknown): HeadersContent {
        if (!content || typeof content !== "object") {
            return {
                UserJourneyRecorderEndpoint: "",
                CorrelationId: "",
                EventInstance: "",
                TenantId: "",
                PolicyId: "",
            };
        }

        const raw = content as Record<string, unknown>;

        return {
            UserJourneyRecorderEndpoint: this.toStringSafe(raw.UserJourneyRecorderEndpoint),
            CorrelationId: this.toStringSafe(raw.CorrelationId),
            EventInstance: this.toStringSafe(raw.EventInstance),
            TenantId: this.toStringSafe(raw.TenantId),
            PolicyId: this.toStringSafe(raw.PolicyId),
        };
    }

    /**
     * Parses Transition clip content.
     */
    private static parseTransitionContent(content: unknown): TransitionContent {
        if (!content || typeof content !== "object") {
            return { EventName: "", StateName: "" };
        }

        const raw = content as Record<string, unknown>;

        return {
            EventName: this.toStringSafe(raw.EventName),
            StateName: this.toStringSafe(raw.StateName),
        };
    }

    /**
     * Parses HandlerResult clip content with corrected schema.
     */
    private static parseHandlerResultContent(content: unknown): HandlerResultContent {
        if (!content || typeof content !== "object") {
            return { Result: false };
        }

        const raw = content as Record<string, unknown>;
        const result: HandlerResultContent = {
            Result: raw.Result === true,
        };

        // PredicateResult is a string ("True" or "False"), not boolean
        if (typeof raw.PredicateResult === "string") {
            result.PredicateResult = raw.PredicateResult;
        }

        if (raw.RecorderRecord && typeof raw.RecorderRecord === "object") {
            result.RecorderRecord = this.parseRecorderRecord(raw.RecorderRecord);
        }

        if (raw.Statebag && typeof raw.Statebag === "object") {
            result.Statebag = this.parseStatebag(raw.Statebag);
        }

        if (raw.Exception && typeof raw.Exception === "object") {
            result.Exception = this.parseException(raw.Exception);
        }

        return result;
    }

    /**
     * Parses Statebag with proper entry structure.
     * Statebag entries have: { c, k, v, p } structure.
     */
    private static parseStatebag(statebag: unknown): Statebag {
        if (!statebag || typeof statebag !== "object") {
            return {};
        }

        const raw = statebag as Record<string, unknown>;
        const result: Statebag = {};

        for (const [key, value] of Object.entries(raw)) {
            if (value === null || value === undefined) {
                continue;
            }

            // Complex-CLMS is a direct dictionary without metadata wrapper
            if (key === "Complex-CLMS" && typeof value === "object") {
                result["Complex-CLMS"] = value as Record<string, string>;
                continue;
            }

            // ComplexItems is a simple string
            if (key === "ComplexItems" && typeof value === "string") {
                result.ComplexItems = value;
                continue;
            }

            // Standard statebag entries have { c, k, v, p } structure
            if (typeof value === "object" && this.isStatebagEntryShape(value)) {
                result[key] = value as StatebagEntry;
                continue;
            }

            // Fallback: store as-is for unknown structures
            result[key] = value as StatebagEntry;
        }

        return result;
    }

    /**
     * Check if value has the shape of a StatebagEntry.
     */
    private static isStatebagEntryShape(value: unknown): boolean {
        if (typeof value !== "object" || value === null) {
            return false;
        }
        const obj = value as Record<string, unknown>;
        return "c" in obj && "k" in obj && "v" in obj && "p" in obj;
    }

    /**
     * Parses FatalException clip content.
     */
    private static parseFatalExceptionContent(content: unknown): FatalExceptionContent {
        if (!content || typeof content !== "object") {
            return {
                Exception: { Message: "Unknown error" },
                Time: new Date().toISOString(),
            };
        }

        const raw = content as Record<string, unknown>;

        return {
            Exception:
                raw.Exception && typeof raw.Exception === "object"
                    ? this.parseException(raw.Exception)
                    : { Message: "Unknown error" },
            Time: typeof raw.Time === "string" ? raw.Time : new Date().toISOString(),
        };
    }

    /**
     * Parses a RecorderRecord object.
     */
    private static parseRecorderRecord(record: unknown): RecorderRecord {
        if (!record || typeof record !== "object") {
            return { Values: [] };
        }

        const raw = record as Record<string, unknown>;

        if (!Array.isArray(raw.Values)) {
            return { Values: [] };
        }

        return {
            Values: raw.Values.map((entry) => this.parseRecorderRecordEntry(entry)),
        };
    }

    /**
     * Parses a single RecorderRecord entry.
     */
    private static parseRecorderRecordEntry(entry: unknown): { Key: string; Value: unknown } {
        if (!entry || typeof entry !== "object") {
            return { Key: "", Value: null };
        }

        const raw = entry as Record<string, unknown>;

        return {
            Key: this.toStringSafe(raw.Key),
            Value: raw.Value,
        };
    }

    /**
     * Parses an Exception object recursively.
     */
    private static parseException(exception: unknown): ExceptionContent {
        if (!exception || typeof exception !== "object") {
            return { Message: "Unknown error" };
        }

        const raw = exception as Record<string, unknown>;
        const result: ExceptionContent = {
            Message: this.toStringSafe(raw.Message) || "Unknown error",
        };

        if (raw.Data && typeof raw.Data === "object") {
            result.Data = raw.Data as ExceptionContent["Data"];
        }

        if (raw.Exception && typeof raw.Exception === "object") {
            result.Exception = this.parseException(raw.Exception);
        }

        return result;
    }

    private static parseCustomDimensions(value: unknown): CustomDimensions {
        if (!value) {
            return {
                correlationId: "",
                eventName: "",
                tenant: "",
                userJourney: "",
                version: "",
            };
        }

        let parsed: Record<string, unknown> = {};
        if (typeof value === "string") {
            try {
                parsed = JSON.parse(value);
            } catch {
                return {
                    correlationId: "",
                    eventName: "",
                    tenant: "",
                    userJourney: "",
                    version: "",
                };
            }
        } else if (typeof value === "object") {
            parsed = value as Record<string, unknown>;
        } else {
            return {
                correlationId: "",
                eventName: "",
                tenant: "",
                userJourney: "",
                version: "",
            };
        }

        return {
            correlationId: this.extractString(parsed, ["CorrelationId", "correlationId", "operation_Id"]),
            eventName: this.extractString(parsed, ["EventName", "eventName"]),
            tenant: this.extractString(parsed, ["TenantId", "Tenant", "tenant"]),
            userJourney: this.extractString(parsed, ["PolicyId", "UserJourney", "userJourney", "policyId"]),
            version: this.extractString(parsed, ["Version", "version"]),
        };
    }

    private static extractString(source: Record<string, unknown>, keys: string[]): string {
        for (const key of keys) {
            const value = source[key];
            if (typeof value === "string" && value.trim()) {
                return value.trim();
            }
        }
        return "";
    }

    private static toStringSafe(value: unknown): string {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value);
    }
}
