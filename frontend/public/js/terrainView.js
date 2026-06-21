import { startUtcClock } from "./app-ui.js";
import { listGalaxies, getGalaxy } from "./galaxyApi.js";

const galaxySelectEl = document.getElementById("terrainGalaxySelect");
const markerEl = document.getElementById("terrainMarker");
const bandEl = document.getElementById("terrainBand");
const hudGalaxyEl = document.getElementById("terrainHudGalaxy");
const hudWorldHexEl = document.getElementById("terrainHudWorldHex");
const hudBandEl = document.getElementById("terrainHudBand");
const hudScaleEl = document.getElementById("terrainHudScale");
const hudCellEl = document.getElementById("terrainHudCell");
const hudElevationEl = document.getElementById("terrainHudElevation");
const hudClimateEl = document.getElementById("terrainHudClimate");
const hudFeatureEl = document.getElementById("terrainHudFeature");
const captionEl = document.getElementById("terrainCaption");
const statusEl = document.getElementById("terrainStatus");
const mapEl = document.getElementById("terrainMap");

let galaxies = [];
let selectedGalaxy = null;
let selectedCell = null;

const terrainCells = [
  {
    type: "ocean",
    label: "Abyssal Shelf",
    elevation: "-3200m",
    climate: "marine",
    population: "none",
    feature: "deep water",
  },
  {
    type: "ocean",
    label: "Tidefall Basin",
    elevation: "-1400m",
    climate: "marine",
    population: "none",
    feature: "kelp trenches",
  },
  {
    type: "forest",
    label: "Greenveil Span",
    elevation: "220m",
    climate: "temperate",
    population: "sparse",
    feature: "canopy arc",
  },
  {
    type: "highland",
    label: "Ridgewatch Line",
    elevation: "1840m",
    climate: "cold steppe",
    population: "sparse",
    feature: "wind-cut mesas",
  },
  {
    type: "desert",
    label: "Glass Dune Reach",
    elevation: "860m",
    climate: "arid",
    population: "none",
    feature: "silica sands",
  },
  {
    type: "settlement",
    label: "Crown Anchorage",
    elevation: "110m",
    climate: "settled",
    population: "dense",
    feature: "city lattice",
  },
  {
    type: "ocean",
    label: "Bluefall Trench",
    elevation: "-2200m",
    climate: "marine",
    population: "none",
    feature: "thermal vents",
  },
  {
    type: "forest",
    label: "Mosslight Verge",
    elevation: "310m",
    climate: "humid",
    population: "moderate",
    feature: "ancient woods",
  },
  {
    type: "forest",
    label: "Verdant Fold",
    elevation: "260m",
    climate: "humid",
    population: "moderate",
    feature: "river braid",
  },
  {
    type: "highland",
    label: "Horizon Crest",
    elevation: "2120m",
    climate: "alpine",
    population: "sparse",
    feature: "snow ridges",
  },
  {
    type: "desert",
    label: "Ochre Step",
    elevation: "640m",
    climate: "arid",
    population: "none",
    feature: "dry basins",
  },
  {
    type: "wilds",
    label: "Nomad Wilds",
    elevation: "390m",
    climate: "mixed",
    population: "limited",
    feature: "untamed corridors",
  },
  {
    type: "forest",
    label: "Canopy Drift",
    elevation: "200m",
    climate: "temperate",
    population: "sparse",
    feature: "fog trees",
  },
  {
    type: "wilds",
    label: "Broken Track",
    elevation: "530m",
    climate: "mixed",
    population: "limited",
    feature: "fractured roads",
  },
  {
    type: "settlement",
    label: "Beacon Quarter",
    elevation: "140m",
    climate: "settled",
    population: "dense",
    feature: "port district",
  },
  {
    type: "highland",
    label: "Stonewind Rise",
    elevation: "1760m",
    climate: "cold steppe",
    population: "sparse",
    feature: "basalt cliffs",
  },
  {
    type: "desert",
    label: "Sunscar Expanse",
    elevation: "720m",
    climate: "arid",
    population: "none",
    feature: "dune sea",
  },
  {
    type: "wilds",
    label: "Untethered March",
    elevation: "410m",
    climate: "mixed",
    population: "limited",
    feature: "frontier range",
  },
  {
    type: "forest",
    label: "Rootwake Belt",
    elevation: "180m",
    climate: "humid",
    population: "moderate",
    feature: "river forest",
  },
  {
    type: "ocean",
    label: "Stormglass Bay",
    elevation: "-980m",
    climate: "marine",
    population: "none",
    feature: "storm channels",
  },
  {
    type: "wilds",
    label: "Freefall Range",
    elevation: "470m",
    climate: "mixed",
    population: "limited",
    feature: "ridge passes",
  },
  {
    type: "highland",
    label: "Skyline Spine",
    elevation: "1980m",
    climate: "alpine",
    population: "sparse",
    feature: "ice shelves",
  },
  {
    type: "settlement",
    label: "Forum Terrace",
    elevation: "120m",
    climate: "settled",
    population: "dense",
    feature: "administrative core",
  },
  {
    type: "desert",
    label: "Amber Verge",
    elevation: "780m",
    climate: "arid",
    population: "none",
    feature: "heat bloom",
  },
  {
    type: "forest",
    label: "Emerald Gate",
    elevation: "280m",
    climate: "temperate",
    population: "moderate",
    feature: "trade road",
  },
  {
    type: "wilds",
    label: "Riven Wilds",
    elevation: "360m",
    climate: "mixed",
    population: "limited",
    feature: "broken valley",
  },
  {
    type: "ocean",
    label: "Tidal Margin",
    elevation: "-760m",
    climate: "marine",
    population: "none",
    feature: "tidal shelves",
  },
  {
    type: "highland",
    label: "Northfall Ridge",
    elevation: "1910m",
    climate: "alpine",
    population: "sparse",
    feature: "snow cap",
  },
  {
    type: "forest",
    label: "Helix Grove",
    elevation: "240m",
    climate: "humid",
    population: "moderate",
    feature: "spiral canopy",
  },
  {
    type: "desert",
    label: "Saffron Flats",
    elevation: "610m",
    climate: "arid",
    population: "none",
    feature: "salt pans",
  },
  {
    type: "settlement",
    label: "Civic Ring",
    elevation: "90m",
    climate: "settled",
    population: "dense",
    feature: "metro band",
  },
  {
    type: "wilds",
    label: "Nomad Trace",
    elevation: "420m",
    climate: "mixed",
    population: "limited",
    feature: "trail nexus",
  },
  {
    type: "forest",
    label: "Briar Depth",
    elevation: "170m",
    climate: "humid",
    population: "moderate",
    feature: "thick undergrowth",
  },
  {
    type: "highland",
    label: "Iron Crown",
    elevation: "2240m",
    climate: "cold steppe",
    population: "sparse",
    feature: "stone crowns",
  },
  {
    type: "ocean",
    label: "Gale Shelf",
    elevation: "-540m",
    climate: "marine",
    population: "none",
    feature: "open sea",
  },
  {
    type: "desert",
    label: "Ash Drift",
    elevation: "690m",
    climate: "arid",
    population: "none",
    feature: "volcanic dust",
  },
];

