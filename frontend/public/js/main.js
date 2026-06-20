// frontend/public/js/main.js
import { getEl, startUtcClock, bootConsole } from "./app-ui.js";
import { createLocalConsole, runJob } from "./module.js";

function detectPage() {
  // Best practice: add body[data-page="settings"] etc later.
  const t = (document.title || "").toLowerCase();
  if (t.includes("log")) return "log";
  if (t.includes("settings")) return "settings";
  if (t.includes("atlas")) return "atlas";
  if (t.includes("compendium")) return "compendium";
  if (t.includes("generator")) return "generators";
  return "unknown";
}

function initSystemDashboard() {
  // Example: your Sci-Fi Dashboard page has console-like sections.
  const localConsoleEl = getEl("settingsConsole") || getEl("generatorsConsole") || getEl("logConsole");
  if (!localConsoleEl) return;

  const local = createLocalConsole(localConsoleEl, {
    activeProgramsEl: getEl("activePrograms"),
    outputQueueEl: getEl("outputQueue"),
  });

  bootConsole(localConsoleEl, ["[EHGC] Console subsystem ready.", "[EHGC] Waiting for operator operations…"]);

  const genBtn = getEl("generate") || getEl("atlasGenerate") || getEl("compendiumGenerate");
  if (genBtn) {
    genBtn.addEventListener("click", async () => {
      const jobId = "job_" + Date.now().toString(36);
      await runJob({
        localConsole: local,
        jobId,
        jobName: "generator",
        seed: null,
        doWork: () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ summary: "" }), 900);
          }),
      });
    });
  }
}

function initLogPageReadOnly() {
  // log.html should be read-only; main.js just renders initial placeholder/loaded log lines.
  const logEl = getEl("logConsole");
  if (!logEl) return;

  bootConsole(logEl, ["[LOG] Log viewer ready (read-only).", "[LOG] Loading persisted events… (TODO)"], {
    startMs: 200,
    stepMs: 300,
  });
}

function init() {
  startUtcClock(getEl("utcClock"));

  const page = detectPage();
  if (page === "log") initLogPageReadOnly();
  else initSystemDashboard();
}

window.addEventListener("DOMContentLoaded", init);
