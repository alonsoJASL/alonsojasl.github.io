import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { barHeight, renderChart } from "./render/chart.js";
import { countdownText, formatDistance, formatMain, formatOther } from "./render/format.js";
import { buildSchedule } from "./schedule.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url)));
const races = load("races");
const planData = {
  phases: load("phases"), weeks: load("weeks"), weekTemplate: load("week_template"), distances: load("distances"),
  baseBuild: load("base_build"), track: load("track"), gym: load("gym"),
};
const scheduleFor = (id, changes = {}) =>
  buildSchedule({ race: races.find((race) => race.id === id), ...planData, ...changes });
const chartFor = (id, { today = "2026-11-25", units = "both", ...changes } = {}) =>
  renderChart({ schedule: scheduleFor(id, changes), today, units, valuesPlace: "See <the table>." });
const columnsOf = (html) => html.split('<g class="chart-column"').slice(1);
const baseWeeksOf = (id) => races.find((race) => race.id === id).baseWeeks;
const planColumnsOf = (id, options) => columnsOf(chartFor(id, options)).slice(baseWeeksOf(id));
const attribute = (text, name) => new RegExp(` ${name}="([^"]*)"`).exec(text)[1];

test("chart: the base weeks, then 16 columns, deload on 4, 8 and 12", () => {
  for (const { id } of races) {
    const all = columnsOf(chartFor(id));
    const labels = all.map((column) => /class="chart-week[^>]*>(\w+)</.exec(column)[1]);
    const base = Array.from({ length: baseWeeksOf(id) }, (_, index) => `B${index + 1}`);
    assert.deepEqual(labels, [...base, ...Array.from({ length: 16 }, (_, index) => String(index + 1))]);
    const columns = planColumnsOf(id);
    const deloads = columns.flatMap((column, index) => (/chart-bar [a-z-]+ is-deload/.test(column) ? [index + 1] : []));
    assert.deepEqual(deloads, [4, 8, 12]);
  }
});

test("chart: each column opens its own week, for both races", () => {
  for (const { id } of races) {
    const schedule = scheduleFor(id);
    assert.deepEqual(columnsOf(chartFor(id)).map((column) => Number(attribute(column, "data-index"))), schedule.map((_, index) => index));
    planColumnsOf(id).forEach((column, index) => {
      assert.equal(schedule[Number(attribute(column, "data-index"))].key, `plan-${index + 1}`);
    });
  }
});

test("chart: bar heights follow the distance and stay in the plot", () => {
  assert.equal(barHeight({ value: 30, max: 45, plotHeight: 90 }), 60);
  const tops = planColumnsOf("london").map((column) =>
    Number(/class="chart-bar[^>]*? y="([\d.]+)"/s.exec(column)[1]));
  assert.ok(tops.every((top) => top >= 20 && top < 220));
  assert.ok(tops[15] < tops[10] && tops[10] < tops[9] && tops[9] < tops[8]);
  assert.equal(Math.min(...tops), tops[15]);
});

test("chart: only the longest run and the race have a value, and the longest is calculated", () => {
  const values = (html) => [...html.matchAll(/class="chart-value"[^>]*>([^<]*)</g)].map((match) => match[1]);
  assert.deepEqual(values(chartFor("brighton")), ["35", "42.2"]);
  const distances = planData.distances.map((row) => (row.week === 6 ? { ...row, long: "38 km" } : row));
  const changed = chartFor("brighton", { distances });
  assert.deepEqual(values(changed), ["38", "42.2"]);
  assert.match(changed, /Longest run: 38 km, week 6/);
});

test("chart: the dot shows once from the base build to the race, and not before or after", () => {
  const dots = (today) => chartFor("brighton", { today }).split("chart-dot").length - 1;
  assert.equal(dots("2026-11-25"), 0);
  assert.equal(dots("2026-12-05"), 1); // base build
  assert.equal(dots("2027-02-10"), 1);
  assert.equal(dots("2027-04-04"), 1);
  assert.equal(dots("2027-04-05"), 0);
  assert.match(planColumnsOf("brighton", { today: "2027-02-10" })[8], /chart-dot/);
});

test("chart: readout follows the units", () => {
  const readout = (units) => attribute(planColumnsOf("brighton", { units })[8], "data-readout");
  assert.equal(readout("both"), "Week 9, 14 Feb: 30 km / 18.6 mi");
  assert.equal(readout("km"), "Week 9, 14 Feb: 30 km");
  assert.equal(readout("mi"), "Week 9, 14 Feb: 18.6 mi");
});

test("chart: miles have their own axis and the same bar order", () => {
  const axis = (units) => [...chartFor("london", { units }).matchAll(/class="chart-axis"[^>]*>(\d+)</g)].map((match) => Number(match[1]));
  assert.deepEqual(axis("both"), [0, 10, 20, 30, 40]);
  assert.deepEqual(axis("km"), [0, 10, 20, 30, 40]);
  assert.deepEqual(axis("mi"), [0, 5, 10, 15, 20, 25, 30]);
  assert.match(chartFor("london", { units: "mi" }), /Longest run: 21\.7 mi, week 11/);
});

test("chart: a screen reader hears the range, the summary and where the values are", () => {
  const label = attribute(chartFor("london"), "aria-label");
  assert.equal(label, "Bar chart of the long runs in km, from base week 1 to week 16. Longest run: 35 km, week 11. See &lt;the table&gt;.");
});

test("chart: a small screen keeps the first, each fourth and this week's label", () => {
  const kept = columnsOf(chartFor("london", { today: "2027-02-10" }))
    .filter((column) => !column.includes("is-minor")).map((column) => /class="chart-week[^>]*>(\w+)</.exec(column)[1]);
  assert.deepEqual(kept, ["B1", "1", "4", "6", "8", "12", "16"]);
});

test("format: units", () => {
  assert.equal(formatDistance({ miles: 10, units: "both" }), "16.1 km / 10 mi");
  assert.equal(formatDistance({ miles: 10, units: "km" }), "16.1 km");
  assert.equal(formatDistance({ miles: 10, units: "mi" }), "10 mi");
  assert.equal(formatMain({ miles: 10, units: "both" }), "16.1 km");
  assert.equal(formatOther({ miles: 10, units: "mi" }), "");
});

test("countdown: before, the day before, on and after race day", () => {
  const text = (days) => countdownText({ name: "London", days });
  assert.equal(text(150), "150 days to London");
  assert.equal(text(1), "1 day to London");
  assert.match(text(0), /London is today/);
  assert.match(text(-1), /London is done/);
});
