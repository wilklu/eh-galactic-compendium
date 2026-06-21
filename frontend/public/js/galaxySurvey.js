// frontend/public/js/galaxySurvey.js

import { generateGalaxy, listGalaxies, saveGalaxy, updateGalaxy, deleteGalaxy, getGalaxy } from "./galaxyApi.js";

let currentGalaxyId = null;

function setConsoleState(text) {
  window.ehgcSurveyConsoleSetState?.(text);
}

function setConsolePrompt(text) {
  window.ehgcSurveyConsoleSetPrompt?.(text);
}

function logLine(text, tone = "dim") {
  window.ehgcSurveyConsoleLog?.(text, tone);
}

function summarizePayload(payload) {
  const params = payload?.params || {};
  const controls = params.controls || {};
  const properties = params.galaxyProperties || {};
  const nav = params.nav || {};
  return [
    `seed=${payload.seed}`,
    `tier=${payload.gridTier}`,
    `morph=${properties.morphology || "n/a"}`,
    `age=${properties.ageByr ?? "n/a"} byr`,
    `core=${controls.coreIntensity ?? "n/a"}`,
    `rift=${controls.riftSpread ?? "n/a"}`,
    `nebula=${controls.nebulaMix ?? "n/a"}`,
    `sector=${nav.sector || "n/a"}`,
    `hex=${nav.hex || "n/a"}`,
  ].join(" | ");
}

function summarizeResult(result) {
  if (!result) return "no response payload";
  return [
    `id=${result.id ?? "preview"}`,
    `seed=${result.seed ?? "n/a"}`,
    `tier=${result.gridTier ?? "n/a"}`,
    `name=${result.name ?? "n/a"}`,
    `png=${result.imagePngPath || result.previewPngUrl || result.imagePngUrl || "n/a"}`,
  ].join(" | ");
}

function emitGalaxyLoaded(galaxy) {
  window.dispatchEvent(
    new CustomEvent("galaxy:loaded", {
      detail: { galaxy },
    }),
  );
}

async function refreshList() {
  const data = await listGalaxies();
  const list = document.getElementById("galaxyList");
  list.innerHTML = "";
  for (const g of data.items) {
    const btn = document.createElement("button");
    btn.textContent = `${g.name} (id:${g.id})`;
    btn.onclick = async () => {
      currentGalaxyId = g.id;
      await loadGalaxyToForm(g.id);
    };
    list.appendChild(btn);
  }

  const pending = localStorage.getItem("ehgc_pending_survey_context");
  if (!pending) return;

  try {
    const ctx = JSON.parse(pending);
    if (ctx?.galaxyId != null) {
      currentGalaxyId = Number(ctx.galaxyId);
      await loadGalaxyToForm(currentGalaxyId);
      const terrain = ctx.terrain;
      const terrainSummary = terrain?.terrainLabel
        ? ` | terrain=${terrain.terrainLabel}${terrain.terrainClimate ? `/${terrain.terrainClimate}` : ""}`
        : "";
      const marker = ctx.marker ? ` | marker=${ctx.marker}` : "";
      document.getElementById("console").textContent =
        `Survey handoff loaded for galaxy id=${currentGalaxyId}${marker}${terrainSummary}`;
    }
  } catch {
    document.getElementById("console").textContent = "Survey handoff context was invalid.";
  } finally {
    localStorage.removeItem("ehgc_pending_survey_context");
  }
}

async function loadGalaxyToForm(id) {
  const g = await getGalaxy(id);
  document.getElementById("galaxyName").value = g.name;
  document.getElementById("gridTier").value = g.gridTier;
  document.getElementById("seed").value = g.seed;

  document.getElementById("paramsJson").value = JSON.stringify(g.params ?? {}, null, 2);
  document.getElementById("galaxyPreviewImg").src = g.imagePngUrl;

  // enable save/update mode
  document.getElementById("btnSave").disabled = false;
  document.getElementById("btnUpdate").disabled = false;
  emitGalaxyLoaded(g);
}

function readFormPayload() {
  let parsedParams = {};
  const rawParams = document.getElementById("paramsJson").value.trim();
  if (rawParams) {
    try {
      parsedParams = JSON.parse(rawParams);
    } catch {
      throw new Error("Params JSON is invalid.");
    }
  }

  return {
    name: document.getElementById("galaxyName").value,
    gridTier: document.getElementById("gridTier").value,
    seed: Number(document.getElementById("seed").value),
    params: parsedParams,
  };
}

