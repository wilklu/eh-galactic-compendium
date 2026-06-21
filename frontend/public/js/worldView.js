import { startUtcClock } from "./app-ui.js";
import { listGalaxies, getGalaxy } from "./galaxyApi.js";

const galaxySelectEl = document.getElementById("worldGalaxySelect");
const scaleEl = document.getElementById("worldScale");
const markerEl = document.getElementById("worldMarker");
const hudNameEl = document.getElementById("worldHudName");
const hudScaleEl = document.getElementById("worldHudScale");
const hudHexEl = document.getElementById("worldHudHex");
const captionEl = document.getElementById("worldCaption");
const statusEl = document.getElementById("worldStatus");
const hexesEl = document.getElementById("worldHexes");

let galaxies = [];
let selectedGalaxy = null;

function setStatus(message) {
  statusEl.textContent = message;
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function renderWorldHexes() {
  hexesEl.innerHTML = "";
  const placements = [
    { left: "44%", top: "18%", kind: "core" },
    { left: "32%", top: "28%", kind: "terrain" },
    { left: "54%", top: "26%", kind: "terrain" },
    { left: "28%", top: "44%", kind: "single" },
    { left: "46%", top: "42%", kind: "terrain" },
    { left: "60%", top: "48%", kind: "single" },
    { left: "38%", top: "60%", kind: "terrain" },
    { left: "52%", top: "66%", kind: "single" },
    { left: "66%", top: "58%", kind: "terrain" },
    { left: "22%", top: "58%", kind: "single" },
  ];

  placements.forEach((placement, index) => {
    const hex = document.createElement("div");
    hex.className = `world-hex ${placement.kind}`;
    hex.style.left = placement.left;
    hex.style.top = placement.top;
    hex.title = `${placement.kind} hex ${index + 1}`;
    hex.addEventListener("dblclick", () => {
      openTerrainView(index + 1);
    });
    hexesEl.appendChild(hex);
  });
}

function updateWorldHud() {
  const scale = scaleEl.value;
  hudScaleEl.textContent =
    scale === "world"
      ? "World View"
      : scale === "terrain"
        ? "Terrain Hex"
        : scale === "local"
          ? "Local Hex"
          : "Single Hex";
  hudHexEl.textContent =
    scale === "single" ? "500m" : scale === "local" ? "37.5m" : scale === "terrain" ? "2.8km" : "Icosahedral";
  captionEl.textContent = `${markerEl.value || "Landing Site"} • ${hudScaleEl.textContent}`;
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

  const queryGalaxyId = getQueryParam("galaxyId");
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
  hudNameEl.textContent = galaxy.name || "Unnamed Galaxy";
  setStatus(`Loaded ${galaxy.name || "galaxy"} for world view.`);
  updateWorldHud();
}

function wireEvents() {
  scaleEl.addEventListener("change", () => {
    updateWorldHud();
  });

  markerEl.addEventListener("input", () => {
    updateWorldHud();
  });

  galaxySelectEl.addEventListener("change", async () => {
    const id = Number(galaxySelectEl.value);
    if (!id) return;
    try {
      await loadGalaxy(id);
    } catch (error) {
      setStatus(`Failed to load galaxy: ${String(error.message || error)}`);
    }
  });

  document.getElementById("worldRefresh").addEventListener("click", async () => {
    try {
      setStatus("Refreshing galaxy list...");
      await refreshGalaxyList();
      setStatus("Galaxy list refreshed.");
    } catch (error) {
      setStatus(`Refresh failed: ${String(error.message || error)}`);
    }
  });

  document.getElementById("worldBackToOrbit").addEventListener("click", () => {
    const galaxyId = selectedGalaxy?.id ? `?galaxyId=${encodeURIComponent(String(selectedGalaxy.id))}` : "";
    window.location.href = `system-orbit.html${galaxyId}`;
  });

  document.getElementById("worldOpenTerrain").addEventListener("click", () => {
    openTerrainView(null);
  });
}

function openTerrainView(hexIndex) {
  if (!selectedGalaxy?.id) {
    setStatus("Load a galaxy before opening Terrain View.");
    return;
  }

  const params = new URLSearchParams({
    galaxyId: String(selectedGalaxy.id),
    marker: markerEl.value || "Landing Site",
    scale: scaleEl.value,
  });

  if (hexIndex !== null) {
    params.set("worldHex", String(hexIndex));
  }

  window.location.href = `terrain-view.html?${params.toString()}`;
}

startUtcClock(document.getElementById("utcClock"));
renderWorldHexes();
wireEvents();
updateWorldHud();
refreshGalaxyList().catch((error) => {
  setStatus(`Failed to initialize world view: ${String(error.message || error)}`);
});
