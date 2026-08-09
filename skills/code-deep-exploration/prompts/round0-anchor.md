# Round 0 — Module Anchor

Establish module boundaries WITHOUT expanding into other modules.

## Anti-Hallucination Rules

This round MUST verify EVERYTHING from source. Rules:
1. **Read before claiming**: Open each file before describing it
2. **Exact citations required**: Every claim needs `[Source: File.java:line]`
3. **No assumptions**: Field names, method signatures, inheritance must come from actual source
4. **Mark unknown**: If source unread, write `[UNVERIFIED]` — do not speculate

## Context

**Module Name:** {{MODULE_NAME}}
**Target Directory:** {{TARGET_DIR}}

From module map, this module handles:
> {{MODULE_DESCRIPTION}}

## Instructions

### Step 1: Read Core Files (MANDATORY)

For each file, READ the actual content. Do NOT scan names.

```
Required files to read:
- Main service class (e.g., XxxService.java)
- Key supporting classes (XxxRecord.java, XxxHelper.java)
```

### Step 2: Verify Core Responsibility

Read the class-level Javadoc:
```java
/**
 * [This is the text to quote - Source: File.java:42]
 */
public class XxxService {
```

Document with exact citation.

### Step 3: List Key Classes

Read each class declaration (`class ClassName`) and extract:

| Verified Item | Source | Notes |
|---------------|--------|-------|
| `class Xxx` | `File.java:42` | [verified responsibility] |

### Step 4: Identify Entry Points

Entry points are methods that can be called from outside. Read signatures:

| Entry Point | File:Line | Exact Signature | Verified From |
|-------------|-----------|----------------|---------------|
| `methodName` | `File.java:123` | `public int methodName(String arg)` | `public` keyword confirmed |

**Entry point types:**
- Binder: `IAidlInterface.aidl` + implementation
- Public API: `public` method signature
- Handler: `MESSAGE_WHAT` constant + `Handler.sendMessage()`

### Step 5: List Data Structures

Read field declarations:

| Field | Exact Type | File:Line | Purpose (verified from usage) |
|-------|-----------|-----------|------------------------------|
| `mData` | `HashMap~String,Record~` | `File.java:89` | [read constructor/getter usage] |

### Step 6: Mark Cross-Module Boundaries

DO NOT explore, only mark:
```
[REF - OUTSIDE module - do not explore yet]
- mOtherService: IOtherService (File.java:67) → OtherModule.java
- import com.other.module.* (line 23)
```

## Anti-Hallucination Checkpoint

```
□ Read main service class before any claims
□ Class names match `class ClassName` in source
□ Method signatures match actual `public/protected` declarations
□ Field names match actual `private`/`protected` declarations
□ All citations include exact line numbers
□ Cross-module refs marked [REF] and NOT explored
```

## Output Format

```markdown
# {{MODULE_NAME}} — Anchor

## Module Overview

**Primary Responsibility:** [verified from Javadoc - Source: File.java:line]
**Core Files:** [count] files read
**Entry Points:** [count] verified

## Key Classes

| Class | File | Line | Responsibility | Source Verified |
|-------|------|------|---------------|----------------|
| | | | | |

## Entry Points

| Entry Point | File:Line | Exact Signature | Type |
|-------------|-----------|----------------|------|
| | | | |

## Data Structures

| Field | Exact Type | File:Line | Purpose |
|-------|-----------|-----------|---------|
| | | | |

## Cross-Module Boundaries

[REF] References to OUTSIDE modules (NOT explored):
- ...

## Anti-Hallucination Log
- [VERIFIED: all class declarations read from source]
- [VERIFIED: all method signatures read from source]
- [VERIFIED: all field names read from source]
- [UNVERIFIED: list any items not yet read]
```

## Quality Checklist

- [ ] All core files read (not just scanned)
- [ ] Every claim has source citation with line number
- [ ] Entry points verified from actual signatures
- [ ] Cross-module refs marked [REF] and NOT explored
- [ ] No speculative field/method names

## Output

Write to: `{{TARGET_DIR}}/docs/exploration/{{PROJECT_NAME}}-{{MODULE_NAME}}-anchor.md`