async function onGeneratePreview() {
  let payload;
  try {
    setConsoleState("Working");
    setConsolePrompt("RUN>");
    payload = readFormPayload();
    logLine(`[PREFLIGHT] ${summarizePayload(payload)}`, "dim");
    logLine("[PIPELINE] preview generation dispatched.", "dim");

    const preview = await generateGalaxy(payload);
    document.getElementById("galaxyPreviewImg").src = preview.previewPngUrl;
    document.getElementById("console").textContent = `Preview generated for seed=${preview.seed}`;
    logLine(`[RESULT] preview complete | ${summarizeResult(preview)}`, "good");
  } catch (err) {
    document.getElementById("console").textContent = `Generate failed: ${String(err.message || err)}`;
    logLine(`[RESULT] preview failed: ${String(err.message || err)}`, "warn");
  } finally {
    setConsoleState("Ready");
    setConsolePrompt("READY>");
  }
}

async function onSave() {
  let payload;
  try {
    setConsoleState("Working");
    setConsolePrompt("RUN>");
    payload = readFormPayload();
    logLine(`[PREFLIGHT] ${summarizePayload(payload)}`, "dim");
    logLine("[PIPELINE] persistence request dispatched.", "dim");

    const saved = await saveGalaxy(payload);
    currentGalaxyId = saved.id;

    document.getElementById("galaxyPreviewImg").src = saved.imagePngUrl;
    document.getElementById("console").textContent = `Saved galaxy id=${saved.id}`;
    emitGalaxyLoaded(saved);
    logLine(`[RESULT] save complete | ${summarizeResult(saved)}`, "good");
    await refreshList();
  } catch (err) {
    document.getElementById("console").textContent = `Save failed: ${String(err.message || err)}`;
    logLine(`[RESULT] save failed: ${String(err.message || err)}`, "warn");
  } finally {
    setConsoleState("Ready");
    setConsolePrompt("READY>");
  }
}

async function onUpdate() {
  if (currentGalaxyId == null) return;
  let payload;
  try {
    setConsoleState("Working");
    setConsolePrompt("RUN>");
    payload = readFormPayload();
    logLine(`[PREFLIGHT] ${summarizePayload(payload)}`, "dim");
    logLine(`[PIPELINE] update request dispatched for id=${currentGalaxyId}.`, "dim");

    const updated = await updateGalaxy(currentGalaxyId, payload);

    document.getElementById("galaxyPreviewImg").src = updated.imagePngUrl;
    document.getElementById("console").textContent = `Updated galaxy id=${currentGalaxyId}`;
    emitGalaxyLoaded(updated);
    logLine(`[RESULT] update complete | ${summarizeResult(updated)}`, "good");
    await refreshList();
  } catch (err) {
    document.getElementById("console").textContent = `Update failed: ${String(err.message || err)}`;
    logLine(`[RESULT] update failed: ${String(err.message || err)}`, "warn");
  } finally {
    setConsoleState("Ready");
    setConsolePrompt("READY>");
  }
}

async function onDelete() {
  if (currentGalaxyId == null) return;
  try {
    setConsoleState("Working");
    setConsolePrompt("RUN>");
    logLine(`[PIPELINE] delete request dispatched for id=${currentGalaxyId}.`, "warn");

    await deleteGalaxy(currentGalaxyId);
    document.getElementById("galaxyPreviewImg").src = "";
    document.getElementById("console").textContent = `Deleted galaxy id=${currentGalaxyId}`;
    logLine(`[RESULT] delete complete | id=${currentGalaxyId}`, "warn");
    currentGalaxyId = null;
    await refreshList();
  } catch (err) {
    document.getElementById("console").textContent = `Delete failed: ${String(err.message || err)}`;
    logLine(`[RESULT] delete failed: ${String(err.message || err)}`, "warn");
  } finally {
    setConsoleState("Ready");
    setConsolePrompt("READY>");
  }
}

document.getElementById("btnGenerate").onclick = onGeneratePreview;
document.getElementById("btnSave").onclick = onSave;
document.getElementById("btnUpdate").onclick = onUpdate;
document.getElementById("btnDelete").onclick = onDelete;

refreshList();
