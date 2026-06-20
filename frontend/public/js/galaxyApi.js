// frontend/public/js/galaxyApi.js

const API_BASE = "/api";

function ensureOk(res) {
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
}

function toApiPayload(payload = {}) {
  return {
    name: payload.name,
    description: payload.description ?? null,
    seed: Number(payload.seed),
    grid_tier: payload.grid_tier ?? payload.gridTier,
  };
}

function toImageUrl(imagePath) {
  if (!imagePath) return "";
  if (imagePath.startsWith("http") || imagePath.startsWith("data:")) return imagePath;
  if (imagePath.startsWith("/")) return imagePath;
  return `/static/${imagePath}`;
}

function mapGalaxy(g) {
  if (!g) return g;
  return {
    ...g,
    gridTier: g.grid_tier,
    imagePngPath: g.image_png_path,
    imagePngUrl: toImageUrl(g.image_png_path),
  };
}

export async function generateGalaxy(payload) {
  const res = await fetch(`${API_BASE}/galaxies/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApiPayload(payload)),
  });
  ensureOk(res);
  return await res.json();
}

export async function listGalaxies() {
  const res = await fetch(`${API_BASE}/galaxies`);
  ensureOk(res);
  const data = await res.json();
  const items = Array.isArray(data) ? data.map(mapGalaxy) : (data.items ?? []).map(mapGalaxy);
  return { items };
}

export async function saveGalaxy(payload) {
  const res = await fetch(`${API_BASE}/galaxies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApiPayload(payload)),
  });
  ensureOk(res);
  return mapGalaxy(await res.json());
}

export async function updateGalaxy(id, payload) {
  const res = await fetch(`${API_BASE}/galaxies/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      description: payload.description ?? null,
      grid_tier: payload.grid_tier ?? payload.gridTier,
    }),
  });
  ensureOk(res);
  return mapGalaxy(await res.json());
}

export async function deleteGalaxy(id) {
  const res = await fetch(`${API_BASE}/galaxies/${id}`, { method: "DELETE" });
  ensureOk(res);
  return true;
}

export async function getGalaxy(id) {
  const res = await fetch(`${API_BASE}/galaxies/${id}`);
  ensureOk(res);
  return mapGalaxy(await res.json());
}
