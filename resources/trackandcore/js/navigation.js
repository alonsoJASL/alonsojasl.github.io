// Pure navigation logic: swipe, keys and URL text. No DOM.

const MIN_SWIPE_PX = 50;
const VIEWS = ["week", "long"];
const UNITS = ["both", "km", "mi"];

/** @returns {-1|0|1} the card step for a finished touch. Mostly vertical movement gives 0. */
export function swipeDirection({ dx, dy }) {
  const isSwipe = Math.abs(dx) >= MIN_SWIPE_PX && Math.abs(dx) > 2 * Math.abs(dy);
  if (!isSwipe) return 0;
  return dx < 0 ? 1 : -1;
}

/** @returns {-1|0|1} the card step for a key. A modifier gives 0, so browser shortcuts still work. */
export function keyDirection({ key, hasModifier }) {
  if (hasModifier) return 0;
  return { ArrowLeft: -1, ArrowRight: 1 }[key] ?? 0;
}

/** "5" -> "plan-5", "b1" -> "base-1". Anything else gives null. */
function parseWeek(text) {
  const match = /^(b?)([1-9]\d?)$/.exec(text ?? "");
  return match ? `${match[1] ? "base" : "plan"}-${match[2]}` : null;
}

const formatWeek = (weekKey) => weekKey.replace("base-", "b").replace("plan-", "");

/** Only a real ISO date. "2027-02-30" gives null. */
function parseDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text ?? "")) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text) ? text : null;
}

/** @returns {import("./contracts.js").PageLocation} */
export function readLocation(search) {
  const params = new URLSearchParams(search);
  const view = params.get("view");
  return {
    raceId: params.get("race"),
    weekKey: parseWeek(params.get("week")),
    view: VIEWS.includes(view) ? view : "week",
    date: parseDate(params.get("date")),
  };
}

/** @param {import("./contracts.js").PageLocation} location  @returns {string} "?race=brighton&week=5" */
export function writeLocation({ raceId, weekKey, view, date }) {
  const params = new URLSearchParams({ race: raceId });
  if (weekKey) params.set("week", formatWeek(weekKey));
  if (view !== "week") params.set("view", view);
  if (date) params.set("date", date);
  return `?${params}`;
}

/** Order: URL, stored race, first race. A race that does not exist is ignored. */
export function chooseRaceId({ raceIds, urlRaceId, storedRaceId }) {
  return [urlRaceId, storedRaceId].find((id) => raceIds.includes(id)) ?? raceIds[0];
}

/** @returns {import("./contracts.js").Units} a stored value that does not exist is ignored */
export const chooseUnits = (stored) => (UNITS.includes(stored) ? stored : UNITS[0]);
