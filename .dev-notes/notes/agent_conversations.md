## Plan: Consoles on every Generator page + Dashboard Console (global log)  
Yes—keep the **Dashboard Console**. Each Generator page also gets its **own local (fresh) console history** that resets on page load, while the **Dashboard Console** provides the global timeline and app/result tracking.  

This matches Traveller’s idea that consoles provide **feedback-governed direction** and handle routine monitoring without being the user’s higher-level brain each moment.  

---  

## 1) UI behavior rules  

### A) Main Dashboard Console (global)  
- **History persists only within the current dashboard session** (or you can keep it longer later).  
- Logs:  
  - app/module access (e.g., “Atlas opened”, “Generators launched”)  
  - completion results (e.g., “Sector survey finished”)  
  - counts / top-level summary fields your backend returns  

Example top-level entries:  
- `APP_ACCESS atlas.html`  
- `JOB_START atlas:sector_survey`  
- `JOB_RESULT sector:systems=24 worlds=3 starports=2`  

### B) Each Generator Console (local-only history, “fresh” per load)  
- On page load, each module’s console:  
  - starts empty (or shows only a “console initialized” boot line)  
  - does **not** share scrollback with dashboard  
- Each module has a **unique boot sequence** (visual + timed lines)  

This reflects consoles as task enablers that resolve routine processes and provide user feedback, while “exceptions” are the user’s decision layer.  

---  

## 2) Implementation pattern (no backend yet)  

### A) Shared event contract (frontend-only)  
When a generator page runs something, it emits a structured “event” to the dashboard via `localStorage` (simple + works with multi-page):  

**Event payload**  
```js  
{  
  eventType: "job_result",          // "app_access" | "job_start" | "job_result"  
  module: "atlas",                  // or "generators", "compendium"  
  jobId: "sector_survey_001",  
  summary: {  
    sectorSystems: 24,  
    worlds: 3,  
    starports: 2  
  },  
  message: "Sector survey complete.",  
  at: Date.now()  
}  
```  

---  

## 3) Dashboard page logic (console + result tracker)  

### A) On load: initial boot  
- boot lines like:  
  - `[EHGC] Nexus Command Terminal online.`  
  - `[EHGC] Dashboard console integrity check… OK`  

### B) Listen for events from module pages  
Poll `localStorage` for a single “bridge” key and append to console.  

```js  
// dashboard-app.js  
const CONSOLE_KEY = "ehgc_bridge_event";  

function bootDashboardConsole() {  
  const c = document.getElementById("dashboardConsole");  
  c.innerHTML = "";  
  appendLine(c, "[EHGC] Dashboard console initializing…");  
  setTimeout(() => appendLine(c, "[EHGC] Routing tables armed."), 350);  
  setTimeout(() => appendLine(c, "[EHGC] Global telemetry armed (session-local)."), 750);  
}  

function appendLine(consoleEl, text) {  
  const div = document.createElement("div");  
  div.className = "console-line";  
  div.textContent = text;  
  consoleEl.appendChild(div);  
  consoleEl.scrollTop = consoleEl.scrollHeight;  
}  

function safeReadBridgeEvent() {  
  const raw = localStorage.getItem(CONSOLE_KEY);  
  if (!raw) return null;  
  localStorage.removeItem(CONSOLE_KEY);  
  return JSON.parse(raw);  
}  

function startDashboardBridgeListener() {  
  const consoleEl = document.getElementById("dashboardConsole");  

  setInterval(() => {  
    const evt = safeReadBridgeEvent();  
    if (!evt) return;  

    const timeTag = new Date(evt.at).toISOString().replace("T", " ").slice(0, 19);  

    if (evt.eventType === "app_access") {  
      appendLine(consoleEl, `[${timeTag}] APP_ACCESS ${evt.module}`);  
    } else if (evt.eventType === "job_start") {  
      appendLine(consoleEl, `[${timeTag}] JOB_START ${evt.module}:${evt.jobId}`);  
    } else if (evt.eventType === "job_result") {  
      // render a compact top-level summary line  
      const summary = evt.summary || {};  
      const pairs = Object.entries(summary).map(([k, v]) => `${k}=${v}`).join(" ");  
      appendLine(consoleEl, `[${timeTag}] JOB_RESULT ${evt.module}:${evt.jobId} ${pairs}`);  
    } else {  
      appendLine(consoleEl, `[${timeTag}] ${evt.module}: ${evt.message || evt.eventType}`);  
    }  

    // Optional counters:  
    // - increment active programs  
    // - decrement when job_result arrives  
  }, 250);  
}  

bootDashboardConsole();  
startDashboardBridgeListener();  

// Also: dashboard can log when user lands on each module via links/click handlers.  
```  

