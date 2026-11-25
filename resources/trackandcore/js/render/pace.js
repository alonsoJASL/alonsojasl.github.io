// Pure: pace.json -> HTML for the pace page. `index` is a row of the table.
import { formatTime, paceRows } from "../pace.js";
import { escapeHtml } from "./format.js";

/** @typedef {import("../contracts.js").PacePlan} PacePlan */

/** The time of the last distance, one for each row. @param {PacePlan} pace */
export const headlineTimes = (pace) => paceRows(pace).map(({ seconds }) => formatTime(seconds.at(-1)));

/** What a screen reader says for a position of the slider. @param {{ pace: PacePlan, index: number }} input */
export function spokenRow({ pace, index }) {
  const { mph, secondsPerKm, secondsPerMile, seconds } = paceRows(pace)[index];
  return `${formatTime(seconds.at(-1))}, ${formatTime(secondsPerKm)} per km, ${formatTime(secondsPerMile)} per mile, ${mph.toFixed(1)} mph`;
}

const pair = (name, value) => `<div><dt>${escapeHtml(name)}</dt><dd>${value}</dd></div>`;

/** One row, in large type. @param {{ pace: PacePlan, index: number, isExample: boolean }} input */
export function renderPaceRow({ pace, index, isExample }) {
  const { mph, kmh, secondsPerMile, secondsPerKm, seconds } = paceRows(pace)[index];
  const distances = pace.distances.slice(0, -1)
    .map(({ label }, position) => pair(label, formatTime(seconds[position]))).join("");
  return `<p class="pace-headline"><strong>${formatTime(seconds.at(-1))}</strong>${isExample ? ' <span class="badge">Example</span>' : ""}</p>
    <dl class="pace-values is-large">
      ${pair("Per km", formatTime(secondsPerKm))}${pair("Per mile", formatTime(secondsPerMile))}
      ${pair("km/h", kmh.toFixed(1))}${pair("mph", mph.toFixed(1))}
    </dl>
    <dl class="pace-values">${distances}</dl>`;
}

function renderTableRow({ row, isCurrent }) {
  const { mph, kmh, secondsPerMile, secondsPerKm, seconds } = row;
  const classes = [Number.isInteger(mph) ? "is-whole" : "", isCurrent ? "is-current" : ""].filter(Boolean).join(" ");
  const times = [secondsPerMile, secondsPerKm, ...seconds].map((value) => `<td>${formatTime(value)}</td>`).join("");
  return `<tr${classes ? ` class="${classes}"` : ""}${isCurrent ? ' aria-current="true"' : ""}><th scope="row">${mph.toFixed(1)}</th><td>${kmh.toFixed(1)}</td>${times}</tr>`;
}

/** @param {{ pace: PacePlan, index: number|null }} input  the marked row, or null for none */
export function renderPaceTable({ pace, index }) {
  const headings = ["mph", "km/h", "Per mile", "Per km", ...pace.distances.map(({ label }) => label)];
  const rows = paceRows(pace).map((row, position) => renderTableRow({ row, isCurrent: position === index })).join("");
  return `<div class="table-scroll" role="region" aria-label="Pace table" tabindex="0"><table class="pace">
    <thead><tr>${headings.map((heading) => `<th scope="col">${escapeHtml(heading)}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}
