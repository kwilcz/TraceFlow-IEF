import { describe, expect, it } from "vitest";
import {
    APP_INSIGHTS_AUTH_ERROR_MESSAGES,
    DEFAULT_AUTH_ERROR_MESSAGE,
    mapAppInsightsAuthError,
} from "@/lib/api/app-insights-auth-error";

describe("mapAppInsightsAuthError", () => {
    it("maps ApplicationNotFoundError from JSON string payload", () => {
        const payload = JSON.stringify({
            error: {
                message: "The application could not be found",
                code: "ApplicationNotFoundError",
            },
        });

        expect(mapAppInsightsAuthError(payload)).toBe(
            APP_INSIGHTS_AUTH_ERROR_MESSAGES.ApplicationNotFoundError,
        );
    });

    it("maps InsufficientAccessError from Error.message payload", () => {
        const payload = new Error(
            JSON.stringify({
                error: {
                    message:
                        "The provided credentials have insufficient access to perform the requested operation",
                    code: "InsufficientAccessError",
                },
            }),
        );

        expect(mapAppInsightsAuthError(payload)).toBe(
            APP_INSIGHTS_AUTH_ERROR_MESSAGES.InsufficientAccessError,
        );
    });

    it("returns generic fallback for unknown payloads", () => {
        expect(mapAppInsightsAuthError("Invalid API key")).toBe(
            DEFAULT_AUTH_ERROR_MESSAGE,
        );
        expect(mapAppInsightsAuthError({ error: { message: "Unknown" } })).toBe(
            DEFAULT_AUTH_ERROR_MESSAGE,
        );
    });
});
