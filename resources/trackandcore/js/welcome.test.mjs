import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatLongDate } from "./render/format.js";
import { renderPhases, renderStarts } from "./render/welcome.js";
import { buildSchedule } from "./schedule.js";

const site = new URL("../", import.meta.url);
const readText = (path) => readFileSync(new URL(path, site), "utf8");
const load = (name) => JSON.parse(readText(`data/${name}.json`));
const races = load("races");
const phases = load("phases");
const weekTemplate = load("week_template");
const schedules = new Map(races.map((race) => [race.id, buildSchedule({
  race, phases, weeks: load("weeks"), weekTemplate, distances: load("distances"),
  baseBuild: load("base_build"), track: load("track"), gym: load("gym"),
})]));
const phasesOf = (id) => renderPhases({ phases, schedule: schedules.get(id) });
const page = readText("index.html");

test("formatLongDate", () => {
  assert.equal(formatLongDate("2026-11-30"), "Mon 30 Nov 2026");
  assert.equal(formatLongDate("2027-04-04"), "Sun 4 Apr 2027");
});

test("welcome: base build, week 1 and race of both plans", () => {
  const html = renderStarts({ races, schedules });
  const dates = [...html.matchAll(/<dd>([^<]+)</g)].map((match) => match[1]);
  assert.deepEqual(dates, [
    "Mon 30 Nov 2026", "Mon 14 Dec 2026", "Sun 4 Apr 2027",
    "Mon 7 Dec 2026", "Mon 4 Jan 2027", "Sat 24 Apr 2027",
  ]);
  for (const { id } of races) assert.match(html, new RegExp(`class="start" data-race="${id}"`));
});

test("welcome: each phase has its weeks, its dates and the focus of phases.json", () => {
  const weeksOf = (id) => [...phasesOf(id).matchAll(/<span>([^<]+)</g)].map((match) => match[1]);
  assert.deepEqual(weeksOf("brighton").slice(0, 2), ["Base weeks 1–2, 30 Nov – 13 Dec", "Weeks 1–4, 14 Dec – 10 Jan"]);
  assert.deepEqual(weeksOf("london"), [
    "Base weeks 1–4, 7 Dec – 3 Jan", "Weeks 1–4, 4 Jan – 31 Jan", "Weeks 5–8, 1 Feb – 28 Feb",
    "Weeks 9–12, 1 Mar – 28 Mar", "Weeks 13–15, 29 Mar – 18 Apr", "Week 16, 19 Apr – 25 Apr",
  ]);
  for (const { id, focus } of phases) assert.ok(phasesOf("london").includes(`phase-${id}`) && phasesOf("london").includes(focus));
});

test("welcome: the efforts agree with the plan", () => {
  for (const kind of ["easy", "steady", "long"]) {
    const [effort] = /effort [\d–]+\/10/.exec(weekTemplate.find((day) => day.kind === kind).text);
    assert.match(page, new RegExp(`kind-${kind}"><b class="tag">[^<]+</b> <span>${effort}</span>`));
  }
});

test("welcome: a link to each other page", () => {
  for (const { path, title } of load("pages").filter(({ path }) => path !== "./")) {
    assert.ok(page.includes(`<dt><a href="${path}">${title}</a></dt>`), path);
  }
});