---  

## 4) Generator module logic (local console + unique boot sequence)  

Each module page uses a reusable “module console” helper, but with different boot sequences.  

### A) Local-only console that resets on each page load  
Key points:  
- clear DOM console immediately on load  
- run timed boot steps  
- then append module activity  

### B) Unique boot sequence per module  
Example for **Atlas** vs **Generators**:  

```js  
// module-console.js  
export function createModuleConsole({  
  consoleId,  
  moduleName,  
  bootLines = []  
}) {  
  const el = document.getElementById(consoleId);  
  el.innerHTML = "";  

  const boot = () => {  
    append(`[${moduleName}] boot: phase 1/3…`);  
    step(0.35, () => append(`[${moduleName}] boot: phase 2/3…`));  
    step(0.75, () => append(`[${moduleName}] boot: phase 3/3… READY`));  
    // optionally append extra lines  
    // bootLines.forEach with per-step time offsets  
  };  

  const append = (text) => {  
    const div = document.createElement("div");  
    div.className = "console-line";  
    div.textContent = text;  
    el.appendChild(div);  
    el.scrollTop = el.scrollHeight;  
  };  

  const step = (seconds, fn) => setTimeout(fn, seconds * 1000);  

  boot();  
  return {  
    log: (text) => append(text),  
  };  
}  
```  

Then in `atlas.html`:  

```html  
<script type="module">  
import { createModuleConsole } from "./module-console.js";  

const localConsole = createModuleConsole({  
  consoleId: "atlasConsole",  
  moduleName: "ATLAS",  
  bootLines: [  
    "binding star-map stream…",  
    "calibrating sector overlay grid…"  
  ]  
});  

localConsole.log("[ATLAS] operator session established.");  

function emitToDashboard(evt) {  
  localStorage.setItem("ehgc_bridge_event", JSON.stringify(evt));  
}  

emitToDashboard({  
  eventType: "app_access",  
  module: "atlas",  
  at: Date.now()  
});  

// When user starts sector survey:  
function onSectorSurvey() {  
  const jobId = "sector_survey_" + Date.now().toString(36);  

  localConsole.log(`[ATLAS] sector survey initiated (job ${jobId}).`);  
  emitToDashboard({  
    eventType: "job_start",  
    module: "atlas",  
    jobId,  
    at: Date.now()  
  });  

  // TODO: call your python/backend later; for now simulate results:  
  setTimeout(() => {  
    const summary = {  
      sectorSystems: 24,  
      worlds: 3,  
      starports: 2  
    };  

    localConsole.log(`[ATLAS] sector survey complete.`);  
    localConsole.log(`[ATLAS] ${Object.entries(summary).map(([k,v])=>k+"="+v).join(" ")}`);  

    emitToDashboard({  
      eventType: "job_result",  
      module: "atlas",  
      jobId,  
      message: "Sector survey complete.",  
      summary,  
      at: Date.now()  
    });  
  }, 1200);  
}  
</script>  
```  

---  

## 5) Wiring “boot sequences” to your HTML templates  
To keep this consistent:  
- dashboard HTML has `id="dashboardConsole"`  
- each module HTML has its own `id="atlasConsole"` / `id="generatorsConsole"` etc.  
- console markup remains the same; only `moduleName` + boot lines differ  


1) Common structure (what every generator module page should include)
Each module page should have:

