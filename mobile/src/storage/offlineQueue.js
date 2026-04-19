import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "agunity-offline-activities";

const nowIso = () => new Date().toISOString();

const toEntry = (item) => {
  if (item?.id && Object.prototype.hasOwnProperty.call(item, "payload")) {
    return item;
  }

  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    payload: item,
    retryCount: 0,
    lastError: null,
    nextRetryAt: null,
    createdAt: nowIso()
  };
};

const readAll = async () => {
  const raw = JSON.parse((await AsyncStorage.getItem(KEY)) || "[]");
  return raw.map(toEntry);
};

const writeAll = async (items) => {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
};

export const addToQueue = async (item) => {
  const existing = await readAll();
  existing.push(toEntry(item));
  await writeAll(existing);
  return existing.length;
};

export const pullQueue = async () => {
  const existing = await readAll();
  const now = Date.now();
  return existing.filter((entry) => {
    if (!entry.nextRetryAt) return true;
    return new Date(entry.nextRetryAt).getTime() <= now;
  });
};

export const markSynced = async (entryId) => {
  const existing = await readAll();
  const filtered = existing.filter((entry) => entry.id !== entryId);
  await writeAll(filtered);
  return filtered.length;
};

export const markFailed = async (entryId, errorMessage) => {
  const existing = await readAll();
  const updated = existing.map((entry) => {
    if (entry.id !== entryId) return entry;
    const retryCount = Number(entry.retryCount || 0) + 1;
    const waitMs = Math.min(30 * 60 * 1000, 60 * 1000 * 2 ** Math.min(retryCount, 8));
    return {
      ...entry,
      retryCount,
      lastError: String(errorMessage || "Unknown sync error"),
      nextRetryAt: new Date(Date.now() + waitMs).toISOString()
    };
  });
  await writeAll(updated);
  return updated.length;
};

export const countQueue = async () => {
  const existing = await readAll();
  return existing.length;
};

export const clearQueue = async () => {
  await AsyncStorage.removeItem(KEY);
};
