# Trace Interpreter Reference

This document describes all available trace interpreters and how they map B2C handler events to trace steps.

> **Note:** This is part of the TraceFlow-IEF Log Analyzer feature. For getting started, see [QUICK_START.md](./QUICK_START.md). For overall logging architecture, see [LOGGING_ARCHITECTURE.md](./LOGGING_ARCHITECTURE.md).

## Table of Contents

1. [Overview](#overview)
2. [Interpreter Interface](#interpreter-interface)
3. [Interpreter Registry](#interpreter-registry)
4. [Available Interpreters](#available-interpreters)
5. [Adding New Interpreters](#adding-new-interpreters)

---

## Overview

The trace parsing system uses the **Interpreter Pattern** to handle different B2C handler types. Each interpreter specializes in processing a specific handler's clips and extracting meaningful trace information.

When a clip group is processed:

1. The `ClipAggregator` groups clips by handler name
2. The `InterpreterRegistry` finds the matching interpreter
3. The interpreter receives context and returns an `InterpretResult`
4. The `TraceParser` applies the result to build trace steps

---

## Interpreter Interface

All interpreters extend `BaseInterpreter` and implement the `Interpreter` interface:

```typescript
interface Interpreter {
  readonly handlerName: string;
  interpret(context: InterpretContext): InterpretResult;
  reset?(): void;
}

interface InterpretContext {
  clip: Clip;                    // Primary clip being interpreted
  clips: Clip[];                 // All clips in the group
  handlerName: string;           // Handler name from Action clip
  handlerResult: boolean;        // Result from HandlerResult clip
  journeyStack: JourneyStack;    // Current journey context
  stepBuilder: TraceStepBuilder; // Builder for the current step
  sequenceNumber: number;        // Current sequence number
  timestamp: Date;               // Log timestamp
  logId: string;                 // Source log ID
  statebag: Record<string, string>;   // Current statebag snapshot
  claims: Record<string, string>;     // Current claims snapshot
  previousSteps: TraceStep[];    // Previously built steps
}
```

### InterpretResult Fields

```typescript
interface InterpretResult {
  // Required
  success: boolean;              // Whether interpretation succeeded
  
  // Step Creation
  createStep?: boolean;          // Create new trace step
  finalizeStep?: boolean;        // Finalize current step
  actionHandler?: string;        // Handler name for display
  stepResult?: "Success" | "Error" | "Skipped";
  
  // Technical Profiles
  technicalProfiles?: string[];  // TP IDs involved
  technicalProfileDetails?: TechnicalProfileDetail[];
  
  // State Updates
  statebagUpdates?: Record<string, string>;
  claimsUpdates?: Record<string, string>;
  
  // Journey Navigation
  pushSubJourney?: { journeyId: string; journeyName: string };
  popSubJourney?: boolean;
  subJourneyId?: string;
  
  // Error Handling
  error?: string;
  errorHResult?: string;
  
  // UI/Interaction
  isInteractive?: boolean;
  selectableOptions?: string[];
  submittedClaims?: Record<string, string>;
  interactionResult?: string;
  
  // Backend Calls
  backendApiCalls?: BackendApiCall[];
  
  // SSO
  ssoSessionParticipant?: string;
  ssoSessionActivated?: boolean;
  
  // UI Settings
  uiSettings?: UiSettings;
  
  // Claims Transformations
  claimsTransformations?: ClaimsTransformationDetail[];
  
  // Verification (DisplayControls)
  isVerificationStep?: boolean;
  hasVerificationContext?: boolean;
}
```

---

## Interpreter Registry

**Location:** `src/lib/trace/interpreters/interpreter-registry.ts`

The registry maps handler names to interpreter instances:

```typescript
const interpreterRegistry = new InterpreterRegistry();

// Registration happens in index.ts
interpreterRegistry.register(new OrchestrationInterpreter());
interpreterRegistry.register(new SelfAssertedInterpreter());
// ... etc

// Usage
const interpreter = interpreterRegistry.getInterpreter("SelfAssertedPage");
if (interpreter) {
  const result = interpreter.interpret(context);
}
```

---

## Available Interpreters

### OrchestrationInterpreter

**Handler:** `ProcessOrchestrationStep`

**Purpose:** Handles orchestration step transitions - the main flow control of B2C policies.

**Creates Step:** Yes (for each new orchestration step)

**Key Extractions:**
- Orchestration step number (`ORCH_CS`)
- Target entity (technical profile, claims exchange, etc.)
- Step type (ClaimsProviderSelection, ClaimsExchange, SendClaims)

**Example Clip Group:**
```json
[
  { "Kind": "Action", "Content": "ProcessOrchestrationStep" },
  { "Kind": "HandlerResult", "Content": {
    "Result": true,
    "Statebag": {
      "ORCH_CS": { "v": "2" },
      "ORCH_TE": { "v": "SignUpWithLogonEmailExchange" }
    }
  }}
]
```

---

### SelfAssertedInterpreter

**Handler:** `SelfAssertedPage`, `SelfAssertedMessageValidationHandler`, `SelfAssertedAttributeProviderActionHandler`, `SelfAssertedAttributeProviderRedirectHandler`

**Purpose:** Handles self-asserted (user input) pages including validation, submission, and **validation error detection**.

**Creates Step:** No (enriches existing orchestration step)

**Key Extractions:**
- Submitted claims (user input)
- Validation errors from `Exception` in handler result
- Validation technical profiles (e.g., `login-NonInteractive`)
- Page interaction results
- Cancel actions
- Claim mappings

**Validation Error Detection:**

The interpreter detects validation failures (e.g., incorrect password, user not found) by checking for `Exception` in two locations:

1. **Top-level `handlerResult.Exception`**
2. **Nested `handlerResult.RecorderRecord.Values[Validation].Values[Exception]`**

When an exception is found, the step is marked with `result: "Error"` and the error message is extracted.

**Example: Successful Validation**
```json
[
  { "Kind": "Predicate", "Content": "Web.TPEngine.StateMachineHandlers.SelfAssertedMessageValidationHandler" },
  { "Kind": "HandlerResult", "Content": {
    "Result": true,
    "PredicateResult": "True",
    "RecorderRecord": {
      "Values": [
        { "Key": "Validation", "Value": { "Values": [
          { "Key": "ValidationTechnicalProfile", "Value": { "Values": [
            { "Key": "TechnicalProfileId", "Value": "login-NonInteractive" }
          ]}}
        ]}}
      ]
    }
  }}
]
```

**Example: Validation Error (User Not Found)**
```json
[
  { "Kind": "Predicate", "Content": "Web.TPEngine.StateMachineHandlers.SelfAssertedMessageValidationHandler" },
  { "Kind": "HandlerResult", "Content": {
    "Result": false,
    "PredicateResult": "False",
    "RecorderRecord": {
      "Values": [
        { "Key": "Validation", "Value": { "Values": [
          { "Key": "ValidationTechnicalProfile", "Value": { "Values": [
            { "Key": "TechnicalProfileId", "Value": "login-NonInteractive" }
          ]}},
          { "Key": "Exception", "Value": {
            "Kind": "Handled",
            "HResult": "80131500",
            "Message": "A user with the specified credential could not be found."
          }}
        ]}}
      ]
    },
    "Exception": {
      "Kind": "Handled",
      "HResult": "80131500",
      "Message": "A user with the specified credential could not be found."
    }
  }}
]
```

**Result for Validation Error:**
```typescript
{
  stepResult: "Error",
  error: "A user with the specified credential could not be found.",
  errorHResult: "80131500",
  validationTechnicalProfiles: ["login-NonInteractive"]
}
```

---

### ClaimsExchangeInterpreter

**Handler:** `ProcessClaimsExchange`

**Purpose:** Handles claims exchange technical profile execution.

**Creates Step:** No (enriches existing step)

**Key Extractions:**
- Technical profile ID
- Claims exchanged
- Execution result

---

### ClaimsTransformationInterpreter

**Handler:** `ClaimsTransformation`

**Purpose:** Handles claims transformation execution.

**Creates Step:** No

**Key Extractions:**
- Transformation ID
- Input claims
- Output claims
- Transformation result

**Example Clip Group:**
```json
[
  { "Kind": "Action", "Content": "ClaimsTransformation" },
  { "Kind": "HandlerResult", "Content": {
    "Result": true,
    "RecorderRecord": {
      "Values": [
        { "Key": "ClaimsTransformationId", "Value": "CreateDisplayNameFromFirstAndLastName" },
        { "Key": "OutputClaims", "Value": { "displayName": "John Doe" } }
      ]
    }
  }}
]
```

---

### BackendApiInterpreter

**Handler:** `RestAPIProvider`

**Purpose:** Handles REST API calls to backend services.

**Creates Step:** No

**Key Extractions:**
- API endpoint URL
- HTTP method
- Request/response data
- Error responses
- Latency

**Example Clip Group:**
```json
[
  { "Kind": "Action", "Content": "RestAPIProvider" },
  { "Kind": "HandlerResult", "Content": {
    "Result": true,
    "RecorderRecord": {
      "Values": [
        { "Key": "RestApiUrl", "Value": "https://api.example.com/validate" },
        { "Key": "RestApiStatusCode", "Value": "200" }
      ]
    }
  }}
]
```

---

### SubJourneyInterpreter

**Handler:** `EnqueueNewJourney`

**Purpose:** Handles sub-journey invocation and return.

**Creates Step:** No

**Key Actions:**
- Push sub-journey onto journey stack
- Pop sub-journey when returning
- Track sub-journey ID

**Example Clip Group:**
```json
[
  { "Kind": "Action", "Content": "EnqueueNewJourney" },
  { "Kind": "HandlerResult", "Content": {
    "Result": true,
    "RecorderRecord": {
      "Values": [
        { "Key": "SubJourneyInvoked", "Value": "MFA-SubJourney" }
      ]
    }
  }}
]
```

---

### SsoSessionInterpreter

**Handler:** `ReadSsoSession`, `WriteSsoSession`

**Purpose:** Handles SSO session read/write operations.

**Creates Step:** No

**Key Extractions:**
- Session participant (e.g., "Facebook-OAUTH")
- Whether SSO was activated
- Session claims

---

### DisplayControlInterpreter

**Handler:** `DisplayControl`

**Purpose:** Handles display control actions (verification codes, etc.).

**Creates Step:** No

**Key Extractions:**
- Verification step detection
- Verification context
- Control type

---

### UiSettingsInterpreter

**Handler:** `UiSettings`

**Purpose:** Extracts UI configuration from self-asserted pages.

**Creates Step:** No

**Key Extractions:**
- Remote resource URL
- API type
- CSRF token
- Page view ID
- Retry limits

---

### ValidateApiResponseInterpreter

**Handler:** `ValidateApiResponse`

**Purpose:** Handles validation of API responses with detailed error extraction.

**Creates Step:** No

**Key Extractions:**
- Validation result
- Error messages with HResult codes
- Error data

---

### ErrorHandlerInterpreter

**Handler:** Various error handlers

**Purpose:** Handles error conditions and exceptions.

**Creates Step:** Sometimes (for fatal errors)

**Key Extractions:**
- Error messages
- Exception details
- HResult codes

---

### HomeRealmDiscoveryInterpreter

**Handler:** `HomeRealmDiscovery`

**Purpose:** Handles home realm discovery for federated authentication.

**Creates Step:** No

**Key Extractions:**
- Selected identity provider
- Discovery result

---

### JourneyCompletionInterpreter

**Handler:** `SendClaims`

**Purpose:** Handles journey completion and token issuance.

**Creates Step:** No (finalizes current step)

**Key Extractions:**
- Completion status
- Final claims
- Token issued indicator

---

### StepInvokeInterpreter

**Handler:** `StepInvoke`

**Purpose:** Handles step invocation (internal B2C mechanism).

**Creates Step:** No

---

## Adding New Interpreters

### Step 1: Create Interpreter File

Create a new file in `src/lib/trace/interpreters/`:

```typescript
// my-handler.interpreter.ts
import { BaseInterpreter, InterpretContext, InterpretResult } from "./base-interpreter";

export class MyHandlerInterpreter extends BaseInterpreter {
  readonly handlerName = "MyHandler";

  interpret(context: InterpretContext): InterpretResult {
    const { handlerResult, clips } = context;
    
    // Extract relevant data from clips
    const handlerResultClip = this.findHandlerResult(clips);
    if (!handlerResultClip) {
      return this.failure("No HandlerResult found");
    }

    // Process the data
    const { Statebag, RecorderRecord } = handlerResultClip.Content;
    
    // Return result
    return this.success({
      // ... your extracted data
    });
  }
}
```

### Step 2: Register Interpreter

In `src/lib/trace/interpreters/index.ts`:

```typescript
import { MyHandlerInterpreter } from "./my-handler.interpreter";

// In the registry setup:
registry.register(new MyHandlerInterpreter());
```

### Step 3: Add Tests

Create `src/lib/trace/__tests__/my-handler.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseTrace } from "../trace-parser";
import { createTestLog, createClips } from "./fixtures";

describe("MyHandler Interpreter", () => {
  it("should handle MyHandler clips", () => {
    const logs = [createTestLog({
      clips: createClips([
        { Kind: "Action", Content: "MyHandler" },
        { Kind: "HandlerResult", Content: { Result: true } }
      ])
    })];

    const result = parseTrace(logs);
    
    expect(result.success).toBe(true);
    // ... more assertions
  });
});
```

---

## Handler Name Reference

| Handler Name | Interpreter | Description |
|--------------|-------------|-------------|
| `ProcessOrchestrationStep` | OrchestrationInterpreter | Step transitions |
| `SelfAssertedPage` | SelfAssertedInterpreter | User input pages |
| `SelfAssertedMessageValidationHandler` | SelfAssertedInterpreter | Form validation with error detection |
| `SelfAssertedAttributeProviderActionHandler` | SelfAssertedInterpreter | Form submission |
| `SelfAssertedAttributeProviderRedirectHandler` | SelfAssertedInterpreter | Redirect to self-asserted page |
| `ProcessClaimsExchange` | ClaimsExchangeInterpreter | Claims exchange |
| `ClaimsTransformation` | ClaimsTransformationInterpreter | Claims transformations |
| `RestAPIProvider` | BackendApiInterpreter | REST API calls |
| `EnqueueNewJourney` | SubJourneyInterpreter | Sub-journey invocation |
| `ReadSsoSession` | SsoSessionInterpreter | SSO read |
| `WriteSsoSession` | SsoSessionInterpreter | SSO write |
| `DisplayControl` | DisplayControlInterpreter | Display controls |
| `SendClaims` | JourneyCompletionInterpreter | Journey completion |
| `ValidateApiResponse` | ValidateApiResponseInterpreter | API validation |
| `HomeRealmDiscovery` | HomeRealmDiscoveryInterpreter | Identity provider selection |
| `StepInvoke` | StepInvokeInterpreter | Internal step invocation |
| `InitiatingMessageValidationHandler` | ErrorHandlerInterpreter | Early request validation errors |
| `SendErrorHandler` | ErrorHandlerInterpreter | Error response sending |

---

## See Also

- [LOGGING_ARCHITECTURE.md](./LOGGING_ARCHITECTURE.md) - Overall architecture
- [B2C Custom Policy Schema](https://learn.microsoft.com/en-us/azure/active-directory-b2c/trustframeworkpolicy)
