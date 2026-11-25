import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatTime, paceRows, startIndex } from "./pace.js";
import { headlineTimes, renderPaceRow, renderPaceTable, spokenRow } from "./render/pace.js";

const pace = JSON.parse(readFileSync(new URL("../data/pace.json", import.meta.url)));
const rows = paceRows(pace);
const inSeconds = (text) => text.split(":").reduce((total, part) => total * 60 + Number(part), 0);

// From the supplied chart: mph, km/h, per mile, per km, 3 mi, 5 km, 8 km, 10 km, half, marathon.
const CHART = [
  ["4.0", "6.4", "0:15:00", "0:09:19", "0:45:00", "0:46:36", "1:14:34", "1:33:12", "3:16:40", "6:33:20"],
  ["6.0", "9.7", "0:10:00", "0:06:13", "0:30:00", "0:31:04", "0:49:43", "1:02:08", "2:11:07", "4:22:13"],
  ["8.0", "12.9", "0:07:30", "0:04:40", "0:22:30", "0:23:18", "0:37:17", "0:46:36", "1:38:20", "3:16:40"],
  ["10.0", "16.1", "0:06:00", "0:03:44", "0:18:00", "0:18:38", "0:29:50", "0:37:17", "1:18:40", "2:37:20"],
  ["12.0", "19.3", "0:05:00", "0:03:06", "0:15:00", "0:15:32", "0:24:51", "0:31:04", "1:05:33", "2:11:07"],
];
const TOLERANCE_SECONDS = 2;
const MARATHON_TOLERANCE_SECONDS = 4; // the chart uses a marathon that is about 5 m too long

test("pace: 46 rows, 3.0 to 12.0 mph", () => {
  assert.equal(rows.length, 46);
  assert.deepEqual([rows[0].mph, rows[1].mph, rows.at(-1).mph], [3, 3.2, 12]);
});

test("pace: agrees with the supplied chart", () => {
  for (const [mph, kmh, ...times] of CHART) {
    const row = rows.find((candidate) => candidate.mph === Number(mph));
    assert.equal(row.kmh.toFixed(1), kmh);
    [row.secondsPerMile, row.secondsPerKm, ...row.seconds].forEach((seconds, index, all) => {
      const limit = index === all.length - 1 ? MARATHON_TOLERANCE_SECONDS : TOLERANCE_SECONDS;
      assert.ok(Math.abs(seconds - inSeconds(times[index])) <= limit, `${mph} mph, ${times[index]}, got ${formatTime(seconds)}`);
    });
  }
});

test("formatTime", () => {
  assert.equal(formatTime(300), "5:00");
  assert.equal(formatTime(1864), "31:04");
  assert.equal(formatTime(3728), "1:02:08");
  assert.equal(formatTime(59.5), "1:00");
  assert.equal(formatTime(3599.6), "1:00:00");
});

test("pace table: ten columns, and whole speeds are marked", () => {
  const html = renderPaceTable({ pace, index: startIndex(pace) });
  assert.equal(html.split('scope="col"').length - 1, 10);
  assert.equal(html.split("is-whole").length - 1, 10);
  assert.match(html, /<th scope="row">3\.2<\/th><td>5\.1<\/td><td>18:45<\/td>/);
});

test("slider: starts at the row of startMph, and a wrong startMph gives a clear error", () => {
  assert.equal(rows[startIndex(pace)].mph, 6);
  assert.throws(() => startIndex({ ...pace, startMph: 6.1 }), /startMph 6.1 is not a row/);
});

test("slider: each of the 46 positions shows the values of its table row", () => {
  const tableRows = renderPaceTable({ pace, index: 0 }).split("<tr").slice(2);
  assert.equal(tableRows.length, 46);
  tableRows.forEach((tableRow, index) => {
    const cells = [...tableRow.matchAll(/<t[hd][^>]*>([^<]+)</g)].map((match) => match[1]);
    const shown = renderPaceRow({ pace, index, isExample: false });
    const [mph, kmh, perMile, perKm, ...times] = cells;
    for (const value of [mph, kmh, perMile, perKm, ...times.slice(0, -1)]) assert.ok(shown.includes(`<dd>${value}</dd>`), `${value}, row ${index}`);
    assert.ok(shown.includes(`<strong>${times.at(-1)}</strong>`));
    assert.equal(headlineTimes(pace)[index], times.at(-1));
    assert.ok(spokenRow({ pace, index }).startsWith(`${times.at(-1)}, ${perKm} per km`));
  });
});

test("slider: the example badge, and one marked row in the table", () => {
  assert.match(renderPaceRow({ pace, index: 5, isExample: true }), /Example/);
  assert.doesNotMatch(renderPaceRow({ pace, index: 5, isExample: false }), /Example/);
  const html = renderPaceTable({ pace, index: 5 });
  assert.equal(html.split("is-current").length - 1, 1);
  assert.match(html, /is-current[^>]*><th scope="row">4.0</);
  assert.doesNotMatch(renderPaceTable({ pace, index: null }), /is-current/);
});
