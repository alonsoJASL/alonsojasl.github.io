// Pure schedule logic. No files, no clock, no DOM.
// Dates are ISO strings and use UTC arithmetic, so clock changes have no effect.

/** @typedef {import("./contracts.js").ScheduleWeek} ScheduleWeek */

const MS_PER_DAY = 86_400_000;
const KM_PER_MILE = 1.609344;
const COUNTED_KINDS = ["easy", "steady", "track", "long", "shakeout", "race"];
const LONG_RUN_KINDS = ["long", "race"];
const WEEK_TYPES = ["build", "deload", "taper", "race"];

export function addDays(isoDate, days) {
  const time = Date.parse(`${isoDate}T00:00:00Z`) + days * MS_PER_DAY;
  return new Date(time).toISOString().slice(0, 10);
}

export function mondayOf(isoDate) {
  const weekday = new Date(`${isoDate}T00:00:00Z`).getUTCDay(); // Sunday is 0
  return addDays(isoDate, -((weekday + 6) % 7));
}

/** Whole days from one ISO date to another. Negative when `to` is first. */
export const daysUntil = ({ from, to }) =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY;

export const milesToKm = (miles) => miles * KM_PER_MILE;
export const kmToMiles = (km) => km / KM_PER_MILE;

/** "30 km" or "6.5 mi" -> Distance. @returns {import("./contracts.js").Distance} */
export function parseDistance(text) {
  const match = /^\s*(\d+(?:\.\d+)?)\s*(km|mi)\s*$/.exec(String(text));
  if (!match || Number(match[1]) === 0) {
    throw new Error(`Cannot read the distance "${text}". Write it like "30 km" or "6.5 mi".`);
  }
  return { value: Number(match[1]), unit: match[2] };
}

/** @param {import("./contracts.js").Distance} distance */
export function distanceInMiles(distance) {
  if (distance.unit === "mi") return distance.value;
  if (distance.unit === "km") return kmToMiles(distance.value);
  throw new Error(`Unknown distance unit: ${distance.unit}`);
}

/** `id` is an id of phases.json. The quote of the week, if any, replaces the focus of the phase. */
function resolvePhase({ phases, id, quote, title }) {
  const phase = phases.find((candidate) => candidate.id === id);
  if (!phase) throw new Error(`${title}: phases.json has no phase "${id}".`);
  return { phase: { id: phase.id, name: phase.name }, focus: quote ?? phase.focus };
}

function findTrackText({ track, date }) {
  const entry = track.find(({ from, to }) => from <= date && date <= to);
  if (!entry) throw new Error(`track.json has no entry for ${date}.`);
  return entry.text;
}

function readDistance({ text, title }) {
  try {
    return parseDistance(text);
  } catch (error) {
    throw new Error(`${title}: ${error.message}`);
  }
}

function resolveGym({ session, load, gym, title }) {
  const details = gym.sessions[session];
  const text = gym.loads[load]?.[session];
  if (!details) throw new Error(`${title}: gym.json has no session "${session}".`);
  if (!text) throw new Error(`${title}: gym.json has no load "${load}" for session ${session}.`);
  return { session, name: details.name, load: text };
}

/** The normal week with the distances, texts and gym load of one line of weeks.json. */
function templateDays({ row, weekTemplate, distances, gym, title }) {
  const labels = weekTemplate.map((day) => day.label);
  const unknown = Object.keys(row.changes).find((label) => !labels.includes(label));
  if (unknown) throw new Error(`${title}: "changes" has the unknown day "${unknown}". Use Mon to Sun.`);
  return weekTemplate.map(({ label, kind, distanceKey, gym: session, text }) => {
    const ownText = row.changes[label] ?? text;
    return {
      label,
      kind,
      text: kind === "long" && row.longNote ? `${ownText} ${row.longNote}` : ownText,
      distance: distanceKey ? readDistance({ text: distances[distanceKey], title: `${title}, ${label}` }) : null,
      gym: session ? resolveGym({ session, load: row.gym, gym, title: `${title}, ${label}` }) : null,
    };
  });
}