topbar (optional but recommended for consistency)
a grid with:
panel (main work)
panel console-panel (local console)
scripts:
shared UI helper (if you have it)
module boot / module wiring (module-specific)

## Confirmed: `log.html` read-only console, `settings.html` has a console  

Based on your current UI concept (“Consoles provide feedback-governed direction; routine processes run without continual user intervention”):  

- **`log.html`** should be **read-only** and essentially *just a console* view.  
- **`settings.html`** should include a **console** (fresh boot per load) because you want to show *logging/changes* as the operator applies settings (and see confirmations/errors).  

Also: this matches your current dashboard + module consoles model—`log.html` is for **monitoring/reading**, while `settings.html` is for **changing configuration and receiving immediate feedback**.  

---  

## 1) `log.html` skeleton (read-only console + optional filters)  

Key points:  
- No “Generate” actions.  
- Console output is driven by stored log entries.  
- Add filters (module, eventType, time range) but keep it view-only.  

```html  
<!-- log.html -->  
<!doctype html>  
<html lang="en">  
<head>  
  <meta charset="utf-8" />  
  <meta name="viewport" content="width=device-width, initial-scale=1" />  
  <title>EHGC — System Log</title>  
  <link rel="stylesheet" href="styles.css" />  
</head>  

<body>  
  <div class="app">  
    <header class="topbar">  
      <div class="brand">  
        <div class="brand-badge" aria-hidden="true"></div>  
        <div class="brand-text">  
          <div class="brand-title">EHGC</div>  
          <div class="brand-subtitle">System Log</div>  
        </div>  
      </div>  

      <div class="topbar-right">  
        <div class="status">  
          <span class="dot" aria-hidden="true"></span>  
          <span id="systemStatus">SYSTEM ONLINE</span>  
        </div>  
        <div class="clock">  
          <span id="utcClock">--:--:-- UTC</span>  
        </div>  
      </div>  
    </header>  

    <main class="grid">  
      <!-- Filters (no actions that modify data) -->  
      <section class="panel">  
        <h2 class="panel-title">Filters</h2>  
        <div class="panel-body">  
          <div class="row">  
            <label class="label" for="filterModule">Module</label>  
            <select class="input" id="filterModule">  
              <option value="*">All</option>  
              <option value="atlas">Atlas</option>  
              <option value="generators">Generators</option>  
              <option value="compendium">Compendium</option>  
            </select>  
          </div>  

          <div class="row" style="margin-top:10px;">  
            <label class="label" for="filterType">Event Type</label>  
            <select class="input" id="filterType">  
              <option value="*">All</option>  
              <option value="app_access">App Access</option>  
              <option value="job_start">Job Start</option>  
              <option value="job_result">Job Result</option>  
              <option value="log">Log</option>  
            </select>  
          </div>  

          <div class="row" style="margin-top:10px;">  
            <label class="label" for="filterText">Text Contains</label>  
            <input class="input" id="filterText" placeholder="e.g., sector, Systems, READY…" />  
          </div>  

          <div class="row" style="margin-top:12px;">  
            <button class="btn primary" id="applyLogFilters">Apply Filters</button>  
            <button class="btn" id="clearLogFilters">Clear</button>  
          </div>  

          <p class="muted" style="margin-top:12px; font-size:13px;">  
            View-only. Filtering changes what you see, not the stored records.  
          </p>  
        </div>  
      </section>  

      <!-- Read-only console-only view -->  
      <section class="panel console-panel">  
        <h2 class="panel-title">Console (Read-Only)</h2>  

        <div class="console-meta">  
          <div class="meta-item">  
            <div class="meta-label">Visible Lines</div>  
            <div class="meta-value" id="visibleLogCount">0</div>  
          </div>  
          <div class="meta-item">  
            <div class="meta-label">Total Stored</div>  
            <div class="meta-value" id="totalLogCount">0</div>  
          </div>  
        </div>  

        <div class="console" id="logConsole" aria-readonly="true">  
          <!-- populated by JS -->  
        </div>  

        <div class="console-actions">  
          <button class="btn" id="exportLog">Export (JSON)</button>  
        </div>  
      </section>  
    </main>  

    <footer class="footer">  
      <span class="footer-text">Read-Only Log Console • EHGC</span>  
    </footer>  
  </div>  

  <script src="app-ui.js"></script>  
  <script>  
    // Placeholder: wire to whichever storage you implement later (localStorage/SQLite/backend).  
    const logConsole = document.getElementById("logConsole");  

    function appendLine(text) {  
      const div = document.createElement("div");  
      div.className = "console-line";  
      div.textContent = text;  
      logConsole.appendChild(div);  
    }  

    function renderPlaceholder() {  
      logConsole.innerHTML = "";  
      appendLine("[EHGC] Log viewer ready (placeholder data).");  
      document.getElementById("visibleLogCount").textContent = "1";  
      document.getElementById("totalLogCount").textContent = "1";  
    }  

    document.getElementById("applyLogFilters").addEventListener("click", renderPlaceholder);  
    document.getElementById("clearLogFilters").addEventListener("click", renderPlaceholder);  
    renderPlaceholder();  
  </script>  
</body>  
</html>  
```  

