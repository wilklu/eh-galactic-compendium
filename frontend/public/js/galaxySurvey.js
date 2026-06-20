// frontend/public/js/galaxySurvey.js

import { generateGalaxy, listGalaxies, saveGalaxy, updateGalaxy, deleteGalaxy, getGalaxy } from "./galaxyApi.js";

let currentGalaxyId = null;

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
  try {
    const payload = readFormPayload();
    const preview = await generateGalaxy(payload);
    document.getElementById("galaxyPreviewImg").src = preview.previewPngUrl;
    document.getElementById("console").textContent = `Preview generated for seed=${preview.seed}`;
  } catch (err) {
    document.getElementById("console").textContent = `Generate failed: ${String(err.message || err)}`;
  }
}

async function onSave() {
  try {
    const payload = readFormPayload();
    const saved = await saveGalaxy(payload);
    currentGalaxyId = saved.id;

    document.getElementById("galaxyPreviewImg").src = saved.imagePngUrl;
    document.getElementById("console").textContent = `Saved galaxy id=${saved.id}`;
    await refreshList();
  } catch (err) {
    document.getElementById("console").textContent = `Save failed: ${String(err.message || err)}`;
  }
}

async function onUpdate() {
  if (currentGalaxyId == null) return;
  try {
    const payload = readFormPayload();
    const updated = await updateGalaxy(currentGalaxyId, payload);

    document.getElementById("galaxyPreviewImg").src = updated.imagePngUrl;
    document.getElementById("console").textContent = `Updated galaxy id=${currentGalaxyId}`;
    await refreshList();
  } catch (err) {
    document.getElementById("console").textContent = `Update failed: ${String(err.message || err)}`;
  }
}

async function onDelete() {
  if (currentGalaxyId == null) return;
  try {
    await deleteGalaxy(currentGalaxyId);
    document.getElementById("galaxyPreviewImg").src = "";
    document.getElementById("console").textContent = `Deleted galaxy id=${currentGalaxyId}`;
    currentGalaxyId = null;
    await refreshList();
  } catch (err) {
    document.getElementById("console").textContent = `Delete failed: ${String(err.message || err)}`;
  }
}

document.getElementById("btnGenerate").onclick = onGeneratePreview;
document.getElementById("btnSave").onclick = onSave;
document.getElementById("btnUpdate").onclick = onUpdate;
document.getElementById("btnDelete").onclick = onDelete;

refreshList();
