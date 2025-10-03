const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

const store = new Map(); // key -> { expiresAt: number }

function now() {
  return Date.now();
}

function prune() {
  const t = now();
  for (const [key, val] of store.entries()) {
    if (val.expiresAt <= t) {
      store.delete(key);
    }
  }
}

function has(key) {
  prune();
  return store.has(key);
}

function set(key, ttlMs = DEFAULT_TTL_MS) {
  prune();
  const expiresAt = now() + ttlMs;
  store.set(key, { expiresAt });
}

function clear() {
  store.clear();
}

module.exports = {
  has,
  set,
  clear,
  prune,
  DEFAULT_TTL_MS,
};
