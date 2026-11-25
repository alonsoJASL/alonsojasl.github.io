// Pure: ScheduleWeek[] -> HTML figure with an inline SVG of the long runs, base weeks too.
// Widths are percentages and heights are pixels, so the text size stays the same on all screens.
import { distanceInMiles, findLongRun, milesToKm, weekTiming } from "../schedule.js";
import { escapeHtml, formatDayMonth, formatDistance, formatMain, splitDistance, weekShort, weekTitle } from "./format.js";

const TOP = 20;
const PLOT_HEIGHT = 200;
const BASELINE = TOP + PLOT_HEIGHT;
const HEIGHT = BASELINE + 34;
const BAR_SHARE = 0.72; // of the column width
const CORNER = 4;

/** The chart has one axis: miles only when the reader wants miles only. */
const AXES = {
  km: { name: "km", step: 10, round: 5, valueOf: milesToKm },
  mi: { name: "miles", step: 5, round: 5, valueOf: (miles) => miles },
};

export const barHeight = ({ value, max, plotHeight }) => (value / max) * plotHeight;

const percent = (value) => `${Number((value * 100).toFixed(3))}%`;
const heightOf = (value, max) => barHeight({ value, max, plotHeight: PLOT_HEIGHT });

/** A small screen has no space for all the week labels: it shows the first week, each fourth week and this week. */
const isMainLabel = (week) => (week.kind === "base" ? week.number === 1 : week.number === 1 || week.number % 4 === 0);

/** One entry for each week, in the order of the schedule. */
function collectBars({ schedule, today, units, axis }) {
  return schedule.map((week) => {
    const longRun = findLongRun(week);
    const miles = distanceInMiles(longRun.distance);
    const isThisWeek = weekTiming({ week, today }) === "current";
    return {
      value: axis.valueOf(miles),
      label: formatMain({ miles, units }),
      title: weekTitle(week),
      shortTitle: weekShort(week),
      hasMainLabel: isThisWeek || isMainLabel(week),
      isRace: longRun.kind === "race",
      phase: week.content.phase,
      isDeload: week.content.type === "deload",
      isThisWeek,
      readout: `${weekTitle(week)}, ${formatDayMonth(longRun.date)}: ${formatDistance({ miles, units })}`,
    };
  });
}

const findLongest = (bars) =>
  bars.filter((bar) => !bar.isRace).reduce((best, bar) => (bar.value > best.value ? bar : best));

function renderGrid({ max, step }) {
  const lines = [];
  for (let value = 0; value <= max; value += step) {
    const y = BASELINE - heightOf(value, max);
    lines.push(`<line class="${value === 0 ? "chart-base" : "chart-grid"}" x1="0" x2="100%" y1="${y}" y2="${y}"/>
      <text class="chart-axis" x="-6" y="${y + 4}" text-anchor="end">${value}</text>`);
  }
  return lines.join("");
}

function renderColumn({ bar, position, count, max, isLongest }) {
  const left = position / count;
  const center = percent(left + 0.5 / count);
  const height = heightOf(bar.value, max);
  const label = bar.isRace || isLongest
    ? `<text class="chart-value" x="${center}" y="${BASELINE - height - 6}" text-anchor="middle">${splitDistance(bar.label).number}</text>`
    : "";
  const dot = bar.isThisWeek ? `<circle class="chart-dot" cx="${center}" cy="${BASELINE + 27}" r="3.5"/>` : "";
  // The bar goes below the baseline and the inner SVG clips it, so only the top corners are round.
  return `<g class="chart-column" data-index="${position}" data-readout="${escapeHtml(bar.readout)}">
    <rect class="chart-hit" x="${percent(left)}" y="0" width="${percent(1 / count)}" height="${HEIGHT}"/>
    <svg x="0" y="0" width="100%" height="${BASELINE}">
      <rect class="chart-bar phase-${bar.phase.id}${bar.isDeload ? " is-deload" : ""}" x="${percent(left + (1 - BAR_SHARE) / 2 / count)}" y="${BASELINE - height}"
        width="${percent(BAR_SHARE / count)}" height="${height + CORNER}" rx="${CORNER}"/>
    </svg>
    ${label}
    <text class="chart-week${bar.isThisWeek ? " is-this-week" : ""}${bar.hasMainLabel ? "" : " is-minor"}" x="${center}" y="${BASELINE + 17}" text-anchor="middle">${bar.shortTitle}</text>
    ${dot}</g>`;
}

/** One legend entry for each phase of the bars, in their order. */
function renderPhaseKeys(bars) {
  const phases = new Map(bars.map(({ phase }) => [phase.id, phase.name]));
  return [...phases].map(([id, name]) => `<span><i class="chart-key phase-${id}"></i>${escapeHtml(name)}</span>`).join("");
}

/** @param {{ schedule: import("../contracts.js").ScheduleWeek[], today: string,
 *           units: import("../contracts.js").Units, valuesPlace: string }} input
 *   valuesPlace: where a screen reader finds the values, for example "The table below has all the values." */
export function renderChart({ schedule, today, units, valuesPlace }) {
  const axis = AXES[units === "mi" ? "mi" : "km"];
  const bars = collectBars({ schedule, today, units, axis });
  const longest = findLongest(bars);
  const max = Math.ceil(Math.max(...bars.map((bar) => bar.value)) / axis.round) * axis.round;
  const summary = `Longest run: ${longest.label}, ${longest.title.toLowerCase()}`;
  const columns = bars.map((bar, position) => renderColumn({
    bar, position, count: bars.length, max, isLongest: bar === longest,
  })).join("");

  return `<figure class="chart">
    <p id="chart-readout" class="chart-readout" data-summary="${summary}">${summary}</p>
    <div class="chart-frame">
      <svg class="chart-svg" height="${HEIGHT}" role="img"
        aria-label="Bar chart of the long runs in ${axis.name}, from ${bars[0].title.toLowerCase()} to ${bars.at(-1).title.toLowerCase()}. ${summary}. ${escapeHtml(valuesPlace)}">
        ${renderGrid({ max, step: axis.step })}${columns}
      </svg>
    </div>
    <figcaption>
      ${renderPhaseKeys(bars)}
      <span><i class="chart-key is-deload"></i>Deload week</span>
    </figcaption>
  </figure>`;
}
