import { startUtcClock } from "./app-ui.js";
import { listGalaxies, saveGalaxy, getGalaxy } from "./galaxyApi.js";

const nameEl = document.getElementById("atlasGalaxyName");
const seedEl = document.getElementById("atlasGalaxySeed");
const tierEl = document.getElementById("atlasGalaxyTier");
const morphologyEl = document.getElementById("atlasMorphology");
const scaleEl = document.getElementById("atlasGuScale");
const scaleValueEl = document.getElementById("atlasGuScaleValue");
const zoomBlendEl = document.getElementById("atlasZoomBlend");
const zoomBlendValueEl = document.getElementById("atlasZoomBlendValue");
const smoothEl = document.getElementById("atlasSmoothTransition");
const snapOnDoubleClickEl = document.getElementById("atlasSnapOnDoubleClick");
const gridEl = document.getElementById("atlasGridOverlay");
const densityEl = document.getElementById("atlasDensityOverlay");
const selectEl = document.getElementById("atlasGalaxySelect");
const imageEl = document.getElementById("atlasGalaxyOverlay");
const statusEl = document.getElementById("atlasStatus");
const hudTierEl = document.getElementById("atlasHudTier");
const hudScaleEl = document.getElementById("atlasHudScale");
const hudTransitionEl = document.getElementById("atlasHudTransition");
const hudNameEl = document.getElementById("atlasHudName");
const hudMetaEl = document.getElementById("atlasHudMeta");
const gridLayerEl = document.getElementById("atlasGridLayer");
const densityLayerEl = document.getElementById("atlasDensityLayer");

const tierOrder = ["Galaxy View", "Expanse", "Reach", "Domain", "Region", "Quadrant", "Sector", "Subsector", "Hex"];

let galaxyItems = [];
let currentGalaxyId = null;

function setStatus(message) {
  statusEl.textContent = message;
}

function syncHud() {
  const scale = Number(scaleEl.value).toFixed(2);
  scaleValueEl.textContent = `${scale} Mpc/GU`;
  hudScaleEl.textContent = `${scale} Mpc/GU`;
  hudTierEl.textContent = tierEl.value || "Galaxy View";
  hudTransitionEl.textContent = smoothEl.checked ? "Smooth" : "Snap";
  hudNameEl.textContent = nameEl.value || "No galaxy loaded";
  zoomBlendValueEl.textContent = `${Number(zoomBlendEl.value)}%`;
}

function tierIndex() {
  const index = tierOrder.indexOf(tierEl.value);
  return index >= 0 ? index : 0;
}

function tierVisuals() {
  const index = tierIndex();
  const blend = Number(zoomBlendEl.value) / 100;
  const smooth = smoothEl.checked;

  const baseOpacity = Math.max(0.12, 1 - index * 0.1);
  const blendedOpacity = Math.max(0.08, baseOpacity - blend * 0.45);
  const gridOpacity = Math.min(0.9, 0.22 + index * 0.08 + blend * 0.34);
  const densityOpacity = Math.min(0.85, 0.18 + index * 0.03 + blend * 0.2);
  const overlayScale = 1 + index * 0.015 + blend * 0.05;

  imageEl.style.opacity = smooth ? String(blendedOpacity) : String(baseOpacity);
  imageEl.style.transform = `scale(${overlayScale})`;
  gridLayerEl.style.opacity = gridEl.checked ? String(gridOpacity) : "0";
  densityLayerEl.style.opacity = densityEl.checked ? String(densityOpacity) : "0";

  const tierName = tierOrder[index] || "Galaxy View";
  hudMetaEl.textContent = `${tierName} • ${smooth ? "smooth" : "snap"}`;
}

function applyOverlayToggles() {
  imageEl.style.transition = smoothEl.checked ? "opacity 320ms ease, transform 320ms ease" : "none";
  tierVisuals();
}

function getPayloadParams() {
  return {
    guScaleMpc: Number(scaleEl.value),
    galaxyProperties: {
      morphology: morphologyEl.value,
      ageByr: 8.6,
      metallicity: "solar",
      coreDensity: "balanced",
    },
    atlas: {
      smoothTransition: smoothEl.checked,
      gridOverlay: gridEl.checked,
      densityOverlay: densityEl.checked,
      placementTier: tierEl.value,
    },
  };
}

function setImageFromGalaxy(galaxy) {
  currentGalaxyId = galaxy.id;
  imageEl.src = galaxy.imagePngUrl || "";
  hudNameEl.textContent = galaxy.name || "Unnamed Galaxy";
  hudTierEl.textContent = galaxy.gridTier || tierEl.value || "Galaxy View";
  hudMetaEl.textContent = galaxy.imagePngPath || "Top-level shell";
  const normalizedTier = tierOrder.includes(galaxy.gridTier) ? galaxy.gridTier : "Galaxy View";
  tierEl.value = normalizedTier;
  setStatus(`Loaded galaxy id=${galaxy.id}`);
  tierVisuals();
}

