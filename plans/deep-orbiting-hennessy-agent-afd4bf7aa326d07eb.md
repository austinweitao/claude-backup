# AOSP Input Module Deep Exploration Plan

> **Target**: `~/aosp/base/services/core/java/com/android/server/input/`
> **Project**: aosp-input | **Service**: InputManagerService
> **Skill**: code-deep-exploration v2.12
> **Planned**: 2026-08-09

---

## Pre-Flight Check

### Existing State Analysis

**`input-exploration/` already contains:**
| File | Content | Status |
|------|---------|--------|
| `01-Input-Module-Map.md` | R1+R2+R3+partial R4-R6 in MD | **Incomplete** - wrong format, partial |
| `Input-EventDispatch-Critical-Path.html` | 1 critical path, R4-R6 for Module 1 only | **Partial** - 5 of 6 modules missing |

**Total files in input directory**: 35 Java files

**CLEAN SLATE DECISION**: Old `01-Input-Module-Map.md` predates skill v2.12 HTML format. `Input-EventDispatch-Critical-Path.html` covers only 1 module's 1 path. Must recreate ALL outputs per skill v2.12.

### Target Module Count (Phase 1 result - predicted)
Based on file inventory analysis, **6 modules** are expected:

| # | Module | Directory Coverage | Priority |
|---|--------|-------------------|----------|
| M1 | InputEventDispatch | InputManagerService.java event dispatch | **Core** |
| M2 | InputChannelManagement | InputChannel registration/removal | **Core** |
| M3 | InputFilter | InputFilter injection/interception | Supporting |
| M4 | InputDeviceManagement | Device enumeration/config | Supporting |
| M5 | InputLifecycle | Boot phase management | Core |
| M6 | NativeDispatcher | Native InputDispatcher C++ | **Core** |

---

## Phase 1: Module Map

### Round 1 — File Inventory (HTML)
**Output**: `01-file-inventory.html`

**Action**: Read all 35 files, document:
- Class declaration with `class Xxx`
- Package declaration
- Key methods (public/protected only)
- Cross-module imports

### Round 2 — Module Division (HTML)
**Output**: `02-module-division.html`

**Action**: Group 35 files into 6 modules with:
- Core files per module
- Entry points (Binder methods)
- Data structures
- Verified imports

### Round 3 — Module Map Document
**Output**: `aosp-input-module-map.html`

**Action**: Consolidate into Mermaid architecture diagram with:
- Module relationships
- Cross-module boundaries
- Exploration order

---

## Phase 2: Per-Module Deep Dive

### ⚠️ MANDATORY: All 6 modules × 7 rounds = 42 deliverables

**Execution Order** (by dependency):
1. M5 (InputLifecycle) - foundation, no dependencies
2. M1 (InputEventDispatch) - depends on M5
3. M2 (InputChannelManagement) - depends on M1
4. M3 (InputFilter) - depends on M1
5. M4 (InputDeviceManagement) - independent
6. M6 (NativeDispatcher) - depends on M1-M5

### Module 1: InputEventDispatch
**Files**: `InputManagerService.java` (core), `NativeInputManager.java`
**Entry Points**: `setFocusedApplication()`, `setFocusedWindow()`, `dispatchInputEvent()`
**Critical Paths (7 planned)**:
- P1: `setFocusedApplication()` — focus routing [Category A, Core Business]
- P2: `dispatchInputEvent()` — event injection [Category A, Core Business]
- P3: `setInputDispatchMode()` — dispatch configuration [Category C, State]
- P4: Focus conflict resolution [Category D, Cross-Module]
- P5: Event delivery to window [Category A, Core Business]
- P6: Input event callback [Category D, Cross-Module]
- P7: Touch mode state tracking [Category C, State]

### Module 2: InputChannelManagement
**Files**: `InputManagerService.java` (channel), `InputWindowHandle.java`
**Entry Points**: `registerInputChannel()`, `removeInputChannel()`
**Critical Paths (5 planned)**:
- P1: `registerInputChannel()` — channel registration [Category A, Core Business]
- P2: `removeInputChannel()` — channel cleanup [Category A, Core Business]
- P3: Input channel pair creation [Category E, Data Flow]
- P4: Channel token management [Category C, State]
- P5: Window handle lifecycle [Category B, Lifecycle]

### Module 3: InputFilter
**Files**: `InputManagerService.java` (filter), `InputFilter.java` (interface)
**Entry Points**: `setInputFilter()`, `InputFilter.filterInputEvent()`
**Critical Paths (5 planned)**:
- P1: `setInputFilter()` — filter installation [Category A, Core Business]
- P2: `filterInputEvent()` — event interception [Category A, Core Business]
- P3: Filter chain execution [Category C, State]
- P4: Filter permission check [Category D, Cross-Module]
- P5: Multi-filter dispatch [Category E, Data Flow]

