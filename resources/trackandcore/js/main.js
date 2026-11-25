// Orchestrator of the plan page. It uses the clock, the URL, storage and the page.
import { drawMenu } from "./draw_menu.js";
import { fetchJson } from "./fetch_json.js";
import {
  chooseRaceId, chooseUnits, keyDirection, readLocation, swipeDirection, writeLocation,
} from "./navigation.js";
import { createMemory, localIsoDate, STORAGE_KEYS } from "./reader.js";
import { buildSchedule, daysUntil, findCurrentIndex } from "./schedule.js";
import { renderCard } from "./render/card.js";
import { countdownText, weekTitle } from "./render/format.js";
import { renderLongRuns } from "./render/long_runs.js";
import { renderStrip } from "./render/strip.js";

/** @typedef {import("./reader.js").Memory} Memory */

/**
 * @param {{ page: Document, races: import("./contracts.js").Race[],
 *           planData: import("./contracts.js").PlanData, today: string,
 *           location: import("./contracts.js").PageLocation, raceMemory: Memory, unitsMemory: Memory,
 *           replaceUrl: (search: string) => void, root: string }} input
 */
function startApp({ page, races, planData, today, location, raceMemory, unitsMemory, replaceUrl, root }) {
  const element = (id) => page.getElementById(id);
  const content = element("content");
  const strip = element("strip");

  // Build both now, so that a data error shows at the start.
  const schedules = new Map(races.map((race) => [race.id, buildSchedule({ race, ...planData })]));
  const raceIds = races.map((race) => race.id);
  const state = {
    ...location, // weekKey null: the current week
    raceId: chooseRaceId({ raceIds, urlRaceId: location.raceId, storedRaceId: raceMemory.load() }),
    units: chooseUnits(unitsMemory.load()),
  };

  const race = () => races.find(({ id }) => id === state.raceId);
  const schedule = () => schedules.get(state.raceId);
  const currentIndex = () => findCurrentIndex({ schedule: schedule(), today });
  function selectedIndex() {
    const index = schedule().findIndex((week) => week.key === state.weekKey);
    return index === -1 ? currentIndex() : index;
  }

  function drawStrip(index) {
    const hadFocus = strip.contains(page.activeElement);
    strip.innerHTML = renderStrip({ schedule: schedule(), selectedIndex: index, today });
    const button = strip.querySelector("[aria-current]");
    strip.scrollLeft = button.offsetLeft - (strip.clientWidth - button.offsetWidth) / 2;
    if (hadFocus) button.focus({ preventScroll: true });
  }

  function draw() {
    const isWeekView = state.view === "week";
    const index = selectedIndex();
    const week = schedule()[index];
    page.body.dataset.race = state.raceId; // the styles have the colours of each race
    content.innerHTML = isWeekView
      ? renderCard({ week, raceName: race().name, isFirst: index === 0, today, units: state.units, root })
      : renderLongRuns({ schedule: schedule(), today, units: state.units });
    element("countdown").textContent = countdownText({
      name: race().name,
      days: daysUntil({ from: today, to: race().raceDate }),
    });
    strip.hidden = !isWeekView;
    element("week-nav").hidden = !isWeekView;
    element("previous").disabled = index === 0;
    element("next").disabled = index === schedule().length - 1;
    element("view-week").setAttribute("aria-pressed", String(isWeekView));
    element("view-long").setAttribute("aria-pressed", String(!isWeekView));
    for (const button of element("races").children) {
      button.setAttribute("aria-pressed", String(button.dataset.race === state.raceId));
    }
    for (const button of element("units").children) {
      button.setAttribute("aria-pressed", String(button.dataset.units === state.units));
    }
    if (isWeekView) drawStrip(index);
  }

  /** A reader action: change the state, the page, the URL and the spoken status. */
  function update(changes) {
    Object.assign(state, changes);
    draw();
    replaceUrl(writeLocation(state));
    element("status").textContent = state.view === "week"
      ? weekTitle(schedule()[selectedIndex()])
      : "Long runs";
  }

  function step(direction) {
    const week = schedule()[selectedIndex() + direction];
    if (direction !== 0 && state.view === "week" && week) update({ weekKey: week.key });
  }

  function openWeek(event) {
    const button = event.target.closest("[data-index]");
    if (!button) return false;
    update({ view: "week", weekKey: schedule()[Number(button.dataset.index)].key });
    return true;
  }

  /** The line above the chart follows the pointer. */
  function listenForChartHover() {
    function show(column) {
      const readout = element("chart-readout");
      if (readout) readout.textContent = column?.dataset.readout ?? readout.dataset.summary;
    }
    content.addEventListener("pointerover", (event) => show(event.target.closest("[data-readout]")));
    content.addEventListener("pointerleave", () => show(null));
  }

  function listenForSwipe() {
    let start = null;
    content.addEventListener("touchstart", (event) => {
      start = event.touches.length === 1 ? event.touches[0] : null;
    }, { passive: true });
    content.addEventListener("touchcancel", () => { start = null; });
    content.addEventListener("touchend", (event) => {
      if (!start) return;
      const end = event.changedTouches[0];
      const delta = { dx: end.clientX - start.clientX, dy: end.clientY - start.clientY };
      start = null;
      step(swipeDirection(delta));
    });
  }

  element("races").replaceChildren(...races.map((race) => {
    const button = page.createElement("button");
    button.type = "button";
    button.dataset.race = race.id;
    button.textContent = race.name;
    button.addEventListener("click", () => {
      raceMemory.save(race.id);
      update({ raceId: race.id, weekKey: null });
    });
    return button;
  }));
  for (const button of element("units").children) {
    button.addEventListener("click", () => {
      unitsMemory.save(button.dataset.units);
      update({ units: button.dataset.units });
    });
  }
  element("previous").addEventListener("click", () => step(-1));
  element("next").addEventListener("click", () => step(1));
  element("today").addEventListener("click", () => update({ weekKey: null }));
  element("view-week").addEventListener("click", () => update({ view: "week" }));
  element("view-long").addEventListener("click", () => update({ view: "long" }));
  strip.addEventListener("click", openWeek);
  content.addEventListener("click", (event) => {
    if (openWeek(event)) content.focus();
  });
  page.addEventListener("keydown", (event) => {
    const hasModifier = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
    step(keyDirection({ key: event.key, hasModifier }));
  });
  listenForSwipe();
  listenForChartHover();

  draw();
}

try {
  const menu = document.getElementById("menu");
  const { root } = menu.dataset;
  await drawMenu(menu);

  const [races, phases, weeks, weekTemplate, distances, baseBuild, track, gym] = await Promise.all(
    ["races", "phases", "weeks", "week_template", "distances", "base_build", "track", "gym"]
      .map((name) => fetchJson(`${root}data/${name}.json`)),
  );
  const location = readLocation(window.location.search);
  const getStorage = () => window.localStorage;
  startApp({
    page: document,
    races,
    planData: { phases, weeks, weekTemplate, distances, baseBuild, track, gym },
    today: location.date ?? localIsoDate(new Date()),
    location,
    raceMemory: createMemory({ getStorage, key: STORAGE_KEYS.race }),
    unitsMemory: createMemory({ getStorage, key: STORAGE_KEYS.units }),
    root,
    replaceUrl: (search) => window.history.replaceState(null, "", search),
  });
} catch (error) {
  document.getElementById("content").textContent = `The plan did not load. ${error.message}`;
  console.error(error);
}
