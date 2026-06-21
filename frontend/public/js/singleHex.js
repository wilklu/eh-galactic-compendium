import { startUtcClock } from "./app-ui.js";
import { listGalaxies, getGalaxy } from "./galaxyApi.js";

const galaxySelectEl = document.getElementById("singleGalaxySelect");
const markerEl = document.getElementById("singleMarker");
const featureEl = document.getElementById("singleFeature");
const hudGalaxyEl = document.getElementById("singleHudGalaxy");
const hudCellEl = document.getElementById("singleHudCell");
const hudFeatureEl = document.getElementById("singleHudFeature");
const hudTerrainEl = document.getElementById("singleHudTerrain");
const hudClimateEl = document.getElementById("singleHudClimate");
const hudElevationEl = document.getElementById("singleHudElevation");
const hudTerrainFeatureEl = document.getElementById("singleHudTerrainFeature");
const captionEl = document.getElementById("singleCaption");
const statusEl = document.getElementById("singleStatus");

let galaxies = [];
let selectedGalaxy = null;
let terrainContext = null;

function setStatus(message) {
  statusEl.textContent = message;
}

function query(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function loadTerrainContext() {
  terrainContext = {
    terrainCell: query("terrainCell"),
    terrainLabel: query("terrainLabel"),
    terrainType: query("terrainType"),
    terrainClimate: query("terrainClimate"),
    terrainElevation: query("terrainElevation"),
    terrainFeature: query("terrainFeature"),
    worldHex: query("worldHex"),
    band: query("band"),
  };
}

function featureLabel(value) {
  return value === "outpost"
    ? "Outpost Site"
    : value === "ruins"
      ? "Ruins Cluster"
      : value === "anomaly"
        ? "Anomaly Pocket"
        : "Survey Focus";
}

function updateHud() {
  hudFeatureEl.textContent = featureLabel(featureEl.value);
  hudCellEl.textContent = terrainContext?.terrainCell
    ? `${terrainContext.terrainCell}${terrainContext.terrainLabel ? ` • ${terrainContext.terrainLabel}` : ""}`
    : "Terrain cell pending";
  hudTerrainEl.textContent = terrainContext?.terrainLabel || "None";
  hudClimateEl.textContent = terrainContext?.terrainClimate || "-";
  hudElevationEl.textContent = terrainContext?.terrainElevation || "-";
  hudTerrainFeatureEl.textContent = terrainContext?.terrainFeature || "-";
  captionEl.textContent = `${markerEl.value || "Landing Site"} • ${terrainContext?.terrainLabel || featureLabel(featureEl.value)}`;
}

async function refreshGalaxyList() {
  const data = await listGalaxies();
  galaxies = data.items || [];
  galaxySelectEl.innerHTML = "";

  for (const galaxy of galaxies) {
    const option = document.createElement("option");
    option.value = String(galaxy.id);
    option.textContent = `${galaxy.name} • ${galaxy.gridTier} • #${galaxy.id}`;
    galaxySelectEl.appendChild(option);
  }

  const queryGalaxyId = query("galaxyId");
  const initialGalaxy = queryGalaxyId
    ? galaxies.find((entry) => String(entry.id) === String(queryGalaxyId))
    : galaxies[0];
  if (initialGalaxy) {
    galaxySelectEl.value = String(initialGalaxy.id);
    await loadGalaxy(Number(initialGalaxy.id));
  }
}

async function loadGalaxy(id) {
  const galaxy = await getGalaxy(id);
  selectedGalaxy = galaxy;
  hudGalaxyEl.textContent = galaxy.name || "Unnamed Galaxy";
  setStatus(`Loaded ${galaxy.name || "galaxy"} for single hex view.`);
  updateHud();
}

function wireEvents() {
  galaxySelectEl.addEventListener("change", async () => {
    const id = Number(galaxySelectEl.value);
    if (!id) return;
    try {
      await loadGalaxy(id);
    } catch (error) {
      setStatus(`Failed to load galaxy: ${String(error.message || error)}`);
    }
  });

  markerEl.addEventListener("input", () => {
    updateHud();
  });

  featureEl.addEventListener("change", () => {
    updateHud();
    setStatus(`Feature class set to ${featureLabel(featureEl.value)}.`);
  });

  document.getElementById("singleBackToTerrain").addEventListener("click", () => {
    const params = new URLSearchParams();
    if (selectedGalaxy?.id) params.set("galaxyId", String(selectedGalaxy.id));
    const worldHex = query("worldHex");
    if (worldHex) params.set("worldHex", worldHex);
    if (query("band")) params.set("band", query("band"));
    window.location.href = `terrain-view.html${params.toString() ? `?${params.toString()}` : ""}`;
  });

  document.getElementById("singleOpenSurvey").addEventListener("click", () => {
    if (!selectedGalaxy?.id) {
      setStatus("Load a galaxy before opening Survey View.");
      return;
    }

    localStorage.setItem(
      "ehgc_pending_survey_context",
      JSON.stringify({
        galaxyId: selectedGalaxy.id,
        marker: markerEl.value || "Landing Site",
        terrainCell: terrainContext?.terrainCell || null,
        band: featureEl.value,
        terrain: terrainContext,
        at: Date.now(),
      }),
    );

    window.location.href = "galaxy-survey.html";
  });
}

startUtcClock(document.getElementById("utcClock"));
loadTerrainContext();
wireEvents();
updateHud();
refreshGalaxyList().catch((error) => {
  setStatus(`Failed to initialize single hex view: ${String(error.message || error)}`);
});
