# Log Analyzer Quick Start Guide

A practical guide for developers working with the B2C Log Analyzer feature.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Common Tasks](#common-tasks)
3. [Debugging Tips](#debugging-tips)
4. [Code Examples](#code-examples)
5. [Testing](#testing)

---

## Getting Started

### Prerequisites

1. **Application Insights Access**
   - Application ID (GUID) from Azure Portal
   - API Key with read permissions
   - Logs must include Journey Recorder events

2. **Enable Journey Recorder in B2C Policy**
   ```xml
   <UserJourneyBehaviors>
     <JourneyInsights TelemetryEngine="ApplicationInsights" 
                      InstrumentationKey="your-key" 
                      DeveloperMode="true" 
                      ClientEnabled="true" 
                      ServerEnabled="true" 
                      TelemetryVersion="1.0.0" />
   </UserJourneyBehaviors>
   ```

### Quick Test

1. Navigate to the Log Analyzer page
2. Enter your Application Insights credentials
3. Set timespan (e.g., `PT24H` for last 24 hours)
4. Click "Fetch Logs"
5. Select a flow from the results

---

## Common Tasks

### Searching Logs

Use the search field to find specific logs:

```typescript
// Search filters work on the message content
// Examples:
"user@email.com"        // Find logs containing email
"AAD-UserWriteUsing"    // Find specific TP executions
"error"                 // Find error messages
"CorrelationId-123"     // Find specific correlation
```

### Filtering by Policy

Logs are automatically grouped by `PolicyId`. The flow selector shows:
- Policy name
- Start/end time
- Step count
- Completion status
- Error indicators

### Reading Trace Steps

Each trace step shows:

| Field | Description |
|-------|-------------|
| Step # | Orchestration step number |
| Handler | B2C handler that executed |
| Technical Profiles | TPs involved in this step |
| Result | Success, Error, or Skipped |
| Duration | Time until next step |

### Inspecting Statebag

The statebag inspector shows:
- Current claims (`Complex-CLMS`)
- Orchestration state (`ORCH_CS`, `ORCH_TE`)
- Session data (`SSO_PP`)
- Error details

---

## Debugging Tips

### Finding Errors

1. **Look for red indicators** in the flow list
2. **Check trace steps** with "Error" result
3. **Inspect FatalException clips** in detail view
4. **Search for "Exception"** in raw logs

### Tracking Claims Flow

1. Select a flow
2. Step through the trace
3. Watch `claimsSnapshot` in each step
4. Compare before/after values

### Identifying Performance Issues

1. Check `duration` field on each step
2. Look for long-running REST API calls
3. Identify slow claims transformations
4. Check for excessive validation TP calls

### Common Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| No logs appear | Wrong timespan | Extend timespan |
| Partial flows | Log truncation | Already handled by aggregation |
| Missing steps | Filter excluding events | Check Event type filters |
| Empty trace | No AUTH events | Check Journey Recorder config |

---

## Code Examples

### Reading Logs from Store

```typescript
import { useLogStore } from "@/stores/log-store";

function MyComponent() {
  const { logs, selectedLog, traceSteps, isLoading } = useLogStore();

  // Access current log
  console.log(selectedLog?.correlationId);
  
  // Access trace steps
  traceSteps.forEach(step => {
    console.log(`Step ${step.stepOrder}: ${step.actionHandler}`);
  });
}
```

### Programmatic Log Fetch

```typescript
import { useLogStore } from "@/stores/log-store";

function fetchLogs() {
  const store = useLogStore.getState();
  
  store.fetchLogs({
    applicationId: "your-app-id",
    apiKey: "your-api-key",
    maxRows: 100,
    timespan: "PT24H"
  });
}
```

### Accessing Clips

```typescript
import { isHandlerResultClip, isHeadersClip } from "@/types/journey-recorder";

function analyzeLog(log: LogRecord) {
  for (const clip of log.clips) {
    if (isHeadersClip(clip)) {
      console.log("Policy:", clip.Content.PolicyId);
      console.log("Event:", clip.Content.EventInstance);
    }
    
    if (isHandlerResultClip(clip)) {
      console.log("Result:", clip.Content.Result);
      if (clip.Content.Exception) {
        console.error("Error:", clip.Content.Exception.Message);
      }
    }
  }
}
```

### Custom Trace Processing

```typescript
import { parseTrace, logsToTraceInput } from "@/lib/trace";

function customAnalysis(logs: LogRecord[]) {
  const input = logsToTraceInput(logs);
  const result = parseTrace(input);
  
  // Analyze trace steps
  result.traceSteps.forEach(step => {
    if (step.result === "Error") {
      console.error(`Error at step ${step.stepOrder}:`, step.errorMessage);
    }
    
    // Check for specific TPs
    if (step.technicalProfiles.includes("AAD-UserReadUsingObjectId")) {
      console.log("User read at step", step.stepOrder);
    }
  });
  
  // Access final state
  console.log("Final claims:", result.finalClaims);
  console.log("Final statebag:", result.finalStatebag);
}
```

---

## Testing

### Unit Testing Interpreters

```typescript
import { describe, it, expect } from "vitest";
import { parseTrace } from "@/lib/trace";

describe("My Feature", () => {
  it("should handle specific scenario", () => {
    const logs = [
      {
        id: "log-1",
        timestamp: new Date("2024-01-01T10:00:00Z"),
        policyId: "B2C_1A_Test",
        correlationId: "test-123",
        clips: [
          { Kind: "Headers", Content: { EventInstance: "Event:AUTH", PolicyId: "B2C_1A_Test", CorrelationId: "test-123", TenantId: "test", UserJourneyRecorderEndpoint: "test" } },
          { Kind: "Action", Content: "ProcessOrchestrationStep" },
          { Kind: "HandlerResult", Content: { Result: true, Statebag: { "ORCH_CS": { c: "Int32", k: "ORCH_CS", v: "1", p: 0 } } } }
        ]
      }
    ];

    const result = parseTrace(logs);
    
    expect(result.success).toBe(true);
    expect(result.traceSteps).toHaveLength(1);
    expect(result.traceSteps[0].stepOrder).toBe(1);
  });
});
```

### Integration Testing

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useLogStore } from "@/stores/log-store";

describe("Log Store Integration", () => {
  beforeEach(() => {
    useLogStore.getState().reset();
  });

  it("should process logs and generate trace", () => {
    const store = useLogStore.getState();
    
    // Simulate setting logs
    store.setLogs(mockLogs);
    store.generateTrace();
    
    const state = useLogStore.getState();
    expect(state.traceSteps.length).toBeGreaterThan(0);
  });
});
```

### Testing with Fixtures

```typescript
// Create reusable test fixtures
function createTestLog(overrides: Partial<LogRecord> = {}): LogRecord {
  return {
    id: "test-log-1",
    timestamp: new Date(),
    policyId: "B2C_1A_Test",
    correlationId: "test-correlation",
    cloudRoleInstance: "test-instance",
    rawIds: ["test-log-1"],
    payloadText: "[]",
    parsedPayload: [],
    clips: [],
    customDimensions: {
      correlationId: "test-correlation",
      eventName: "",
      tenant: "test",
      userJourney: "B2C_1A_Test",
      version: "1.0"
    },
    ...overrides
  };
}

function createOrchestrationClips(step: number): Clip[] {
  return [
    { 
      Kind: "Headers", 
      Content: { 
        EventInstance: "Event:AUTH", 
        PolicyId: "B2C_1A_Test",
        CorrelationId: "test",
        TenantId: "test",
        UserJourneyRecorderEndpoint: "test"
      } 
    },
    { Kind: "Action", Content: "ProcessOrchestrationStep" },
    { 
      Kind: "HandlerResult", 
      Content: { 
        Result: true, 
        Statebag: { 
          "ORCH_CS": { c: "Int32", k: "ORCH_CS", v: String(step), p: 0 } 
        } 
      } 
    }
  ];
}
```

---

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/api/application-insights-client.ts` | API client |
| `src/lib/app-insights-processor.ts` | Log processing |
| `src/stores/log-store.ts` | State management |
| `src/lib/trace/trace-parser.ts` | Trace parsing |
| `src/lib/trace/interpreters/*.ts` | Handler interpreters |
| `src/lib/trace/services/flow-analyzer.ts` | Flow grouping |
| `src/components/policy-logs/*.tsx` | UI components |
| `src/types/logs.ts` | Log types |
| `src/types/journey-recorder.ts` | Clip types |
| `src/types/trace.ts` | Trace types |

---

## See Also

- [LOGGING_ARCHITECTURE.md](./LOGGING_ARCHITECTURE.md) - Full architecture docs
- [TRACE_INTERPRETERS.md](./TRACE_INTERPRETERS.md) - Interpreter reference
- [CLIP_REFERENCE.md](./CLIP_REFERENCE.md) - Clip type reference