/** Days from races.json and base_build.json hold their own distances. */
function rawDays({ days, title }) {
  return days.map(({ label, kind, distance, text }) => ({
    label,
    kind,
    text,
    distance: distance ? readDistance({ text: distance, title: `${title}, ${label}` }) : null,
    gym: null,
  }));
}

/** @returns {import("./contracts.js").Day[]} */
function datedDays({ days, track, monday }) {
  return days.map((day, offset) => {
    const date = addDays(monday, offset);
    const isTrackStandIn = day.kind === "track" && day.text === null;
    return { ...day, date, text: isTrackStandIn ? findTrackText({ track, date }) : day.text };
  });
}

function checkWeekTypes(weeks) {
  const wrong = weeks.find((row) => !WEEK_TYPES.includes(row.type));
  if (wrong) throw new Error(`weeks.json, week ${wrong.week}: unknown type "${wrong.type}". Use ${WEEK_TYPES.join(", ")}.`);
  if (weeks.findIndex((row) => row.type === "race") !== weeks.length - 1) {
    throw new Error('weeks.json: the last week, and only that week, must have the type "race".');
  }
}

function planWeek({ row, race, phases, weekTemplate, distances, gym }) {
  const title = `plan-${row.week}`;
  const shared = { ...resolvePhase({ phases, id: row.phase, quote: row.quote, title }), type: row.type };
  if (row.type === "race") {
    return {
      ...shared,
      status: race.status,
      note: race.raceWeekNote,
      days: rawDays({ days: race.raceWeekDays, title }),
    };
  }
  const line = distances.find((candidate) => candidate.week === row.week);
  if (!line) throw new Error(`distances.json has no line for week ${row.week}.`);
  return {
    ...shared,
    status: line.status,
    note: null,
    days: templateDays({ row, weekTemplate, distances: line, gym, title }),
  };
}

/**
 * @param {import("./contracts.js").PlanData & { race: import("./contracts.js").Race }} input
 * @returns {ScheduleWeek[]} base weeks, then plan weeks
 */
export function buildSchedule({ race, phases, weeks, weekTemplate, distances, baseBuild, track, gym }) {
  checkWeekTypes(weeks);
  const total = race.baseWeeks + weeks.length;
  const firstMonday = addDays(mondayOf(race.raceDate), -7 * (total - 1));

  const baseEntries = Array.from({ length: race.baseWeeks }, (_, index) => ({
    kind: "base",
    number: index + 1,
    content: {
      ...resolvePhase({ phases, id: baseBuild.phase, quote: null, title: `base-${index + 1}` }),
      type: "base",
      status: "confirmed",
      note: null,
      days: rawDays({ days: baseBuild.days, title: `base-${index + 1}` }),
    },
  }));
  const planEntries = weeks.map((row) => ({
    kind: "plan",
    number: row.week,
    content: planWeek({ row, race, phases, weekTemplate, distances, gym }),
  }));

  return [...baseEntries, ...planEntries].map(({ kind, number, content }, position) => {
    const monday = addDays(firstMonday, 7 * position);
    return {
      key: `${kind}-${number}`,
      kind,
      number,
      monday,
      sunday: addDays(monday, 6),
      content: { ...content, days: datedDays({ days: content.days, track, monday }) },
    };
  });
}

/** @returns {"past"|"current"|"future"} */
export function weekTiming({ week, today }) {
  if (today > week.sunday) return "past";
  return today < week.monday ? "future" : "current";
}

/** Before the start: the first card. After the race: the last card. */
export function findCurrentIndex({ schedule, today }) {
  const index = schedule.findIndex((week) => today <= week.sunday);
  return index === -1 ? schedule.length - 1 : index;
}

/** @param {ScheduleWeek} week  @returns the long run or the race */
export function findLongRun(week) {
  return week.content.days.find((day) => LONG_RUN_KINDS.includes(day.kind));
}

/** Includes the track estimates. Excludes optional runs. @param {ScheduleWeek} week */
export function weeklyTotalMiles(week) {
  return week.content.days
    .filter((day) => COUNTED_KINDS.includes(day.kind) && day.distance)
    .reduce((sum, day) => sum + distanceInMiles(day.distance), 0);
}
