import { startUtcClock } from "./app-ui.js";
import { listGalaxies, getGalaxy } from "./galaxyApi.js";

const galaxySelectEl = document.getElementById("orbitGalaxySelect");
const ringEl = document.getElementById("orbitRing");
const markerEl = document.getElementById("orbitMarker");
const ringHudEl = document.getElementById("orbitHudRing");
const nameHudEl = document.getElementById("orbitHudName");
const scaleHudEl = document.getElementById("orbitHudScale");
const captionEl = document.getElementById("orbitCaption");
const statusEl = document.getElementById("orbitStatus");
const planetEl = document.getElementById("orbitPlanet");
const ringsEl = document.getElementById("orbitRings");

let galaxies = [];
let selectedGalaxy = null;

function setStatus(message) {
  statusEl.textContent = message;
}

function getQueryGalaxyId() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("galaxyId");
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function renderOrbitRings() {
  ringsEl.innerHTML = "";
  const stage = document.getElementById("orbitStage");
  const sizes = [120, 170, 220, 270, 320, 370, 420, 470, 520, 570];

  sizes.forEach((size, index) => {
    const ring = document.createElement("div");
    ring.className = "ring orbit";
    ring.style.width = `${size}px`;
    ring.style.height = `${size}px`;
    ring.style.opacity = String(Math.max(0.15, 0.62 - index * 0.03));
    ring.dataset.ring = String(index * 2);
    ring.title = `Orbit ring ${index * 2}`;
    ring.addEventListener("dblclick", () => {
      ringEl.value = String(index * 2);
      updateOrbit();
      setStatus(`Selected orbital ring ${index * 2}.`);
    });
    ringsEl.appendChild(ring);
  });

  const core = document.createElement("div");
  core.className = "ring core";
  core.style.transform = "translate(-50%, -50%)";
  ringsEl.appendChild(core);

  stage.addEventListener("mousemove", (event) => {
    const rect = stage.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    planetEl.style.left = `${x}%`;
    planetEl.style.top = `${y}%`;
  });

  planetEl.addEventListener("dblclick", () => {
    const galaxyId = selectedGalaxy?.id || Number(galaxySelectEl.value) || null;
    if (!galaxyId) {
      setStatus("Load a galaxy before opening World View.");
      return;
    }

    window.location.href = `world-view.html?galaxyId=${encodeURIComponent(String(galaxyId))}&ring=${encodeURIComponent(ringEl.value)}`;
  });
}

function updateOrbit() {
  const ring = Number(ringEl.value);
  ringHudEl.textContent = String(ring);
  captionEl.textContent = `${markerEl.value || "Hex Anchor"} • Orbit Ring ${ring}`;
  scaleHudEl.textContent = `1.00 Mpc/GU`;
  planetEl.style.width = `${Math.max(10, 18 - ring * 0.25)}px`;
  planetEl.style.height = planetEl.style.width;
  planetEl.style.boxShadow = `0 0 ${18 + ring * 1.5}px rgba(155, 205, 255, 0.55)`;
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

  const queryGalaxyId = getQueryGalaxyId();
  const initialGalaxy = queryGalaxyId ? galaxies.find((entry) => entry.id === queryGalaxyId) : galaxies[0];
  if (initialGalaxy) {
    galaxySelectEl.value = String(initialGalaxy.id);
    await loadGalaxy(Number(initialGalaxy.id));
  }
}

async function loadGalaxy(id) {
  const galaxy = await getGalaxy(id);
  selectedGalaxy = galaxy;
  nameHudEl.textContent = galaxy.name || "Unnamed Galaxy";
  scaleHudEl.textContent = `1.00 Mpc/GU`;
  setStatus(`Loaded ${galaxy.name || "galaxy"} for orbit view.`);
  captionEl.textContent = `${markerEl.value || "Hex Anchor"} • Orbit Ring ${ringEl.value}`;
}

function wireEvents() {
  ringEl.addEventListener("input", () => {
    updateOrbit();
  });

  markerEl.addEventListener("input", () => {
    updateOrbit();
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

  document.getElementById("orbitRefresh").addEventListener("click", async () => {
    try {
      setStatus("Refreshing galaxy list...");
      await refreshGalaxyList();
      setStatus("Galaxy list refreshed.");
    } catch (error) {
      setStatus(`Refresh failed: ${String(error.message || error)}`);
    }
  });

  document.getElementById("orbitBackToAtlas").addEventListener("click", () => {
    window.location.href = "atlas.html";
  });
}

startUtcClock(document.getElementById("utcClock"));
renderOrbitRings();
wireEvents();
updateOrbit();
refreshGalaxyList().catch((error) => {
  setStatus(`Failed to initialize orbit view: ${String(error.message || error)}`);
});
