import { describe, it, expect } from "vitest";
import { AppInsightsProcessor } from "@/lib/app-insights-processor";
import { AppInsightsTable } from "@/lib/api/application-insights-client";
import {
  isHeadersClip,
  isTransitionClip,
  isHandlerResultClip,
  isFatalExceptionClip,
  type HeadersClip,
  type TransitionClip,
  type HandlerResultClip,
  type FatalExceptionClip,
} from "@/types/journey-recorder";

/**
 * Helper to create test Application Insights table data.
 * The actual data format from Application Insights has clips as a JSON array
 * in the message field with { Kind, Content } structure.
 */
function createTestTable(rows: unknown[][]): AppInsightsTable {
  return {
    name: "PrimaryResult",
    columns: [
      { name: "id" },
      { name: "timestamp" },
      { name: "message" },
      { name: "customDimensions" },
      { name: "operationId" },
      { name: "cloudRoleInstance" },
    ],
    rows,
  };
}

function createTestRow(
  message: string,
  customDimensions: Record<string, unknown> = {},
  id = "test-id-" + Math.random().toString(16).slice(2)
): unknown[] {
  return [
    id,
    "2024-01-15T10:30:00.000Z",
    message,
    JSON.stringify(customDimensions),
    "test-operation-id",
    "test-role-instance",
  ];
}

/**
 * Creates a clips array in the format expected by the processor.
 * Clips are stored as JSON array with { Kind, Content } structure.
 */
function createClipsMessage(clips: Array<{ Kind: string; Content: unknown }>): string {
  return JSON.stringify(clips);
}

