// Pure: ScheduleWeek[] -> HTML string for the week strip.
import { weekTiming } from "../schedule.js";
import { escapeHtml, weekShort, weekTitle } from "./format.js";

function spokenLabel(week, isThisWeek) {
  return [
    weekTitle(week),
    week.content.phase.name,
    week.content.type === "deload" ? "deload" : "",
    isThisWeek ? "this week" : "",
  ].filter(Boolean).join(", ");
}

function renderButton({ week, index, isSelected, isThisWeek }) {
  const classes = [
    `strip-week phase-${week.content.phase.id}`,
    week.content.type === "deload" ? "is-deload" : "",
    isThisWeek ? "is-this-week" : "",
    week.key === "plan-1" ? "is-plan-start" : "",
  ].filter(Boolean).join(" ");
  return `<button type="button" class="${classes}" data-index="${index}"
    aria-label="${escapeHtml(spokenLabel(week, isThisWeek))}"${isSelected ? ' aria-current="true"' : ""}>${weekShort(week)}</button>`;
}

/** @param {{ schedule: import("../contracts.js").ScheduleWeek[], selectedIndex: number, today: string }} input */
export function renderStrip({ schedule, selectedIndex, today }) {
  return schedule.map((week, index) => renderButton({
    week,
    index,
    isSelected: index === selectedIndex,
    isThisWeek: weekTiming({ week, today }) === "current",
  })).join("");
}
