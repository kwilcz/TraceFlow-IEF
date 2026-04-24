import { describe, expect, it, vi } from "vitest";
import {
    APP_INSIGHTS_AUTH_ERROR_MESSAGES,
    DEFAULT_AUTH_ERROR_MESSAGE,
} from "@/lib/api/app-insights-auth-error";
import {
    AppInsightsCredentialValidationError,
    validateAppInsightsCredentials,
} from "@/features/log-analyzer/services/credential-validation-service";

describe("validateAppInsightsCredentials", () => {
    it("uses a minimal query footprint for validation", async () => {
        const query = vi.fn().mockResolvedValue({ tables: [] });

        await validateAppInsightsCredentials(
            { applicationId: "app-id", apiKey: "api-key" },
            { query },
        );

        expect(query).toHaveBeenCalledWith({
            applicationId: "app-id",
            apiKey: "api-key",
            maxRows: 1,
            policyIds: [],
            searchText: undefined,
            timespan: "PT5M",
        });
    });

    it("rethrows auth failures as user-facing messages", async () => {
        const originalError = new Error(
            JSON.stringify({
                error: {
                    code: "ApplicationNotFoundError",
                    message: "missing app",
                },
            }),
        );
        const query = vi.fn().mockRejectedValue(
            originalError,
        );

        await expect(
            validateAppInsightsCredentials(
                { applicationId: "app-id", apiKey: "api-key" },
                { query },
            ),
        ).rejects.toMatchObject({
            message: APP_INSIGHTS_AUTH_ERROR_MESSAGES.ApplicationNotFoundError,
            cause: originalError,
            name: "AppInsightsCredentialValidationError",
        });
    });

    it("falls back to the generic mapped auth message for unknown failures", async () => {
        const originalError = new Error("ECONNRESET");
        const query = vi.fn().mockRejectedValue(originalError);

        await expect(
            validateAppInsightsCredentials(
                { applicationId: "app-id", apiKey: "api-key" },
                { query },
            ),
        ).rejects.toMatchObject({
            message: DEFAULT_AUTH_ERROR_MESSAGE,
            cause: originalError,
            name: "AppInsightsCredentialValidationError",
        });
    });

    it("preserves the original error object as cause", async () => {
        const originalError = new TypeError("socket closed");
        const query = vi.fn().mockRejectedValue(originalError);

        try {
            await validateAppInsightsCredentials(
                { applicationId: "app-id", apiKey: "api-key" },
                { query },
            );
            expect.fail("expected validation to throw");
        } catch (error) {
            expect(error).toBeInstanceOf(AppInsightsCredentialValidationError);
            expect((error as AppInsightsCredentialValidationError).cause).toBe(
                originalError,
            );
        }
    });
});