### Implementation note  
When you later store logs in SQLite (or JSON files), `log.html` should **read** and render. Keep all “clear/delete” actions off this page to preserve read-only behavior.  

---  

## 2) `settings.html` skeleton (has a console; logs changes)  

Key points:  
- Settings changes should append to the console: “SETTING UPDATED”, “VALIDATION ERROR”, etc.  
- This console can be “fresh per load” like your module consoles, since it’s about *feedback for the current operator session*.  

```html  
<!-- settings.html -->  
<!doctype html>  
<html lang="en">  
<head>  
  <meta charset="utf-8" />  
  <meta name="viewport" content="width=device-width, initial-scale=1" />  
  <title>EHGC — Settings</title>  
  <link rel="stylesheet" href="styles.css" />  
</head>  

<body>  
  <div class="app">  
    <header class="topbar">  
      <div class="brand">  
        <div class="brand-badge" aria-hidden="true"></div>  
        <div class="brand-text">  
          <div class="brand-title">EHGC</div>  
          <div class="brand-subtitle">Settings</div>  
        </div>  
      </div>  

      <div class="topbar-right">  
        <div class="status">  
          <span class="dot" aria-hidden="true"></span>  
          <span id="systemStatus">SYSTEM ONLINE</span>  
        </div>  
        <div class="clock">  
          <span id="utcClock">--:--:-- UTC</span>  
        </div>  
      </div>  
    </header>  

    <main class="grid">  
      <!-- Settings controls -->  
      <section class="panel">  
        <h2 class="panel-title">Configuration</h2>  
        <div class="panel-body">  
          <div class="row">  
            <label class="label" for="defaultSeed">Default Seed</label>  
            <input class="input" id="defaultSeed" placeholder="random or 12345" />  
          </div>  

          <div class="row" style="margin-top:10px;">  
            <label class="label" for="uiTheme">Theme</label>  
            <select class="input" id="uiTheme">  
              <option value="neon">Neon</option>  
              <option value="mono">Mono</option>  
              <option value="classic">Classic</option>  
            </select>  
          </div>  

          <div class="row" style="margin-top:12px;">  
            <button class="btn primary" id="saveSettings">Save Settings</button>  
            <button class="btn" id="resetSettings">Reset</button>  
          </div>  

          <p class="muted" style="margin-top:12px; font-size:13px;">  
            Changes here should generate console feedback (and ideally a dashboard-level log event later).  
          </p>  
        </div>  
      </section>  

      <!-- Settings console -->  
      <section class="panel console-panel">  
        <h2 class="panel-title">Console (Settings Feedback)</h2>  

        <div class="console-meta">  
          <div class="meta-item">  
            <div class="meta-label">Active Programs</div>  
            <div class="meta-value" id="activePrograms">0</div>  
          </div>  
          <div class="meta-item">  
            <div class="meta-label">Output Queue</div>  
            <div class="meta-value" id="outputQueue">0</div>  
          </div>  
        </div>  

        <div class="console" id="settingsConsole"></div>  

        <div class="console-actions">  
          <button class="btn primary" id="clearSettingsConsole">Clear Console</button>  
          <button class="btn" id="settingsSelfTest">Run Self-Test</button>  
        </div>  
      </section>  
    </main>  

    <footer class="footer">  
      <span class="footer-text">Operator Settings Console • EHGC</span>  
    </footer>  
  </div>  

  <script src="app-ui.js"></script>  
  <script>  
    const consoleEl = document.getElementById("settingsConsole");  
    consoleEl.innerHTML = "";  

    function appendLine(text) {  
      const div = document.createElement("div");  
      div.className = "console-line";  
      div.textContent = text;  
      consoleEl.appendChild(div);  
      consoleEl.scrollTop = consoleEl.scrollHeight;  
    }  

    // Unique boot sequence (fresh per page load)  
    const bootLines = [  
      "[SETTINGS] Boot: configuration bus connected…",  
      "[SETTINGS] Boot: validator modules loaded…",  
      "[SETTINGS] Boot: audit trail channel armed (session-local)…",  
      "[SETTINGS] Operator session ready."  
    ];  

    bootLines.forEach((line, i) => {  
      setTimeout(() => appendLine(line), 250 + i * 350);  
    });  

    // Placeholder persistence (later swap to SQLite/backend)  
    function saveSettings() {  
      const defaultSeed = document.getElementById("defaultSeed").value.trim();  
      const uiTheme = document.getElementById("uiTheme").value;  

      // TODO: validate; placeholder validation  
      if (defaultSeed === "0") {  
        appendLine("[SETTINGS] VALIDATION ERROR: seed value '0' is not allowed (example).");  
        return;  
      }  

      // store locally for now  
      localStorage.setItem("ehgc_defaultSeed", defaultSeed);  
      localStorage.setItem("ehgc_uiTheme", uiTheme);  

      appendLine(`[SETTINGS] SETTING UPDATED: defaultSeed="${defaultSeed || "(empty)"}"`);  
      appendLine(`[SETTINGS] SETTING UPDATED: uiTheme="${uiTheme}"`);  
      appendLine("[SETTINGS] Save complete: OK");  
      
      // Optional later: also emit to dashboard/global log  
      // localStorage.setItem("ehgc_bridge_event", JSON.stringify({ ... }));  
    }  

    document.getElementById("saveSettings").addEventListener("click", saveSettings);  

    document.getElementById("resetSettings").addEventListener("click", () => {  
      localStorage.removeItem("ehgc_defaultSeed");  
      localStorage.removeItem("ehgc_uiTheme");  
      appendLine("[SETTINGS] RESET requested.");  
      appendLine("[SETTINGS] RESET complete: defaults restored.");  
    });  

    document.getElementById("clearSettingsConsole").addEventListener("click", () => {  
      consoleEl.innerHTML = "";  
      appendLine("[SETTINGS] Console cleared (session-local).");  
    });  

    document.getElementById("settingsSelfTest").addEventListener("click", () => {  
      appendLine("[SETTINGS] Running self-test…");  
      setTimeout(() => appendLine("[SETTINGS] Self-test complete: OK"), 800);  
    });  

    // Optional: populate fields from localStorage  
    document.getElementById("defaultSeed").value = localStorage.getItem("ehgc_defaultSeed") || "";  
    document.getElementById("uiTheme").value = localStorage.getItem("ehgc_uiTheme") || "neon";  
  </script>  
</body>  
</html>  
```  