function setStatus(message) {
  statusEl.textContent = message;
}

function query(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function bandLabel(value) {
  return value === "highland"
    ? "Highland Ridge"
    : value === "wilds"
      ? "Wilds Corridor"
      : value === "capital"
        ? "Settlement Core"
        : "Coastal Shelf";
}

function scaleLabel(value) {
  return value === "capital" ? "500 m" : value === "highland" ? "1.4 km" : value === "wilds" ? "2.8 km" : "2.8 km";
}

function renderTerrainMap() {
  mapEl.innerHTML = "";
  terrainCells.forEach((cellData, index) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `terrain-hex ${cellData.type}`;
    cell.title = `${cellData.label} | ${cellData.elevation} | ${cellData.climate}`;
    cell.innerHTML = `<span class="tag">${String(index + 1).padStart(2, "0")}</span>`;
    cell.addEventListener("dblclick", () => {
      selectCell(index);
      openSingleHex(index + 1);
    });
    cell.addEventListener("click", () => {
      selectCell(index);
    });
    mapEl.appendChild(cell);
  });
}

function selectCell(index) {
  selectedCell = terrainCells[index] ? { ...terrainCells[index], index: index + 1 } : null;
  if (!selectedCell) return;
  setStatus(`Selected ${selectedCell.label} (${selectedCell.elevation}, ${selectedCell.climate}).`);
  captionEl.textContent = `${markerEl.value || "Landing Site"} • ${selectedCell.label}`;
  updateHud();
}

function updateHud() {
  hudBandEl.textContent = bandLabel(bandEl.value);
  hudScaleEl.textContent = scaleLabel(bandEl.value);
  const worldHex = query("worldHex");
  hudWorldHexEl.textContent = selectedCell
    ? `Cell ${selectedCell.index} • ${selectedCell.label}`
    : worldHex
      ? `World hex ${worldHex}`
      : "World hex pending";
  hudCellEl.textContent = selectedCell ? `${selectedCell.index}` : "None";
  hudElevationEl.textContent = selectedCell ? selectedCell.elevation : "-";
  hudClimateEl.textContent = selectedCell ? selectedCell.climate : "-";
  hudFeatureEl.textContent = selectedCell ? selectedCell.feature : "-";
  if (!selectedCell) {
    captionEl.textContent = `${markerEl.value || "Landing Site"} • ${bandLabel(bandEl.value)}`;
  }
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
  setStatus(`Loaded ${galaxy.name || "galaxy"} for terrain view.`);
  updateHud();
}

function openSingleHex(cellNumber) {
  if (!selectedGalaxy?.id) {
    setStatus("Load a galaxy before opening Single Hex.");
    return;
  }

  const cell = selectedCell ?? terrainCells[cellNumber - 1];

  const params = new URLSearchParams({
    galaxyId: String(selectedGalaxy.id),
    marker: markerEl.value || "Landing Site",
    band: bandEl.value,
    terrainCell: String(cellNumber),
    terrainLabel: cell?.label || "Unknown Terrain",
    terrainType: cell?.type || "unknown",
    terrainClimate: cell?.climate || "unknown",
    terrainElevation: cell?.elevation || "unknown",
    terrainFeature: cell?.feature || "unknown",
  });

  window.location.href = `single-hex.html?${params.toString()}`;
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

  bandEl.addEventListener("change", () => {
    updateHud();
    setStatus(`Terrain band set to ${bandLabel(bandEl.value)}.`);
  });

  document.getElementById("terrainBackToWorld").addEventListener("click", () => {
    const params = new URLSearchParams();
    if (selectedGalaxy?.id) params.set("galaxyId", String(selectedGalaxy.id));
    const worldHex = query("worldHex");
    if (worldHex) params.set("worldHex", worldHex);
    window.location.href = `world-view.html${params.toString() ? `?${params.toString()}` : ""}`;
  });

  document.getElementById("terrainOpenSingle").addEventListener("click", () => {
    openSingleHex(1);
  });
}

startUtcClock(document.getElementById("utcClock"));
renderTerrainMap();
wireEvents();
updateHud();
refreshGalaxyList().catch((error) => {
  setStatus(`Failed to initialize terrain view: ${String(error.message || error)}`);
});
