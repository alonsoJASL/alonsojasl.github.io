// Pure: races, schedules and phases.json -> HTML for the welcome page.
import { escapeHtml, formatDayMonth, formatLongDate } from "./format.js";
import { formatWeeks } from "./gym.js";

/** @typedef {import("../contracts.js").Race} Race */
/** @typedef {import("../contracts.js").ScheduleWeek} ScheduleWeek */

const row = (name, isoDate) => `<div><dt>${name}</dt><dd>${formatLongDate(isoDate)}</dd></div>`;

/** @param {{ race: Race, schedule: ScheduleWeek[] }} input */
function renderStart({ race, schedule }) {
  const weekOne = schedule.find((week) => week.key === "plan-1");
  return `<article class="start" data-race="${escapeHtml(race.id)}">
    <h3>${escapeHtml(race.name)}</h3>
    <dl>${row("Base build starts", schedule[0].monday)}${row("Week 1 starts", weekOne.monday)}${row("Race", race.raceDate)}</dl>
  </article>`;
}

/** One card for each race. @param {{ races: Race[], schedules: Map<string, ScheduleWeek[]> }} input */
export const renderStarts = ({ races, schedules }) =>
  races.map((race) => renderStart({ race, schedule: schedules.get(race.id) })).join("");

/** "Base weeks 1–4", "Weeks 5–8" or "Week 16" @param {ScheduleWeek[]} weeks */
function weeksText(weeks) {
  const plural = weeks.length > 1 ? "s" : "";
  const name = weeks[0].kind === "base" ? "Base week" : "Week";
  return `${name}${plural} ${formatWeeks(weeks.map(({ number }) => number))}`;
}

/** @param {{ phases: import("../contracts.js").Phase[], schedule: ScheduleWeek[] }} input */
export function renderPhases({ phases, schedule }) {
  return phases.map(({ id, name, focus }) => {
    const weeks = schedule.filter((week) => week.content.phase.id === id);
    return `<li class="entry phase-${escapeHtml(id)}"><b class="tag">${escapeHtml(name)}</b>
      <span>${weeksText(weeks)}, ${formatDayMonth(weeks[0].monday)} – ${formatDayMonth(weeks.at(-1).sunday)}</span>
      <p>${escapeHtml(focus)}</p></li>`;
  }).join("");
}