describe("AppInsightsProcessor", () => {
  describe("process", () => {
    it("should return empty array for undefined table", () => {
      const result = AppInsightsProcessor.process(undefined);
      expect(result).toEqual([]);
    });

    it("should return empty array for table with no rows", () => {
      const table = createTestTable([]);
      const result = AppInsightsProcessor.process(table);
      expect(result).toEqual([]);
    });

    it("should process single row without clips", () => {
      const table = createTestTable([createTestRow("Regular log message")]);
      const result = AppInsightsProcessor.process(table);

      expect(result).toHaveLength(1);
      expect(result[0].payloadText).toBe("Regular log message");
      expect(result[0].clips).toEqual([]);
    });

    it("should extract policyId from customDimensions", () => {
      const dims = { PolicyId: "B2C_1A_signup_signin", TenantId: "test.onmicrosoft.com" };
      const table = createTestTable([createTestRow("Test", dims)]);
      const result = AppInsightsProcessor.process(table);

      expect(result[0].policyId).toBe("B2C_1A_signup_signin");
    });

    it("should extract correlationId from customDimensions", () => {
      const dims = { CorrelationId: "corr-12345" };
      const table = createTestTable([createTestRow("Test", dims)]);
      const result = AppInsightsProcessor.process(table);

      expect(result[0].correlationId).toBe("corr-12345");
    });

    it("should handle empty customDimensions", () => {
      const table: AppInsightsTable = {
        name: "PrimaryResult",
        columns: [
          { name: "id" },
          { name: "timestamp" },
          { name: "message" },
          { name: "customDimensions" },
          { name: "operationId" },
          { name: "cloudRoleInstance" },
        ],
        rows: [["id-1", "2024-01-15T10:30:00.000Z", "Test", null, "op-id", "role"]],
      };
      const result = AppInsightsProcessor.process(table);

      expect(result).toHaveLength(1);
      expect(result[0].customDimensions.correlationId).toBe("");
    });

    it("should parse timestamp correctly", () => {
      const table = createTestTable([createTestRow("Test")]);
      const result = AppInsightsProcessor.process(table);

      expect(result[0].timestamp).toEqual(new Date("2024-01-15T10:30:00.000Z"));
    });

    it("should process rows when called as a detached function reference", () => {
      const processTable = AppInsightsProcessor.process;
      const table = createTestTable([createTestRow("Detached invocation")]);

      const result = processTable(table);

      expect(result).toHaveLength(1);
      expect(result[0].payloadText).toBe("Detached invocation");
    });
  });

  describe("clips parsing", () => {
    describe("Headers clip", () => {
      it("should parse Headers clip from JSON array", () => {
        const clipsJson = createClipsMessage([
          {
            Kind: "Headers",
            Content: {
              UserJourneyRecorderEndpoint: "urn:test:endpoint",
              CorrelationId: "corr-123",
              EventInstance: "evt-456",
              TenantId: "testtenant.onmicrosoft.com",
              PolicyId: "B2C_1A_signup_signin",
            },
          },
        ]);
        const table = createTestTable([createTestRow(clipsJson)]);
        const result = AppInsightsProcessor.process(table);

        expect(result[0].clips).toHaveLength(1);
        expect(isHeadersClip(result[0].clips[0])).toBe(true);

        const clip = result[0].clips[0] as HeadersClip;
        expect(clip.Content.UserJourneyRecorderEndpoint).toBe("urn:test:endpoint");
        expect(clip.Content.CorrelationId).toBe("corr-123");
        expect(clip.Content.EventInstance).toBe("evt-456");
        expect(clip.Content.TenantId).toBe("testtenant.onmicrosoft.com");
        expect(clip.Content.PolicyId).toBe("B2C_1A_signup_signin");
      });

      it("should handle empty Headers content", () => {
        const clipsJson = createClipsMessage([{ Kind: "Headers", Content: {} }]);
        const table = createTestTable([createTestRow(clipsJson)]);
        const result = AppInsightsProcessor.process(table);

        expect(result[0].clips).toHaveLength(1);
        const clip = result[0].clips[0] as HeadersClip;
        expect(clip.Content.UserJourneyRecorderEndpoint).toBe("");
        expect(clip.Content.CorrelationId).toBe("");
      });
    });

    describe("Transition clip", () => {
      it("should parse Transition clip", () => {
        const clipsJson = createClipsMessage([
          {
            Kind: "Transition",
            Content: {
              EventName: "UserSignIn",
              StateName: "CollectCredentials",
            },
          },
        ]);
        const table = createTestTable([createTestRow(clipsJson)]);
        const result = AppInsightsProcessor.process(table);

        expect(result[0].clips).toHaveLength(1);
        expect(isTransitionClip(result[0].clips[0])).toBe(true);

        const clip = result[0].clips[0] as TransitionClip;
        expect(clip.Content.EventName).toBe("UserSignIn");
        expect(clip.Content.StateName).toBe("CollectCredentials");
      });
    });

    describe("Predicate clip", () => {
      it("should parse Predicate clip as string content", () => {
        const clipsJson = createClipsMessage([
          {
            Kind: "Predicate",
            Content: "IsEmailVerified",
          },
        ]);
        const table = createTestTable([createTestRow(clipsJson)]);
        const result = AppInsightsProcessor.process(table);

        expect(result[0].clips).toHaveLength(1);
        expect(result[0].clips[0].Kind).toBe("Predicate");
        expect(result[0].clips[0].Content).toBe("IsEmailVerified");
      });
    });

    describe("Action clip", () => {
      it("should parse Action clip as string content", () => {
        const clipsJson = createClipsMessage([
          {
            Kind: "Action",
            Content: "SendClaims",
          },
        ]);
        const table = createTestTable([createTestRow(clipsJson)]);
        const result = AppInsightsProcessor.process(table);

        expect(result[0].clips).toHaveLength(1);
        expect(result[0].clips[0].Kind).toBe("Action");
        expect(result[0].clips[0].Content).toBe("SendClaims");
      });
    });

    describe("HandlerResult clip", () => {
      it("should parse HandlerResult with Result boolean", () => {
        const clipsJson = createClipsMessage([
          {
            Kind: "HandlerResult",
            Content: {
              Result: true,
              PredicateResult: "True",
            },
          },
        ]);
        const table = createTestTable([createTestRow(clipsJson)]);
        const result = AppInsightsProcessor.process(table);

        expect(result[0].clips).toHaveLength(1);
        expect(isHandlerResultClip(result[0].clips[0])).toBe(true);

        const clip = result[0].clips[0] as HandlerResultClip;
        expect(clip.Content.Result).toBe(true);
        expect(clip.Content.PredicateResult).toBe("True");
      });

      it("should parse HandlerResult with Statebag entries", () => {
        const clipsJson = createClipsMessage([
          {
            Kind: "HandlerResult",
            Content: {
              Result: true,
              Statebag: {
                email: { c: "email", k: "email", v: "user@example.com", p: null },
                displayName: { c: "displayName", k: "displayName", v: "John Doe", p: null },
              },
            },
          },
        ]);
        const table = createTestTable([createTestRow(clipsJson)]);
        const result = AppInsightsProcessor.process(table);

        const clip = result[0].clips[0] as HandlerResultClip;
        expect(clip.Content.Statebag).toBeDefined();
        expect(clip.Content.Statebag!["email"]).toEqual({
          c: "email",
          k: "email",
          v: "user@example.com",
          p: null,
        });
      });

      it("should parse HandlerResult with Complex-CLMS as direct dictionary", () => {
        const clipsJson = createClipsMessage([
          {
            Kind: "HandlerResult",
            Content: {
              Result: true,
              Statebag: {
                "Complex-CLMS": {
                  userIdentities: '[{"issuer":"facebook.com"}]',
                },
              },
            },
          },
        ]);
        const table = createTestTable([createTestRow(clipsJson)]);
        const result = AppInsightsProcessor.process(table);

        const clip = result[0].clips[0] as HandlerResultClip;
        expect(clip.Content.Statebag!["Complex-CLMS"]).toEqual({
          userIdentities: '[{"issuer":"facebook.com"}]',
        });
      });

      it("should parse HandlerResult with Exception", () => {
        const clipsJson = createClipsMessage([
          {
            Kind: "HandlerResult",
            Content: {
              Result: false,
              Exception: {
                Message: "Request timeout",
                Data: { StatusCode: 408 },
              },
            },
          },
        ]);
        const table = createTestTable([createTestRow(clipsJson)]);
        const result = AppInsightsProcessor.process(table);

        const clip = result[0].clips[0] as HandlerResultClip;
        expect(clip.Content.Result).toBe(false);
        expect(clip.Content.Exception).toBeDefined();
        expect(clip.Content.Exception!.Message).toBe("Request timeout");
      });

      it("should parse HandlerResult with RecorderRecord", () => {
        const clipsJson = createClipsMessage([
          {
            Kind: "HandlerResult",
            Content: {
              Result: true,
              RecorderRecord: {
                Values: [
                  { Key: "TechnicalProfileId", Value: "AAD-UserRead" },
                  { Key: "ClaimsProviderName", Value: "AzureAD" },
                ],
              },
            },
          },
        ]);
        const table = createTestTable([createTestRow(clipsJson)]);
        const result = AppInsightsProcessor.process(table);

        const clip = result[0].clips[0] as HandlerResultClip;
        expect(clip.Content.RecorderRecord).toBeDefined();
        expect(clip.Content.RecorderRecord!.Values).toHaveLength(2);
        expect(clip.Content.RecorderRecord!.Values[0].Key).toBe("TechnicalProfileId");
      });
    });

    describe("FatalException clip", () => {
      it("should parse FatalException clip", () => {
        const clipsJson = createClipsMessage([
          {
            Kind: "FatalException",
            Content: {
              Exception: {
                Message: "Invalid technical profile reference",
                Data: { TechnicalProfileId: "TP-Missing" },
              },
              Time: "2024-01-15T10:30:00.000Z",
            },
          },
        ]);
        const table = createTestTable([createTestRow(clipsJson)]);
        const result = AppInsightsProcessor.process(table);

        expect(result[0].clips).toHaveLength(1);
        expect(isFatalExceptionClip(result[0].clips[0])).toBe(true);

        const clip = result[0].clips[0] as FatalExceptionClip;
        expect(clip.Content.Exception.Message).toBe("Invalid technical profile reference");
        expect(clip.Content.Time).toBe("2024-01-15T10:30:00.000Z");
      });
    });

    describe("Multiple clips", () => {
      it("should parse multiple clips in single message", () => {
        const clipsJson = createClipsMessage([
          {
            Kind: "Headers",
            Content: {
              UserJourneyRecorderEndpoint: "urn:test",
              CorrelationId: "123",
              EventInstance: "456",
              TenantId: "test.com",
              PolicyId: "B2C_1A_test",
            },
          },
          {
            Kind: "Transition",
            Content: {
              EventName: "Start",
              StateName: "Initial",
            },
          },
          {
            Kind: "HandlerResult",
            Content: {
              Result: true,
            },
          },
        ]);
        const table = createTestTable([createTestRow(clipsJson)]);
        const result = AppInsightsProcessor.process(table);

        expect(result[0].clips).toHaveLength(3);
        expect(isHeadersClip(result[0].clips[0])).toBe(true);
        expect(isTransitionClip(result[0].clips[1])).toBe(true);
        expect(isHandlerResultClip(result[0].clips[2])).toBe(true);
      });
    });

    describe("Edge cases", () => {
      it("should skip invalid clip objects", () => {
        const clipsJson = JSON.stringify([
          { Kind: "Headers", Content: {} },
          { invalid: "object" },
          { Kind: "Transition", Content: {} },
        ]);
        const table = createTestTable([createTestRow(clipsJson)]);
        const result = AppInsightsProcessor.process(table);

        expect(result[0].clips).toHaveLength(2);
      });

      it("should handle unknown clip kinds as generic clips", () => {
        const clipsJson = createClipsMessage([
          {
            Kind: "CustomClip",
            Content: { custom: "data" },
          },
        ]);
        const table = createTestTable([createTestRow(clipsJson)]);
        const result = AppInsightsProcessor.process(table);

        expect(result[0].clips).toHaveLength(1);
        expect(result[0].clips[0].Kind).toBe("CustomClip");
        expect(result[0].clips[0].Content).toEqual({ custom: "data" });
      });

      it("should return empty clips for non-JSON message", () => {
        const table = createTestTable([createTestRow("Plain text message")]);
        const result = AppInsightsProcessor.process(table);

        expect(result[0].clips).toEqual([]);
      });

      it("should return empty clips for non-array JSON", () => {
        const table = createTestTable([createTestRow('{"key": "value"}')]);
        const result = AppInsightsProcessor.process(table);

        expect(result[0].clips).toEqual([]);
      });
    });
  });

  describe("aggregation", () => {
    it("should aggregate multiple rows with same operation", () => {
      // The processor aggregates fragmented messages based on brackets
      const table = createTestTable([
        createTestRow('[{"Kind":"Headers","Content":{}}]', {}, "id-1"),
      ]);
      const result = AppInsightsProcessor.process(table);

      expect(result).toHaveLength(1);
    });
  });
});
