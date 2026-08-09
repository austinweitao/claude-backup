# Round 2 — Module Division

Divide files into functional modules with verified boundaries.

## Anti-Hallucination Rules

1. **Read import statements** to verify module dependencies
2. **Read class declarations** to verify module membership
3. **Verify entry points** from actual method signatures
4. **No assumptions**: Mark boundaries explicitly

## Input

Round 1 output: `{{TARGET_DIR}}/docs/exploration/01-file-inventory.md`

## AMS/ATMS/WM Split Handling (Android-specific)

```
IF exploring frameworks/base/services/core/java/com/android/server/am/:
  → AMS module: ActivityManagerService.java, ProcessList.java, OomAdjuster.java
  → ATMS module: ActivityTaskManagerService.java, ActivityTaskSupervisor.java
  → WM module: (separate directory: frameworks/base/services/core/java/com/android/server/wm/)
  → BOUNDARY: Explicitly mark bridging files with [AMS↔ATMS] or [ATMS↔WM]

IF exploring frameworks/base/services/core/java/com/android/server/wm/:
  → WM module: WindowManagerService.java, RootWindowContainer.java
  → ATMS module: ActivityTaskManagerService.java (cross-reference only)
  → BOUNDARY: Mark WM↔ATMS bridging files
```

## Instructions

### Step 1: Group Files by Responsibility

From Round 1 file inventory, group files by functional area:
- What does each group do?
- What are its boundaries?

### Step 2: Verify Module Boundaries

For each module, READ source to verify:
- Core classes: `import` statements show dependencies
- Entry points: Method signatures verified
- Data structures: Actual field declarations

### Step 3: Document Module Definition

For each module:

```markdown
### Module: <Name>

**Core Responsibility:** [from verified source]
**Files:** [list from file inventory]

**Verified Entry Points:**
| Entry Point | File:Line | Signature |
|-------------|-----------|-----------|
| | | |

**Verified Data Structures:**
| Structure | File | Purpose |
|-----------|------|---------|
| | | |

**Cross-Module Dependencies** (verified from `import` statements):
- Imports: `com.other.module.*` (from File.java:23)
- Exports to: [other modules]

**BOUNDARY NOTES:**
- [AMS↔ATMS]: Files that bridge these modules
- [ATMS↔WM]: Files that bridge these modules
```

### Step 4: Define Exploration Order

Order based on:
1. Foundation modules (core types, base classes)
2. Core business logic modules
3. Integration modules (cross-module interactions)

## Anti-Hallucination Checkpoint

```
□ Module boundaries verified by reading actual source
□ Dependencies verified from `import` statements
□ Entry points verified from method signatures
□ Cross-module boundaries explicitly marked
□ No file assigned without reading its content
```

## Output Format

```markdown
# Module Division — {{PROJECT_NAME}}

## Module Summary

| Module | Files | Core Responsibility | Entry Points |
|--------|-------|-------------------|-------------|
| | | | |

## Module 1: <Name>

### Verified Responsibility
[Source: File.java:line from Javadoc]

### Verified Core Classes
| Class | File | Responsibility | Verified From |
|-------|------|---------------|---------------|
| | | | |

### Verified Entry Points
| Entry Point | File:Line | Signature | Type |
|-------------|-----------|----------|------|
| | | | |

### Verified Dependencies
- **Imports** (from `import` statements):
  - `com.module.A.*` — File.java:23
  - `com.module.B.*` — File.java:24
- **Exports to**: Module X, Module Y

### Boundary Markers
- [AMS↔ATMS]: File.java
- [ATMS↔WM]: File.java

### Exploration Priority
[1st/2nd/3rd — with rationale]

---

## Recommended Exploration Order

1. **<Module Name>** — [rationale]
2. **<Module Name>** — [rationale]
3. ...

## Cross-Module Boundary Summary

| Boundary | Bridging Files | Purpose |
|----------|---------------|---------|
| AMS↔ATMS | File.java | [verified purpose] |
| ATMS↔WM | File.java | [verified purpose] |
```

## Quality Checklist

- [ ] Each module has verified boundaries
- [ ] All dependencies verified from `import` statements
- [ ] Cross-module boundaries explicitly marked
- [ ] Exploration order justified
- [ ] No module assigned without reading source

## Output

Write to: `{{TARGET_DIR}}/docs/exploration/02-module-division.md`
