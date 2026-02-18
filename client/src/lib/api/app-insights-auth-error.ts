const APP_INSIGHTS_AUTH_ERROR_MESSAGES: Record<string, string> = {
    ApplicationNotFoundError:
        "We couldn’t find that Application Insights app. Verify the Application ID and try again.",
    InsufficientAccessError:
        "The provided API key doesn’t have enough permissions. Update the key scopes and try again.",
};

const DEFAULT_AUTH_ERROR_MESSAGE =
    "Unable to connect with the provided credentials. Verify the Application ID and API key, then try again.";

type ErrorPayload = {
    error?: {
        code?: unknown;
        message?: unknown;
    };
    code?: unknown;
    message?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const tryParseJson = (value: string): unknown => {
    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
};

const extractCodeFromPayload = (payload: unknown): string | null => {
    if (!isRecord(payload)) {
        return null;
    }

    const typedPayload = payload as ErrorPayload;

    if (typeof typedPayload.error?.code === "string") {
        return typedPayload.error.code;
    }

    if (typeof typedPayload.code === "string") {
        return typedPayload.code;
    }

    return null;
};

const extractKnownCode = (error: unknown): string | null => {
    if (error instanceof Error) {
        const parsedMessage = tryParseJson(error.message);
        const codeFromMessage = extractCodeFromPayload(parsedMessage);
        if (codeFromMessage) {
            return codeFromMessage;
        }

        return extractCodeFromPayload(error);
    }

    if (typeof error === "string") {
        const parsed = tryParseJson(error);
        return extractCodeFromPayload(parsed);
    }

    return extractCodeFromPayload(error);
};

export const mapAppInsightsAuthError = (error: unknown): string => {
    const code = extractKnownCode(error);

    if (code && APP_INSIGHTS_AUTH_ERROR_MESSAGES[code]) {
        return APP_INSIGHTS_AUTH_ERROR_MESSAGES[code];
    }

    return DEFAULT_AUTH_ERROR_MESSAGE;
};

export { APP_INSIGHTS_AUTH_ERROR_MESSAGES, DEFAULT_AUTH_ERROR_MESSAGE };
