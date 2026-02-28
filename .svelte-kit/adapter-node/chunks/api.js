import { b as private_env } from "./shared-server.js";
import "./index2.js";
const CACHE_TTL = 10 * 60 * 1e3;
const MAX_ENTRIES = 500;
const cache = /* @__PURE__ */ new Map();
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}
function setCache(key, data, ttl = CACHE_TTL) {
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}
let clientToken = null;
let clientTokenExpiresAt = 0;
async function getClientToken() {
  if (clientToken && Date.now() < clientTokenExpiresAt - 6e4) {
    return clientToken;
  }
  const res = await fetch("https://osu.ppy.sh/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: private_env.OSU_CLIENT_ID,
      client_secret: private_env.OSU_CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "identify public"
    })
  });
  if (!res.ok) {
    throw new Error(`Failed to get osu! client token: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  clientToken = data.access_token;
  clientTokenExpiresAt = Date.now() + data.expires_in * 1e3;
  return clientToken;
}
async function osuFetch(path, token) {
  const t = await getClientToken();
  const res = await fetch(`https://osu.ppy.sh/api/v2${path}`, {
    headers: { Authorization: `Bearer ${t}` }
  });
  if (!res.ok) {
    throw new Error(`osu! API ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
async function getBeatmap(beatmapId) {
  const cacheKey = `beatmap:${beatmapId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const data = await osuFetch(`/beatmaps/${beatmapId}`);
  setCache(cacheKey, data);
  return data;
}
export {
  getBeatmap as g
};