---  

## Persist everything (yes) + file-based logs (with purge by size)  

Given your request, here’s a clean approach that matches your stack goals (Python backend, SQLite/JSON later) but starts with something immediately workable:  

### Recommended logging model  
- **Persist all events** (dashboard accesses, job starts/results, settings changes, generator actions).  
- Store logs as **append-only lines** in a **text file** (easy + fast).  
- Also keep a **rolling/purge policy**:  
  - When the file exceeds a fixed size (e.g., 10MB / 50MB / configurable), purge or rotate.  

This lets `log.html` be a *read-only console* backed by a real persisted history.  

---  

## 1) Log file format (text-friendly)  
Use one JSON object per line (JSONL). That gives you:  
- easy append  
- easy filtering later  
- no complex parsing  

Example line:  
```json  
{"at":"2026-06-20T12:34:56.123Z","level":"INFO","scope":"atlas","eventType":"job_result","jobId":"atlas_k9x2","summary":{"sectorSystems":24,"worlds":3,"starports":2}}  
```  

This is still “text file”, but structured enough that `log.html` filters work reliably.  

---  

## 2) Purge / rotation strategies  
You have 2 good options:  

### Option A (simplest): rotate then truncate  
When size > limit:  
- rename current file to `system_log.2026-06-20.jsonl`  
- create a fresh `system_log.jsonl`  
- optionally keep last N rotated files  

