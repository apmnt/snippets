export const IMAGE_TTL = 24 * 60 * 60;

export function createImageCache(render, { now = Date.now, limit = 32 } = {}) {
  const entries = new Map();
  return async function cachedImage(key, input) {
    const existing = entries.get(key);
    if (existing && existing.expires > now()) return existing.promise;
    const entry = { expires: Infinity, promise: undefined };
    entry.promise = Promise.resolve()
      .then(() => render(input))
      .then((image) => {
        entry.expires = now() + IMAGE_TTL * 1000;
        return { image, expiresAt: entry.expires };
      })
      .catch((error) => {
        if (entries.get(key) === entry) entries.delete(key);
        throw error;
      });
    entries.delete(key);
    entries.set(key, entry);
    while (entries.size > limit) entries.delete(entries.keys().next().value);
    return entry.promise;
  };
}
