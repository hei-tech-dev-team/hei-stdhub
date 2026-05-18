import api from "./axios";

// Simple in-memory cache for Cloudinary folder image lists.
// Stores a promise per folder so concurrent requests share the same network call.
const cache = Object.create(null);

export function clearCloudinaryCache(folder) {
  if (folder) delete cache[folder];
  else Object.keys(cache).forEach((k) => delete cache[k]);
}

export function getFolderImages(folder = "hei_STDhub") {
  if (!folder) folder = "hei_STDhub";
  if (cache[folder]) return cache[folder];

  // store the promise so multiple opens reuse it
  cache[folder] = api
    .get(`/auth/cloudinary-list?folder=${encodeURIComponent(folder)}`)
    .then((res) => res.data.images || [])
    .catch((err) => {
      // clear cache on error so callers can retry later
      delete cache[folder];
      throw err;
    });

  return cache[folder];
}

// Return cached data (resolved) if available synchronously, otherwise undefined
export function getCachedFolderImages(folder = "hei_STDhub") {
  const entry = cache[folder];
  if (!entry) return undefined;
  // if it's a promise, we don't synchronously have data
  if (entry.then) return undefined;
  return entry;
}

// Generate a Cloudinary thumbnail URL by injecting a transformation after '/upload/'.
// If the URL doesn't look like a Cloudinary upload URL, return original.
export function thumbnailUrl(url, w = 400, h = 220) {
  if (!url || typeof url !== 'string') return url;
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const before = url.slice(0, idx + marker.length);
  const after = url.slice(idx + marker.length);
  return `${before}w_${w},h_${h},c_fill/${after}`;
}

export default { getFolderImages, clearCloudinaryCache, getCachedFolderImages, thumbnailUrl };
