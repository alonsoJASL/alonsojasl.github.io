import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  addDays, buildSchedule, daysUntil, findCurrentIndex, findLongRun, kmToMiles,
  milesToKm, mondayOf, parseDistance, weekTiming, weeklyTotalMiles,
} from "./schedule.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url)));
const races = load("races");
const phases = load("phases");
const weeks = load("weeks");
const weekTemplate = load("week_template");
const gym = load("gym");
const distances = load("distances");
const baseBuild = load("base_build");
const track = load("track");
const scheduleFor = (id, changes = {}) => buildSchedule({
  race: races.find((race) => race.id === id), phases, weeks, weekTemplate, distances, baseBuild, track, gym, ...changes,
});

const expected = [
  { id: "brighton", count: 18, base: "2026-11-30", baseEnd: "2026-12-13", week1: "2026-12-14", week16: "2027-03-29", race: "2027-04-04" },
  { id: "london", count: 20, base: "2026-12-07", baseEnd: "2027-01-03", week1: "2027-01-04", week16: "2027-04-19", race: "2027-04-24" },
];

for (const item of expected) {
  test(`${item.id}: dates, counts and race day`, () => {
    const schedule = scheduleFor(item.id);
    const week1 = schedule.findIndex((week) => week.key === "plan-1");
    const last = schedule.at(-1);
    assert.equal(schedule.length, item.count);
    assert.equal(schedule[0].monday, item.base);
    assert.equal(schedule[week1 - 1].sunday, item.baseEnd);
    assert.equal(schedule[week1].monday, item.week1);
    assert.equal(last.monday, item.week16);
    const raceDay = findLongRun(last);
    assert.equal(raceDay.kind, "race");
    assert.equal(addDays(last.monday, last.content.days.indexOf(raceDay)), item.race);
  });
}