### Option B: in-place purge (delete oldest lines)  
When size > limit:  
- read from the beginning until you reach only the most recent X bytes/lines  
- write back only those  
- slower and more I/O-heavy, but keeps a single file  

**For a first build, choose Option A** (rotate). It’s fast and robust.  

---  

## 3) What to persist (your consoles + tracking)  
Persist events emitted from:  
- **Dashboard console**  
  - `app_access`  
  - job-level summaries (`sectorSystems`, etc.)  
  - any “tracking results” you want shown later in `log.html`  
- **Atlas / Generators / Compendium pages**  
  - local actions still show locally  
  - *also* append to the global persisted log (so history exists)  
- **Settings page**  
  - every setting update attempt + validation result  
  - success/failure outcomes  

This gives you a real “System Log” that `log.html` can render with filters.  

*(Your “local console is fresh on page load” still holds—local console is just UI history. The persisted log is global history.)*  

---  

## 4) How `log.html` uses the persisted file  
- `log.html` is read-only and filterable.  
- Later you can:  
  - fetch log contents from backend endpoint (recommended), or  
  - in early stages, load the file via backend and stream filtered lines.  

Filters you mentioned already map perfectly:  
- module/scope  
- eventType  
- text contains  
- time window  

---  

## 5) Minimal backend shape (Python)  
When you’re ready to implement, I can provide the exact code, but conceptually:  

- `log_event(event: dict)`:  
  - add timestamp if missing  
  - append JSONL line to `logs/system_log.jsonl`  
  - check file size, rotate if needed  

- `get_logs(filters)` for `log.html`:  
  - read file (or rotated files)  
  - apply filter predicates  
  - return sorted newest-first (or oldest-first)  

This will work whether you keep it purely as files now, then later swap internals to SQLite.  

---  

## Purge / rotation strategies: Option A (rotate then truncate)  

### Goal  
When your active log file grows beyond the fixed max size, you **rotate** it (keep the old contents as an archive file) and then **start a new empty log file**.  

### Option A behavior (what it means)  
- If `system_log.jsonl` size `>` `500 MB`:  
  1. Rename current file to something like `system_log_YYYYMMDD-HHMMSS.jsonl`  
  2. Create a brand-new empty `system_log.jsonl`  
  3. Keep only the **last 5** rotated files; delete older archives  

This avoids expensive “delete oldest lines” rewriting and is fast/robust for large logs.  

---  

## 6) Your requested defaults  
- **Max size before rotation:** `500 MB`  
- **Rotated archives retained:** `5`  

So your retention policy becomes:  
- Always keep:  
  - the current file: `system_log.jsonl`  
  - plus the **5 most recent** rotated archives  
- Delete the 6th+ oldest rotated archives.  

---  

## Simple policy pseudocode  
```text  
if size(system_log.jsonl) > 500MB:  
  rotate:  
    archive = "system_log_<timestamp>.jsonl"  
    rename current system_log.jsonl -> archive  
    create new empty system_log.jsonl  

  cleanup:  
    archives = sorted( system_log_*.jsonl by time, oldest->newest )  
    while count(archives) > 5:  
      delete oldest archive  
      remove it from archives list  
```  

