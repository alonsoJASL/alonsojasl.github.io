import test from "node:test";
import assert from "node:assert/strict";
import { chooseRaceId, chooseUnits, keyDirection, readLocation, swipeDirection, writeLocation } from "./navigation.js";

test("swipe: left is next, right is previous, short or vertical is nothing", () => {
  assert.equal(swipeDirection({ dx: -80, dy: 10 }), 1);
  assert.equal(swipeDirection({ dx: 80, dy: -10 }), -1);
  assert.equal(swipeDirection({ dx: -30, dy: 0 }), 0);
  assert.equal(swipeDirection({ dx: -80, dy: 60 }), 0);
  assert.equal(swipeDirection({ dx: 5, dy: 200 }), 0);
});

test("keys: arrows move, modifiers and other keys do not", () => {
  assert.equal(keyDirection({ key: "ArrowRight", hasModifier: false }), 1);
  assert.equal(keyDirection({ key: "ArrowLeft", hasModifier: false }), -1);
  assert.equal(keyDirection({ key: "ArrowLeft", hasModifier: true }), 0);
  assert.equal(keyDirection({ key: "a", hasModifier: false }), 0);
});

test("URL: reads good values", () => {
  assert.deepEqual(readLocation("?race=london&week=5"), { raceId: "london", weekKey: "plan-5", view: "week", date: null });
  assert.deepEqual(readLocation("?week=b1&view=long"), { raceId: null, weekKey: "base-1", view: "long", date: null });
});

test("URL: wrong values give the defaults", () => {
  assert.deepEqual(readLocation(""), { raceId: null, weekKey: null, view: "week", date: null });
  for (const week of ["0", "abc", "-1", "5x", "b", "123", ""]) {
    assert.equal(readLocation(`?week=${week}`).weekKey, null, week);
  }
  assert.equal(readLocation("?view=other").view, "week");
});

test("URL: written text reads back the same", () => {
  for (const weekKey of [null, "base-2", "plan-16"]) {
    for (const view of ["week", "long"]) {
      for (const date of [null, "2027-02-10"]) {
        const location = { raceId: "brighton", weekKey, view, date };
        assert.deepEqual(readLocation(writeLocation(location)), location);
      }
    }
  }
  assert.equal(writeLocation({ raceId: "brighton", weekKey: null, view: "week" }), "?race=brighton");
});

test("race: URL, then stored, then first", () => {
  const raceIds = ["brighton", "london"];
  assert.equal(chooseRaceId({ raceIds, urlRaceId: "london", storedRaceId: "brighton" }), "london");
  assert.equal(chooseRaceId({ raceIds, urlRaceId: "paris", storedRaceId: "london" }), "london");
  assert.equal(chooseRaceId({ raceIds, urlRaceId: null, storedRaceId: "paris" }), "brighton");
});

test("URL date: only a real ISO date", () => {
  assert.equal(readLocation("?date=2027-02-10").date, "2027-02-10");
  for (const date of ["2027-02-30", "2027-13-01", "10-02-2027", "2027-2-1", "today", ""]) {
    assert.equal(readLocation(`?date=${date}`).date, null, date);
  }
});

test("units: a stored value, or both", () => {
  assert.equal(chooseUnits("mi"), "mi");
  assert.equal(chooseUnits(null), "both");
  assert.equal(chooseUnits("yards"), "both");
});
