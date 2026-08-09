# Round 1 — File Inventory

Enumerate all source files with verified responsibilities.

## Anti-Hallucination Rules

This round MUST verify EVERYTHING from source:
1. **Read each file**: Do NOT infer from filename alone
2. **Cite class declarations**: Use actual `class`/`interface` keyword
3. **Verify responsibility**: Derive from class Javadoc + key methods
4. **No speculation**: If file unread, note it separately

## Target Directory

```
{{TARGET_DIR}}
```

## Instructions

### Step 1: Enumerate All Java Files

Use Glob to find ALL `.java` files:
```
*.java in target directory (recursive)
```

### Step 2: Read Each File's Header

For each file, READ:
1. Package declaration
2. Class/interface declarations (exact keywords)
3. Class-level Javadoc
4. Key public methods

### Step 3: Classify by Responsibility

From actual source content:

| Classification | Criteria |
|----------------|----------|
| **Core** | Primary business logic, entry points, main state management |
| **Supporting** | Utilities, helpers, data transformations |

### Step 4: Verify Entry Points

Identify from actual source:
- Binder: `implements IAidlInterface` + public methods
- Public API: `public` method declarations
- Handler: `Handler.sendMessage()` calls + `handleMessage()` override

## Anti-Hallucination Checkpoint

```
□ Every file listed actually exists
□ Class name verified from `class`/`interface` keyword
□ Responsibility derived from reading Javadoc, not filename
□ Entry points verified from actual method signatures
□ No file described without reading its content
```

## Output Format

```markdown
# File Inventory — {{PROJECT_NAME}}

**Target:** `{{TARGET_DIR}}`
**Generated:** {{DATE}}

## Directory Overview

[Brief description of directory structure - verified by reading]

## File Listing

### Group: <Group Name>

**Responsibility:** [one sentence - verified from source]

| File | Class/Interface | Lines | Classification | Primary Responsibility | Source |
|------|---------------|-------|----------------|----------------------|--------|
| `File.java` | `class Foo` | N | Core | [from Javadoc] | Foo.java:42 |

### Group: <Group Name>
...

## Entry Points Summary

| Entry Point | File | Type | Verified From |
|-------------|------|------|---------------|
| | | | |

## Files Not Read (Pending)

- `filename.java` — [reason]

## Anti-Hallucination Log

- Files read: [count]
- Files pending: [count]
- All responsibilities verified from source: [yes/no]
```

## Quality Checklist

- [ ] All `.java` files enumerated
- [ ] Each file read (at least header/Javadoc)
- [ ] Responsibilities verified from actual source
- [ ] Entry points marked with verification source
- [ ] Core vs Supporting classification justified

## Output

Write to: `{{TARGET_DIR}}/docs/exploration/01-file-inventory.md`
