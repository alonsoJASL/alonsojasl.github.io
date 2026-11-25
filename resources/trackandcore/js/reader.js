// The reader's date and memory. For the orchestrators that show a race.

/** The pages use the same keys, so that a choice on one page is also the choice on the other. */
export const STORAGE_KEYS = { race: "trackandcore.race", units: "trackandcore.units" };

/** @typedef {{ load: () => string|null, save: (value: string) => void }} Memory */

/** The reader's local calendar date, as an ISO string. */
export function localIsoDate(now) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Storage can fail, for example in a private window. The page works without it. @returns {Memory} */
export function createMemory({ getStorage, key }) {
  return {
    load() {
      try { return getStorage().getItem(key); } catch { return null; }
    },
    save(value) {
      try { getStorage().setItem(key, value); } catch { /* not remembered */ }
    },
  };
}
