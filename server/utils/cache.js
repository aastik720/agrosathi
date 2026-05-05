const store = new Map();

export function getCache(key) {
  const item = store.get(key);
  if (!item) return null;

  if (Date.now() > item.expiresAt) {
    return { ...item, expired: true };
  }

  return { ...item, expired: false };
}

export function setCache(key, data, ttlMs) {
  const item = {
    data,
    updatedAt: new Date().toISOString(),
    expiresAt: Date.now() + ttlMs,
  };

  store.set(key, item);
  return item;
}

export function getFreshCache(key) {
  const item = getCache(key);
  return item && !item.expired ? item : null;
}
