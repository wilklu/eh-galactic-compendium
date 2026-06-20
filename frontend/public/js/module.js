// module.js
// Handles local program counters + emitting console output.
// Later: replace doWork() with backend calls (Python).

import { appendConsoleLine, clearEl } from "./app-ui.js";

export function createLocalConsole(consoleEl, ui = {}) {
  const state = {
    activePrograms: 0,
    outputQueue: 0,
  };

  const setActivePrograms = (n) => {
    state.activePrograms = n;
    ui.activeProgramsEl && (ui.activeProgramsEl.textContent = String(n));
  };

  const setOutputQueue = (n) => {
    state.outputQueue = n;
    ui.outputQueueEl && (ui.outputQueueEl.textContent = String(n));
  };

  return {
    state,
    log(line) {
      appendConsoleLine(consoleEl, line);
    },
    clear() {
      clearEl(consoleEl);
      setActivePrograms(0);
      setOutputQueue(0);
    },
    setActivePrograms,
    setOutputQueue,
  };
}

export async function runJob({
  localConsole,
  jobId,
  jobName,
  seed = null,
  doWork, // async fn returning optional { summary: "..."}
}) {
  localConsole.setOutputQueue(localConsole.state.outputQueue + 1);
  localConsole.setActivePrograms(localConsole.state.activePrograms + 1);

  localConsole.log(`[${jobName.toUpperCase()}] JOB_START ${jobId} seed="${seed ?? "none"}"`);

  try {
    const result = await (doWork ? doWork() : Promise.resolve(null));
    const summary = result?.summary ? ` ${result.summary}` : "";
    localConsole.log(`[${jobName.toUpperCase()}] JOB_RESULT ${jobId} status=complete${summary}`);
    return result;
  } catch (err) {
    localConsole.log(`[${jobName.toUpperCase()}] JOB_RESULT ${jobId} status=error error="${String(err)}"`);
    throw err;
  } finally {
    localConsole.setOutputQueue(Math.max(0, localConsole.state.outputQueue - 1));
    localConsole.setActivePrograms(Math.max(0, localConsole.state.activePrograms - 1));
  }
}