### Module 4: InputDeviceManagement
**Files**: `InputManagerService.java` (devices), `KeyboardLayoutManager.java`, `KeyboardGlyphManager.java`
**Entry Points**: `getInputDevices()`, `getKeyboardLayouts()`
**Critical Paths (5 planned)**:
- P1: `getInputDevices()` — device enumeration [Category A, Core Business]
- P2: `getKeyboardLayout()` — keyboard config [Category A, Core Business]
- P3: Device configuration loading [Category E, Data Flow]
- P4: Input device hotplug [Category B, Lifecycle]
- P5: Device capability query [Category C, State]

### Module 5: InputLifecycle
**Files**: `InputManagerService.java` (lifecycle), `InputManagerService.Lifecycle`
**Entry Points**: `onBootPhase()`, `systemRunning()`
**Critical Paths (5 planned)**:
- P1: `InputManagerService` constructor — service init [Category B, Lifecycle]
- P2: `onBootPhase(PHASE_SYSTEM_SERVICES_READY)` — service start [Category B, Lifecycle]
- P3: `onBootPhase(PHASE_ACTIVITY_RESUMED)` — interactive ready [Category B, Lifecycle]
- P4: `systemRunning()` — fully ready [Category B, Lifecycle]
- P5: Watchdog registration [Category D, Cross-Module]

### Module 6: NativeDispatcher
**Files**: `NativeInputManagerService.java` (JNI bridge), native C++ (separate tree)
**Entry Points**: JNI methods into `InputDispatcher.cpp`, `InputReader.cpp`
**Critical Paths (6 planned)**:
- P1: `InputReader::loopOnce()` — event reading [Category A, Core Business]
- P2: `InputDispatcher::dispatchOnce()` — event dispatch [Category A, Core Business]
- P3: `EventHub::getEvents()` — device polling [Category A, Core Business]
- P4: Focus window resolution [Category C, State]
- P5: InputMapper touch processing [Category D, Cross-Module]
- P6: Connection.sendEvents() — socket delivery [Category E, Data Flow]

---

## Output Structure

```
~/aosp/base/docs/exploration/
├── 01-file-inventory.html          [Phase 1 R1]
├── 02-module-division.html         [Phase 1 R2]
├── aosp-input-module-map.html      [Phase 1 R3]
├── aosp-input-eventdispatch-anchor.html      [Phase 2 M1 R0]
├── aosp-input-eventdispatch-deep-dive.html    [Phase 2 M1 R4-R6]
├── aosp-input-channel-anchor.html            [Phase 2 M2 R0]
├── aosp-input-channel-deep-dive.html         [Phase 2 M2 R4-R6]
├── aosp-input-filter-anchor.html             [Phase 2 M3 R0]
├── aosp-input-filter-deep-dive.html          [Phase 2 M3 R4-R6]
├── aosp-input-device-anchor.html             [Phase 2 M4 R0]
├── aosp-input-device-deep-dive.html          [Phase 2 M4 R4-R6]
├── aosp-input-lifecycle-anchor.html          [Phase 2 M5 R0]
├── aosp-input-lifecycle-deep-dive.html       [Phase 2 M5 R4-R6]
├── aosp-input-native-anchor.html             [Phase 2 M6 R0]
└── aosp-input-native-deep-dive.html         [Phase 2 M6 R4-R6]
```

---

## Quality Gates

### Anti-Hallucination
- Every method name verified via `grep -n` against actual source
- Every line number from grep verification
- Every class/interface from `class Xxx` / `interface Xxx` declarations
- No training-data field names without source verification

### Completion Criteria
- [ ] 35 files inventoried in R1
- [ ] 6 modules defined in R2
- [ ] Mermaid architecture in R3
- [ ] 6 anchor files (R0 per module)
- [ ] 6 deep-dive files (R4-R6 per module)
- [ ] 5-10 critical paths per module (total ~33 paths)
- [ ] All 5 categories (A-E) covered per module
- [ ] All source citations verified
- [ ] All Mermaid diagrams syntactically valid

---

## Estimated Effort

| Phase | Rounds | Deliverables | Complexity |
|-------|--------|-------------|------------|
| Phase 1 | R1+R2+R3 | 3 HTML files | Medium |
| Phase 2 | 6 modules × 7 rounds | 6 anchor + 6 deep-dive = 12 HTML | **High** |
| **Total** | 21 rounds | **15 HTML files** | — |

**Execution approach**: Sequential per module (R0→R1→R2→R3→R4→R5→R6), modules in dependency order.