async function refreshGalaxyList(selectFirst = true) {
  const data = await listGalaxies();
  galaxyItems = data.items || [];
  selectEl.innerHTML = "";

  for (const galaxy of galaxyItems) {
    const option = document.createElement("option");
    option.value = String(galaxy.id);
    option.textContent = `${galaxy.name} • ${galaxy.gridTier} • #${galaxy.id}`;
    selectEl.appendChild(option);
  }

  if (selectFirst && galaxyItems.length > 0) {
    selectEl.value = String(galaxyItems[0].id);
    await loadSelectedGalaxy();
  }

  if (galaxyItems.length === 0) {
    setStatus("No saved galaxies yet.");
  }
}

async function loadSelectedGalaxy() {
  const id = Number(selectEl.value);
  if (!id) return;
  const galaxy = await getGalaxy(id);
  setImageFromGalaxy(galaxy);
}

function stepTier(direction) {
  const currentIndex = tierIndex();
  const nextIndex = Math.max(0, Math.min(tierOrder.length - 1, currentIndex + direction));
  tierEl.value = tierOrder[nextIndex];
  zoomBlendEl.value = "0";
  syncHud();
  tierVisuals();

  if (tierOrder[nextIndex] === "Hex") {
    setStatus("Hex reached. Double click resolves to System Orbit View later.");
  }
}

async function generateAndPlaceGalaxy() {
  const payload = {
    name: nameEl.value || "Atlas Galaxy",
    seed: Number(seedEl.value),
    gridTier: tierEl.value,
    params: getPayloadParams(),
  };

  const saved = await saveGalaxy(payload);
  setStatus(`Generated and placed galaxy id=${saved.id}`);
  await refreshGalaxyList(false);
  selectEl.value = String(saved.id);
  await loadSelectedGalaxy();
}

function wireEvents() {
  [nameEl, seedEl, tierEl, morphologyEl, scaleEl, smoothEl, gridEl, densityEl].forEach((el) => {
    el.addEventListener("input", () => {
      syncHud();
      applyOverlayToggles();
    });
    el.addEventListener("change", () => {
      syncHud();
      applyOverlayToggles();
    });
  });

  zoomBlendEl.addEventListener("input", () => {
    syncHud();
    tierVisuals();
  });

  snapOnDoubleClickEl.addEventListener("change", () => {
    setStatus(snapOnDoubleClickEl.checked ? "Double click will step tiers." : "Double click disabled.");
  });

  document.getElementById("atlasGenerate").addEventListener("click", async () => {
    try {
      setStatus("Generating galaxy overlay...");
      await generateAndPlaceGalaxy();
    } catch (error) {
      setStatus(`Generate failed: ${String(error.message || error)}`);
    }
  });

  document.getElementById("atlasRefresh").addEventListener("click", async () => {
    try {
      setStatus("Refreshing galaxy list...");
      await refreshGalaxyList(false);
      setStatus("Galaxy list refreshed.");
    } catch (error) {
      setStatus(`Refresh failed: ${String(error.message || error)}`);
    }
  });

  document.getElementById("atlasLoadSelected").addEventListener("click", async () => {
    try {
      await loadSelectedGalaxy();
    } catch (error) {
      setStatus(`Load failed: ${String(error.message || error)}`);
    }
  });

  document.getElementById("atlasClearOverlay").addEventListener("click", () => {
    currentGalaxyId = null;
    imageEl.removeAttribute("src");
    hudNameEl.textContent = "No galaxy loaded";
    hudMetaEl.textContent = "Top-level shell";
    setStatus("Overlay cleared.");
  });

  document.getElementById("atlasGalaxyOverlay").addEventListener("dblclick", () => {
    if (!snapOnDoubleClickEl.checked) {
      setStatus("Double click snapping is disabled.");
      return;
    }

    const current = tierOrder.indexOf(tierEl.value);
    if (current < 0) return;

    if (current >= tierOrder.length - 1) {
      const orbitGalaxyId = currentGalaxyId || Number(selectEl.value) || null;
      if (!orbitGalaxyId) {
        setStatus("Load or generate a galaxy before opening System Orbit View.");
        return;
      }

      setStatus("Opening System Orbit View...");
      window.location.href = `system-orbit.html?galaxyId=${encodeURIComponent(String(orbitGalaxyId))}`;
      return;
    }

    stepTier(1);
    setStatus(`Zoomed to ${tierEl.value}.`);
  });

  selectEl.addEventListener("change", async () => {
    try {
      await loadSelectedGalaxy();
    } catch (error) {
      setStatus(`Selection failed: ${String(error.message || error)}`);
    }
  });
}

startUtcClock(document.getElementById("utcClock"));
wireEvents();
syncHud();
applyOverlayToggles();
refreshGalaxyList(true).catch((error) => {
  setStatus(`Failed to load galaxies: ${String(error.message || error)}`);
});
