// Pure: ScheduleWeek[] -> HTML with only the long runs: the chart, then a table.
import { distanceInMiles, findLongRun, weekTiming } from "../schedule.js";
import { renderChart } from "./chart.js";
import { formatDayMonth, formatKm, formatMi, weekTitle } from "./format.js";

const COLUMNS = {
  km: { heading: "km", className: "km", format: formatKm },
  mi: { heading: "Miles", className: "mi", format: formatMi },
};

const columnsFor = (units) => (units === "both" ? [COLUMNS.km, COLUMNS.mi] : [COLUMNS[units]]);

function renderRow({ week, index, today, units }) {
  const longRun = findLongRun(week);
  const miles = distanceInMiles(longRun.distance);
  const isThisWeek = weekTiming({ week, today }) === "current";
  const label = [
    longRun.kind === "race" ? "Race" : "",
    week.content.type === "deload" ? "Deload" : "",
    isThisWeek ? "This week" : "",
  ].filter(Boolean).join(", ");
  const cells = columnsFor(units)
    .map(({ className, format }) => `<td class="${className}">${format(miles)}</td>`).join("");
  return `<tr class="${isThisWeek ? "is-this-week" : ""}">
    <th scope="row"><button type="button" class="row-link" data-index="${index}">${weekTitle(week)}</button>${label ? `<small>${label}</small>` : ""}</th>
    <td class="date">${formatDayMonth(longRun.date)}</td>
    ${cells}</tr>`;
}

/** @param {{ schedule: import("../contracts.js").ScheduleWeek[], today: string,
 *           units: import("../contracts.js").Units }} input */
export function renderLongRuns({ schedule, today, units }) {
  const rows = schedule.map((week, index) => renderRow({ week, index, today, units })).join("");
  const headings = columnsFor(units).map(({ heading }) => `<th scope="col">${heading}</th>`).join("");
  return `<h2 class="view-title">Long runs, ${units === "mi" ? "miles" : "km"}</h2>
    ${renderChart({ schedule, today, units, valuesPlace: "The table below has all the values." })}
    <div class="table-scroll"><table class="long-runs"><caption>All long runs</caption>
    <thead><tr><th scope="col">Week</th><th scope="col">Date</th>${headings}</tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}
