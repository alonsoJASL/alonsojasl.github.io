// Pure text formatting for the render modules.
import { milesToKm } from "../schedule.js";

const WEEKDAYS = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
  Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};

const oneDecimal = (value) => String(Number(value.toFixed(1)));

export const formatKm = (miles) => `${oneDecimal(milesToKm(miles))} km`;
export const formatMi = (miles) => `${oneDecimal(miles)} mi`;

/** The large value: km, unless the reader wants miles only. */
export const formatMain = ({ miles, units }) => (units === "mi" ? formatMi(miles) : formatKm(miles));

/** The small value. Empty when the reader wants one unit. */
export const formatOther = ({ miles, units }) => (units === "both" ? formatMi(miles) : "");

/** "42.2 km" -> { number: "42.2", unit: "km" } */
export function splitDistance(text) {
  const [number, unit] = text.split(" ");
  return { number, unit };
}

export const formatDistance =({ miles, units }) =>
  [formatMain({ miles, units }), formatOther({ miles, units })].filter(Boolean).join(" / ");

export function formatDate(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
}

/** "Mon 30 Nov 2026" */
export const formatLongDate = (isoDate) => `${formatDate(isoDate).replace(",", "")} ${isoDate.slice(0, 4)}`;

export function formatDayMonth(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", timeZone: "UTC",
  });
}

export const weekdayName = (label) => WEEKDAYS[label];

export function escapeHtml(text) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return text.replace(/[&<>"']/g, (character) => entities[character]);
}

/** "A" -> "session-a", the place of a session on the gym page */
export const sessionId = (session) => `session-${session.toLowerCase()}`;

/** @param {{ name: string, days: number }} input  days until the race */
export function countdownText({ name, days }) {
  if (days < 0) return `${name} is done. Well done!`;
  if (days === 0) return `${name} is today. Enjoy it!`;
  return `${days} ${days === 1 ? "day" : "days"} to ${name}`;
}

export const weekTitle = (week) =>
  week.kind === "base" ? `Base week ${week.number}` : `Week ${week.number}`;

/** "B1" or "1" */
export const weekShort = (week) => (week.kind === "base" ? `B${week.number}` : String(week.number));
