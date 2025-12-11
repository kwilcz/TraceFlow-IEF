# B2C Journey Recorder Clip Reference

This document describes the clip types emitted by Azure AD B2C's Journey Recorder and how they are parsed by the Log Analyzer.

## Table of Contents

1. [Overview](#overview)
2. [Clip Structure](#clip-structure)
3. [Clip Types](#clip-types)
4. [Statebag Keys](#statebag-keys)
5. [RecorderRecord Keys](#recorderrecord-keys)
6. [Event Types](#event-types)

---

## Overview

B2C's Journey Recorder emits structured JSON arrays as log messages. Each array contains multiple "clips" that describe what happened during policy execution.

**Example Log Message:**
```json
[
  {
    "Kind": "Headers",
    "Content": {
      "UserJourneyRecorderEndpoint": "urn:test",
      "CorrelationId": "abc-123",
      "EventInstance": "Event:AUTH",
      "TenantId": "contoso.onmicrosoft.com",
      "PolicyId": "B2C_1A_SignUpOrSignIn"
    }
  },
  {
    "Kind": "Action",
    "Content": "ProcessOrchestrationStep"
  },
  {
    "Kind": "HandlerResult",
    "Content": {
      "Result": true,
      "Statebag": {
        "ORCH_CS": { "c": "Int32", "k": "ORCH_CS", "v": "1", "p": 0 }
      }
    }
  }
]
```

---

## Clip Structure

All clips follow a common structure:

```typescript
interface Clip {
  Kind: string;     // Type identifier
  Content: unknown; // Type-specific content
}
```

### Type System

```typescript
type Clip =
  | HeadersClip
  | TransitionClip
  | PredicateClip
  | ActionClip
  | HandlerResultClip
  | FatalExceptionClip
  | GenericClip;
```

---

## Clip Types

### Headers Clip

**Kind:** `"Headers"`

**Purpose:** Contains metadata about the log event, present in every log message.

**Structure:**
```typescript
interface HeadersClip {
  Kind: "Headers";
  Content: {
    UserJourneyRecorderEndpoint: string;  // Recorder endpoint URI
    CorrelationId: string;                 // Links logs from same execution
    EventInstance: string;                 // Event type (see Event Types)
    TenantId: string;                      // B2C tenant
    PolicyId: string;                      // Policy being executed
  };
}
```

**Example:**
```json
{
  "Kind": "Headers",
  "Content": {
    "UserJourneyRecorderEndpoint": "urn:journeyrecorder:applicationinsights",
    "CorrelationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "EventInstance": "Event:AUTH",
    "TenantId": "contoso.onmicrosoft.com",
    "PolicyId": "B2C_1A_signup_signin"
  }
}
```

---

### Transition Clip

**Kind:** `"Transition"`

**Purpose:** Indicates a state machine transition (e.g., SendClaims, UserSelection).

**Structure:**
```typescript
interface TransitionClip {
  Kind: "Transition";
  Content: {
    EventName: string;   // Transition event (e.g., "SendClaims")
    StateName: string;   // Target state
  };
}
```

**Example:**
```json
{
  "Kind": "Transition",
  "Content": {
    "EventName": "SendClaims",
    "StateName": "Complete"
  }
}
```

---

### Predicate Clip

**Kind:** `"Predicate"`

**Purpose:** Contains a predicate expression that was evaluated.

**Structure:**
```typescript
interface PredicateClip {
  Kind: "Predicate";
  Content: string;  // Predicate expression
}
```

**Example:**
```json
{
  "Kind": "Predicate",
  "Content": "identityProviders.Count() == 0"
}
```

---

### Action Clip

**Kind:** `"Action"`

**Purpose:** Identifies the handler being invoked.

**Structure:**
```typescript
interface ActionClip {
  Kind: "Action";
  Content: string;  // Handler name
}
```

**Common Handler Names:**
- `ProcessOrchestrationStep` - Orchestration step processing
- `SelfAssertedPage` - User input page
- `ProcessClaimsExchange` - Claims exchange
- `ClaimsTransformation` - Claims transformation
- `RestAPIProvider` - REST API call
- `EnqueueNewJourney` - Sub-journey invocation
- `ReadSsoSession` / `WriteSsoSession` - SSO operations
- `SendClaims` - Journey completion
- `DisplayControl` - Display control actions

**Example:**
```json
{
  "Kind": "Action",
  "Content": "ProcessOrchestrationStep"
}
```

---

### HandlerResult Clip

**Kind:** `"HandlerResult"`

**Purpose:** Contains the result of a handler execution, including state changes.

**Structure:**
```typescript
interface HandlerResultClip {
  Kind: "HandlerResult";
  Content: {
    Result: boolean;              // Success/failure
    PredicateResult?: string;     // "True" or "False" for predicate handlers
    RecorderRecord?: RecorderRecord;
    Statebag?: Statebag;
    Exception?: ExceptionContent;
  };
}
```

**RecorderRecord Structure:**
```typescript
interface RecorderRecord {
  Values: Array<{
    Key: string;
    Value: unknown;
  }>;
}
```

**Statebag Structure:**
```typescript
interface Statebag {
  [key: string]: StatebagEntry | Record<string, string>;
}

interface StatebagEntry {
  c: string;  // Type (e.g., "Int32", "String")
  k: string;  // Key name
  v: string;  // Value
  p: number;  // Priority
}
```

**Example:**
```json
{
  "Kind": "HandlerResult",
  "Content": {
    "Result": true,
    "Statebag": {
      "ORCH_CS": { "c": "Int32", "k": "ORCH_CS", "v": "2", "p": 0 },
      "ORCH_TE": { "c": "String", "k": "ORCH_TE", "v": "SignUpExchange", "p": 0 }
    },
    "RecorderRecord": {
      "Values": [
        { "Key": "TechnicalProfileId", "Value": "AAD-UserWriteUsingLogonEmail" }
      ]
    }
  }
}
```

---

### FatalException Clip

**Kind:** `"FatalException"`

**Purpose:** Contains fatal error information.

**Structure:**
```typescript
interface FatalExceptionClip {
  Kind: "FatalException";
  Content: {
    Exception: {
      Message: string;
      Data?: Record<string, unknown>;
      Exception?: ExceptionContent;  // Nested exception
    };
    Time: string;  // ISO timestamp
  };
}
```

**Example:**
```json
{
  "Kind": "FatalException",
  "Content": {
    "Exception": {
      "Message": "User not found",
      "Data": {
        "HResult": "0x80131500"
      }
    },
    "Time": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### Generic Clip

**Kind:** Any other value

**Purpose:** Fallback for unrecognized clip types.

**Structure:**
```typescript
interface GenericClip {
  Kind: string;
  Content: unknown;
}
```

---

## Statebag Keys

The Statebag contains internal B2C state. Common keys:

| Key | Type | Description |
|-----|------|-------------|
| `ORCH_CS` | Int32 | Current orchestration step number |
| `ORCH_TE` | String | Target entity (TP or claims exchange ID) |
| `ORCH_ST` | String | Step type (ClaimsProviderSelection, ClaimsExchange, etc.) |
| `ORCH_CPPS` | String | Claims provider protocol settings |
| `EX_CT` | String | Claims transformation ID |
| `EX_MO` | String | Metadata operation |
| `SSO_PP` | String | SSO protocol provider |
| `CNLM` | String | Cancellation flag |
| `Complex-CLMS` | Object | Claims dictionary (key-value pairs) |
| `ComplexItems` | String | Complex items reference |
| `ComplexApiResult` | Object | API result with status |

### Special Keys

**ORCH_CS (Orchestration Current Step):**
- Value `0` indicates flow initialization
- Increments with each orchestration step
- Resets when entering a sub-journey

**ORCH_TE (Target Entity):**
- Contains the ID of the technical profile or claims exchange being executed
- Used to identify which TP is running

**Complex-CLMS:**
- Dictionary of current claims
- Keys are claim types, values are claim values
- Persists across steps (unlike regular statebag entries)

---

## RecorderRecord Keys

RecorderRecord contains diagnostic information. Common keys:

| Key | Description |
|-----|-------------|
| `TechnicalProfileId` | ID of the technical profile |
| `ClaimsTransformationId` | ID of the claims transformation |
| `ApiResult` | Self-asserted page result (Continue, Cancel) |
| `ClaimsSubmitted` | User-submitted claims |
| `OutputClaims` | Claims output by a transformation |
| `RestApiUrl` | URL of REST API call |
| `RestApiStatusCode` | HTTP status code |
| `SubJourneyInvoked` | ID of invoked sub-journey |
| `JourneyCompleted` | Indicates journey completion |
| `SsoSessionParticipant` | SSO participant identifier |
| `ValidationTechnicalProfile` | Validation TP that was executed |
| `ValidationResult` | Result of validation |
| `ErrorMessage` | Error message text |
| `HResult` | Windows error code |

---

## Event Types

The `EventInstance` in Headers identifies the log event type:

| Event | Description | When Emitted |
|-------|-------------|--------------|
| `Event:AUTH` | Authentication events | Orchestration, claims exchange |
| `Event:SELFASSERTED` | Self-asserted page events | User input pages |
| `Event:API` | API call events | REST API calls |
| `Event:ClaimsExchange` | Claims exchange events | Claims exchange execution |
| `Event:METADATA` | Metadata events | Well-known endpoint calls (filtered out) |
| `Event:TOKEN` | Token events | Token issuance (filtered out) |

### Filtering

The Log Analyzer filters out `Event:METADATA` and `Event:TOKEN` events as they don't contain useful debugging information.

---

## Type Guards

**Location:** `src/types/journey-recorder.ts`

Helper functions for type checking:

```typescript
function isClip(value: unknown): value is Clip;
function isHeadersClip(clip: Clip): clip is HeadersClip;
function isActionClip(clip: Clip): clip is ActionClip;
function isHandlerResultClip(clip: Clip): clip is HandlerResultClip;
function isTransitionClip(clip: Clip): clip is TransitionClip;
function isFatalExceptionClip(clip: Clip): clip is FatalExceptionClip;
function isStatebagEntry(value: unknown): value is StatebagEntry;
```

---

## See Also

- [LOGGING_ARCHITECTURE.md](./LOGGING_ARCHITECTURE.md) - Overall architecture
- [TRACE_INTERPRETERS.md](./TRACE_INTERPRETERS.md) - Interpreter reference
- [B2C Custom Policy Schema](https://learn.microsoft.com/en-us/azure/active-directory-b2c/trustframeworkpolicy)
