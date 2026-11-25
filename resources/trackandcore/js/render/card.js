// Pure: ScheduleWeek -> HTML string.
import { distanceInMiles, findLongRun, weekTiming, weeklyTotalMiles } from "../schedule.js";
import {
  escapeHtml, formatDate, formatDayMonth, formatDistance, formatMain, formatOther, sessionId,
  splitDistance, weekTitle, weekdayName,
} from "./format.js";

const KIND_TAGS = {
  rest: "Rest", easy: "Easy", steady: "Steady", track: "Speed", gym: "Strength", strength: "Strength",
  optional: "Optional", long: "Long run", shakeout: "Shakeout", race: "Race",
};

const badge = (text, kind = "") => `<span class="badge${kind ? ` badge-${kind}` : ""}">${text}</span>`;

function timingBadge({ week, isFirst, today }) {
  const timing = weekTiming({ week, today });
  if (timing === "current") return badge("This week");
  if (timing === "future" && isFirst) return badge(`Starts ${formatDate(week.monday)}`);
  return "";
}

/** A speed session shows an estimate. */
function renderDistance({ day, units }) {
  if (!day.distance) return "";
  const miles = distanceInMiles(day.distance);
  const other = formatOther({ miles, units });
  return `<strong>${day.kind === "track" ? "≈ " : ""}${formatMain({ miles, units })}</strong>${other ? ` <small>${other}</small>` : ""} `;
}

const renderGym = ({ gym, root }) =>
  `<span class="day-gym"><a href="${root}strength/#${sessionId(gym.session)}"><b>Strength ${escapeHtml(gym.session)}</b></a> ${escapeHtml(gym.name)}: ${escapeHtml(gym.load)}</span>`;

function dayClasses({ day, isCurrentWeek, today }) {
  return [
    `day kind-${day.kind}`,
    day.kind === "long" || day.kind === "race" ? "is-main" : "",
    day.date === today ? "is-today" : "",
    isCurrentWeek && day.date < today ? "is-past" : "",
  ].filter(Boolean).join(" ");
}

function renderDay({ day, isCurrentWeek, today, units, root }) {
  return `<li class="${dayClasses({ day, isCurrentWeek, today })}">
    <span class="day-label">${escapeHtml(day.label)}<small>${formatDayMonth(day.date)}</small></span>
    <span class="day-body">
      <span class="day-tags"><span class="tag">${KIND_TAGS[day.kind]}</span> ${renderDistance({ day, units })}${day.date === today ? badge("Today") : ""}</span>
      ${day.text ? `<span>${escapeHtml(day.text)}</span>` : ""}${day.gym ? renderGym({ gym: day.gym, root }) : ""}</span></li>`;
}

function totalCaption(days) {
  const hasEstimate = days.some((day) => day.kind === "track" && day.distance);
  return hasEstimate
    ? "With the Thursday estimate, without optional runs"
    : "Without speed sessions and optional runs";
}

/**
 * @param {{ week: import("../contracts.js").ScheduleWeek, raceName: string, isFirst: boolean, today: string,
 *           units: import("../contracts.js").Units, root: string }} input
 *   root: the way from the page to the site root
 */
export function renderCard({ week, raceName, isFirst, today, units, root }) {
  const { content } = week;
  const longRun = findLongRun(week);
  const miles = distanceInMiles(longRun.distance);
  const headlineName = longRun.kind === "race" ? "race" : "long run";
  const isDeload = content.type === "deload";
  const isCurrentWeek = weekTiming({ week, today }) === "current";
  const badges = [
    timingBadge({ week, isFirst, today }),
    isDeload ? badge("Deload") : "",
    content.status === "draft" ? badge("Draft", "draft") : "",
  ].join("");
  const headlineText = [formatOther({ miles, units }), `${weekdayName(longRun.label)} ${headlineName}`]
    .filter(Boolean).join(", ");
  const { number, unit } = splitDistance(formatMain({ miles, units }));

  return `<article class="card${isDeload ? " is-deload" : ""}">
    <header class="bib phase-${content.phase.id}">
      <h2>${weekTitle(week)}</h2>
      <p class="bib-band"><span>${escapeHtml(`${content.phase.name} (${raceName})`)}</span> <span>${formatDayMonth(week.monday)} – ${formatDayMonth(week.sunday)}</span></p>
      <p class="focus">${escapeHtml(content.focus)}</p>
      <p class="headline"><strong>${number}<small> ${unit}</small></strong>
        <span>${headlineText}</span></p>
      <p class="badges">${badges}</p>
    </header>
    <ul class="days">${content.days.map((day) => renderDay({ day, isCurrentWeek, today, units, root })).join("")}</ul>
    <dl class="facts">
      <div><dt>Weekly total</dt><dd>${formatDistance({ miles: weeklyTotalMiles(week), units })}<small>${totalCaption(content.days)}</small></dd></div>
      <div><dt>Before and after your runs</dt><dd><a href="${root}mobility/">Mobility</a></dd></div>
    </dl>
    ${content.note ? `<p class="note">${escapeHtml(content.note)}</p>` : ""}
  </article>`;
}