test("every week has seven days, in order, and one long run or race", () => {
  for (const { id } of expected) {
    for (const week of scheduleFor(id)) {
      assert.deepEqual(week.content.days.map((day) => day.label), ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
      assert.equal(week.content.days.filter((day) => ["long", "race"].includes(day.kind)).length, 1);
    }
  }
});

test("deload weeks are 4, 8 and 12", () => {
  assert.deepEqual(weeks.filter((row) => row.type === "deload").map((row) => row.week), [4, 8, 12]);
});

test("weeks 13 to 15 are 21, 16 and 12 km", () => {
  const distances = scheduleFor("london").slice(-4, -1).map((week) => findLongRun(week).distance);
  assert.deepEqual(distances, [21, 16, 12].map((value) => ({ value, unit: "km" })));
});

test("weeks 9 to 11 are 30, 32 and 35 km", () => {
  const schedule = scheduleFor("brighton");
  const longRuns = [9, 10, 11].map((number) =>
    findLongRun(schedule.find((week) => week.key === `plan-${number}`)).distance);
  assert.deepEqual(longRuns, [30, 32, 35].map((value) => ({ value, unit: "km" })));
});

test("distances.json has one line for each of weeks 1 to 15, and every key is used", () => {
  assert.deepEqual(distances.map((row) => row.week), Array.from({ length: 15 }, (_, index) => index + 1));
  const keys = weekTemplate.map((day) => day.distanceKey).filter(Boolean);
  assert.deepEqual(keys, ["tue", "wed", "track", "long"]);
});

test("parseDistance reads good text and rejects bad text", () => {
  assert.deepEqual(parseDistance("30 km"), { value: 30, unit: "km" });
  assert.deepEqual(parseDistance(" 6.5mi "), { value: 6.5, unit: "mi" });
  for (const bad of ["30", "km", "", "30 k", "-5 km", "0 km", "1,5 km", undefined, null]) {
    assert.throws(() => parseDistance(bad), /Cannot read the distance/, String(bad));
  }
});

test("a data error names the week", () => {
  const broken = distances.map((row) => (row.week === 9 ? { ...row, long: "30 kmm" } : row));
  assert.throws(() => scheduleFor("london", { distances: broken }), /plan-9, Sun: .*30 kmm/);
  assert.throws(() => scheduleFor("london", { distances: distances.slice(1) }), /no line for week 1\./);
});

test("track text follows the calendar, the same for both races", () => {
  for (const { id } of expected) {
    for (const week of scheduleFor(id)) { // race week too
      const { date, text } = week.content.days[3];
      const wanted = date.startsWith("2026-12") ? "Speed session (no track)" : "Speed session (provided by T&C coach)";
      assert.equal(text, wanted, `${id} ${date}`);
    }
  }
});

test("no base week is at the track", () => {
  for (const { id } of expected) {
    for (const week of scheduleFor(id).filter(({ kind }) => kind === "base")) {
      assert.match(week.content.days[3].text, /no track/);
    }
  }
});

test("weekTiming is past, current or future", () => {
  const [week] = scheduleFor("brighton");
  const timings = ["2026-11-29", "2026-11-30", "2026-12-06", "2026-12-07"].map((today) => weekTiming({ week, today }));
  assert.deepEqual(timings, ["future", "current", "current", "past"]);
});

test("phases: each id is used, each week has one, and the quote replaces the focus", () => {
  const schedule = scheduleFor("london");
  assert.deepEqual([...new Set(schedule.map((week) => week.content.phase.id))], phases.map(({ id }) => id));
  const contentOf = (key) => schedule.find((week) => week.key === key).content;
  assert.deepEqual(contentOf("base-1").phase, { id: "base", name: "Base build" });
  assert.equal(contentOf("plan-14").focus, phases.find(({ id }) => id === "taper").focus);
  assert.equal(contentOf("plan-16").focus, "“Trust your training.”");
  for (const { content } of schedule) assert.ok(content.focus);
});

test("current week: before, boundaries, during and after", () => {
  const schedule = scheduleFor("brighton");
  const keyOn = (today) => schedule[findCurrentIndex({ schedule, today })].key;
  assert.equal(keyOn("2026-11-24"), "base-1");
  assert.equal(keyOn("2026-12-13"), "base-2");
  assert.equal(keyOn("2026-12-14"), "plan-1");
  assert.equal(keyOn("2027-01-06"), "plan-4");
  assert.equal(keyOn("2027-06-01"), "plan-16");
});

test("weeks stay continuous across the clock change on 28 March", () => {
  assert.equal(addDays("2027-03-27", 2), "2027-03-29");
  assert.equal(mondayOf("2027-03-28"), "2027-03-22");
  const schedule = scheduleFor("london");
  schedule.slice(1).forEach((week, index) => assert.equal(week.monday, addDays(schedule[index].sunday, 1)));
});

test("unit conversion works both ways", () => {
  assert.equal(milesToKm(26.2).toFixed(1), "42.2");
  assert.equal(kmToMiles(10).toFixed(1), "6.2");
  assert.equal(kmToMiles(milesToKm(13)).toFixed(9), "13.000000000");
});

test("weekly total includes the track estimate and excludes optional runs", () => {
  const totalKm = (key) => milesToKm(weeklyTotalMiles(scheduleFor("brighton").find((week) => week.key === key))).toFixed(1);
  assert.equal(totalKm("plan-1"), "23.7");
  assert.equal(totalKm("plan-16"), "52.2");
  assert.equal(totalKm("base-1"), "15.0");
});

test("each day has its own date, and the race is on race day", () => {
  for (const race of races) {
    for (const week of scheduleFor(race.id)) {
      assert.deepEqual(week.content.days.map((day) => day.date), [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(week.monday, offset)));
    }
    assert.equal(findLongRun(scheduleFor(race.id).at(-1)).date, race.raceDate);
  }
});

test("gym: A on Tuesday and B on Friday, with the load of the week, and none in base and race weeks", () => {
  for (const week of scheduleFor("london")) {
    const sessions = week.content.days.filter((day) => day.gym).map((day) => `${day.label} ${day.gym.session}`);
    assert.deepEqual(sessions, week.kind === "base" || week.number === 16 ? [] : ["Tue A", "Fri B"], week.key);
  }
  const loads = (number) => scheduleFor("london").find((week) => week.key === `plan-${number}`)
    .content.days.filter((day) => day.gym).map((day) => day.gym.load);
  assert.deepEqual(loads(1), ["3 sets, add load slowly", "3 sets, add load slowly"]);
  assert.deepEqual(loads(4), loads(3)); // a deload week has the gym of a normal week
  assert.deepEqual(loads(8), loads(7));
  assert.deepEqual(loads(12), loads(11));
  assert.deepEqual(loads(11), ["3 sets, hold the weight", "3 sets, hold the weight"]);
  assert.deepEqual(loads(14), ["2 sets", "2 sets"]);
  assert.deepEqual(loads(15), ["2 sets, light", "Mobility only"]);
});

const changeWeek = (number, change) => weeks.map((row) => (row.week === number ? { ...row, ...change } : row));

test("changes: a new text for one day, and only that day", () => {
  const changed = scheduleFor("london", { weeks: changeWeek(3, { changes: { Sat: "Rest today." } }) });
  scheduleFor("london").forEach((week, index) => week.content.days.forEach((day, position) => {
    const isChanged = week.key === "plan-3" && day.label === "Sat";
    assert.equal(changed[index].content.days[position].text, isChanged ? "Rest today." : day.text);
  }));
});

test("long-run notes and the race-week note reach the card", () => {
  const schedule = scheduleFor("london");
  assert.match(findLongRun(schedule.find((week) => week.key === "plan-11")).text, /^Long run.*Longest run\./);
  assert.equal(schedule.find((week) => week.key === "plan-1").content.note, null);
  assert.match(schedule.at(-1).content.note, /Sunday 25 April/);
  assert.equal(scheduleFor("brighton").at(-1).content.note, null);
});

test("wrong names in weeks.json give a clear error", () => {
  const fails = (change, message) => assert.throws(() => scheduleFor("london", { weeks: changeWeek(3, change) }), message);
  fails({ type: "deloat" }, /week 3: unknown type "deloat"/);
  fails({ type: "race" }, /the last week, and only that week/);
  fails({ phase: "Build" }, /plan-3: phases.json has no phase "Build"/);
  fails({ gym: "heavy" }, /plan-3, Tue: gym.json has no load "heavy"/);
  fails({ changes: { Saturday: "Rest." } }, /plan-3: "changes" has the unknown day "Saturday"/);
  const template = weekTemplate.map((day) => (day.gym ? { ...day, gym: "C" } : day));
  assert.throws(() => scheduleFor("london", { weekTemplate: template }), /no session "C"/);
});

test("daysUntil counts whole days, also across the clock change", () => {
  assert.equal(daysUntil({ from: "2026-11-25", to: "2027-04-04" }), 130);
  assert.equal(daysUntil({ from: "2027-03-27", to: "2027-03-29" }), 2);
  assert.equal(daysUntil({ from: "2027-04-04", to: "2027-04-04" }), 0);
  assert.equal(daysUntil({ from: "2027-04-05", to: "2027-04-04" }), -1);
});

test("Mondays after the clock change are in the new week", () => {
  const keyOn = (id, today) => {
    const schedule = scheduleFor(id);
    return schedule[findCurrentIndex({ schedule, today })].key;
  };
  assert.equal(keyOn("brighton", "2027-03-29"), "plan-16");
  assert.equal(keyOn("london", "2027-03-29"), "plan-13");
  assert.equal(keyOn("london", "2027-04-05"), "plan-14");
  assert.equal(keyOn("london", "2027-04-19"), "plan-16");
});
