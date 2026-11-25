import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { renderCard } from "./render/card.js";
import { renderChart } from "./render/chart.js";
import { splitDistance } from "./render/format.js";
import { renderStrip } from "./render/strip.js";
import { buildSchedule } from "./schedule.js";

const site = new URL("../", import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(`data/${name}.json`, site)));
const races = load("races");
const phases = load("phases");
const scheduleOf = (race) => buildSchedule({
  race, phases, weeks: load("weeks"), weekTemplate: load("week_template"), distances: load("distances"),
  baseBuild: load("base_build"), track: load("track"), gym: load("gym"),
});
const schedule = scheduleOf(races[0]);
const cardOf = (key, units = "both") => renderCard({
  week: schedule.find((week) => week.key === key), raceName: "Brighton", isFirst: false, today: "2026-11-25", units, root: "../",
});
const styles = readFileSync(new URL("css/styles.css", site), "utf8");

test("splitDistance", () => {
  assert.deepEqual(splitDistance("42.2 km"), { number: "42.2", unit: "km" });
  assert.deepEqual(splitDistance("6 mi"), { number: "6", unit: "mi" });
});

test("bib: the colour of the phase, and the mark of a deload week", () => {
  assert.match(cardOf("plan-11"), /class="card"[\s\S]*class="bib phase-peak"/);
  assert.match(cardOf("base-1"), /class="bib phase-base"/);
  assert.match(cardOf("plan-16"), /class="bib phase-race"/);
  assert.match(cardOf("plan-4"), /class="card is-deload"[\s\S]*class="bib phase-build"/);
});

test("bib: the race is next to the phase", () => {
  assert.match(cardOf("base-1"), /<span>Base build \(Brighton\)<\/span>/);
  assert.match(cardOf("plan-16"), /<span>Race week \(Brighton\)<\/span>/);
});

test("bib: the focus of the phase, or the quote of the week", () => {
  const focusOf = (key) => /<p class="focus">([^<]*)</.exec(cardOf(key))[1];
  assert.equal(focusOf("plan-9"), phases.find(({ id }) => id === "peak").focus);
  assert.equal(focusOf("plan-15"), "“Trust the taper.”");
  assert.equal(cardOf("plan-15").split("Trust the taper").length - 1, 1);
});

test("bib: the focus is before the number", () => {
  assert.match(cardOf("plan-9"), /class="bib-band"[\s\S]*class="focus"[\s\S]*class="headline"/);
});

test("cards: no time trial, no lunge matrix, no gym label, and a link to Mobility", () => {
  for (const { key } of schedule) {
    assert.doesNotMatch(cardOf(key), /time trial|[Ll]unge|\bGym\b/, key); // "gym" is also a place: only the label is wrong
    assert.match(cardOf(key), /href="\.\.\/mobility\/"/);
  }
  assert.match(cardOf("plan-1"), /href="\.\.\/strength\/#session-a"><b>Strength A</);
});

test("colours: each race has a token for each phase, and black text is 4.5:1 or more on it", () => {
  const channel = (value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const contrastWithBlack = (hex) => {
    const [r, g, b] = [1, 3, 5].map((at) => channel(parseInt(hex.slice(at, at + 2), 16) / 255));
    return (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05) / 0.05;
  };
  for (const { id } of races) {
    const block = new RegExp(`\\[data-race="${id}"\\] \\{([^}]*)\\}`).exec(styles)[1];
    for (const token of ["long", ...phases.filter((phase) => phase.id !== "race").map((phase) => `phase-${phase.id}`)]) {
      const [, hex] = new RegExp(`--${token}: (#[0-9a-f]{6});`).exec(block);
      assert.ok(contrastWithBlack(hex) >= 4.5, `${id} ${token}`);
    }
  }
  for (const { id } of phases) assert.match(styles, new RegExp(`\\.phase-${id} \\{ --phase:`));
});

test("bib: the week title is first, and the number follows the units", () => {
  assert.match(cardOf("plan-11"), /<header[^>]*>\s*<h2>Week 11<\/h2>/);
  assert.match(cardOf("plan-11"), /<strong>35<small> km<\/small><\/strong>\s*<span>21.7 mi, Sunday long run</);
  assert.match(cardOf("plan-11", "mi"), /<strong>21.7<small> mi<\/small><\/strong>\s*<span>Sunday long run</);
});

test("days have their session kind, and the draft badge its class", () => {
  const kinds = [...cardOf("plan-11").matchAll(/class="day kind-(\w+)/g)].map((match) => match[1]);
  assert.deepEqual(kinds, ["rest", "easy", "steady", "track", "gym", "optional", "long"]);
  assert.match(cardOf("plan-11"), /badge badge-draft">Draft/);
});

test("chart legend: each phase of the bars, then deload", () => {
  const chart = renderChart({ schedule, today: "2026-11-25", units: "both", valuesPlace: "" });
  const keys = [...chart.matchAll(/class="chart-key ([\w-]+)"><\/i>([^<]+)</g)].map((match) => match.slice(1).join(" "));
  assert.deepEqual(keys, [
    "phase-base Base build", "phase-build Build", "phase-endurance Endurance", "phase-peak Peak", "phase-taper Taper", "phase-race Race week",
    "is-deload Deload week",
  ]);
  assert.equal(chart.split("chart-bar phase-race").length - 1, 1);
});

test("strip: each week has the colour of its phase, and its name for a screen reader", () => {
  const strip = renderStrip({ schedule, selectedIndex: 0, today: "2026-11-25" });
  assert.match(strip, /class="strip-week phase-base"[^>]*\s+aria-label="Base week 1, Base build"/);
  assert.match(strip, /class="strip-week phase-build is-deload"[^>]*\s+aria-label="Week 4, Build, deload"/);
  assert.match(strip, /class="strip-week phase-race"[^>]*\s+aria-label="Week 16, Race week"/);
});

test("each page has the icon, and the files of the styles exist", () => {
  for (const { path } of load("pages")) {
    const file = new URL(`${path}index.html`, site);
    const [, href] = /rel="icon" href="([^"]+)"/.exec(readFileSync(file, "utf8"));
    assert.ok(existsSync(new URL(href, file)), path);
  }
  const urls = [...styles.matchAll(/url\("([^"]+)"\)/g)].map((match) => match[1]);
  assert.equal(urls.length, 3);
  for (const url of urls) assert.ok(existsSync(new URL(url, new URL("css/", site))), url);
});
