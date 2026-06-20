// frontend/public/js/app-ui.js
// Shared UI utilities for all console panels.

export function getEl(id) {
  return document.getElementById(id);
}

export function clearEl(el) {
  if (el) el.innerHTML = "";
}

export function appendConsoleLine(consoleEl, text, { className = "" } = {}) {
  if (!consoleEl) return;

  const line = document.createElement("div");
  line.className = `console-line ${className}`.trim();
  line.textContent = text;

  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

export function bootConsole(consoleEl, lines, { startMs = 250, stepMs = 350 } = {}) {
  if (!consoleEl) return;

  lines.forEach((line, i) => {
    setTimeout(() => appendConsoleLine(consoleEl, line), startMs + i * stepMs);
  });
}

export function startUtcClock(el) {
  if (!el) return;

  const tick = () => {
    const d = new Date();
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    el.textContent = `${hh}:${mm} UTC`;
  };

  tick();
  return setInterval(tick, 15_000);
}
