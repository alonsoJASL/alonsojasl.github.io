// Pure pace calculations. No files, no DOM.
import { distanceInMiles, kmToMiles, milesToKm, parseDistance } from "./schedule.js";

const SECONDS_PER_HOUR = 3600;

/** 3728 -> "1:02:08", 1864 -> "31:04" */
export function formatTime(seconds) {
  const total = Math.round(seconds);
  const pad = (value) => String(value).padStart(2, "0");
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours ? `${hours}:${pad(minutes)}` : minutes}:${pad(total % 60)}`;
}

const secondsFor = ({ miles, mph }) => (miles / mph) * SECONDS_PER_HOUR;

/** @param {import("./contracts.js").PacePlan} pace  @returns {import("./contracts.js").PaceRow[]} slowest first */
export function paceRows({ fromMph, toMph, stepMph, distances }) {
  const miles = distances.map(({ distance }) => distanceInMiles(parseDistance(distance)));
  const count = Math.round((toMph - fromMph) / stepMph) + 1;
  return Array.from({ length: count }, (_, index) => {
    const mph = Number((fromMph + index * stepMph).toFixed(2)); // 3.2, not 3.2000000000000002
    return {
      mph,
      kmh: milesToKm(mph),
      secondsPerMile: secondsFor({ miles: 1, mph }),
      secondsPerKm: secondsFor({ miles: kmToMiles(1), mph }),
      seconds: miles.map((value) => secondsFor({ miles: value, mph })),
    };
  });
}

/** @param {import("./contracts.js").PacePlan} pace  @returns {number} the row that the slider shows first */
export function startIndex(pace) {
  const index = paceRows(pace).findIndex((row) => row.mph === pace.startMph);
  if (index === -1) throw new Error(`pace.json: startMph ${pace.startMph} is not a row of the table.`);
  return index;
}
