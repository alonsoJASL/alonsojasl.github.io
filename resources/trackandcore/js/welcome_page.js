// Orchestrator of the welcome page. It uses the clock, the URL, storage and the page.
import { drawMenu } from "./draw_menu.js";
import { fetchJson } from "./fetch_json.js";
import { chooseRaceId, chooseUnits, readLocation, writeLocation } from "./navigation.js";
import { createMemory, localIsoDate, STORAGE_KEYS } from "./reader.js";
import { renderChart } from "./render/chart.js";
import { escapeHtml } from "./render/format.js";
import { renderPhases, renderStarts } from "./render/welcome.js";
import { buildSchedule } from "./schedule.js";

const element = (id) => document.getElementById(id);

/**
 * @param {{ races: import("./contracts.js").Race[], planData: import("./contracts.js").PlanData, root: string,
 *           location: import("./contracts.js").PageLocation, today: string,
 *           raceMemory: import("./reader.js").Memory, units: import("./contracts.js").Units }} input
 */
function startPage({ races, planData, root, location, today, raceMemory, units }) {
  const schedules = new Map(races.map((race) => [race.id, buildSchedule({ race, ...planData })]));
  const state = {
    raceId: chooseRaceId({ raceIds: races.map(({ id }) => id), urlRaceId: location.raceId, storedRaceId: raceMemory.load() }),
  };
  const schedule = () => schedules.get(state.raceId);
  const search = (changes = {}) =>
    writeLocation({ raceId: state.raceId, weekKey: null, view: "week", date: location.date, ...changes });
  const planUrl = (changes) => `${root}plan/${search(changes)}`;

  function draw() {
    document.body.dataset.race = state.raceId; // the styles have the colours of each race
    const { name } = races.find(({ id }) => id === state.raceId);
    element("chart").innerHTML = renderChart({
      schedule: schedule(), today, units, valuesPlace: "The long-run view of the plan has all the values.",
    });
    element("phases").innerHTML = renderPhases({ phases: planData.phases, schedule: schedule() });
    element("plan-links").innerHTML = `<a href="${escapeHtml(planUrl())}">Open the ${escapeHtml(name)} plan</a>
      <a href="${escapeHtml(planUrl({ view: "long" }))}">All long runs</a>`;
    for (const button of element("races").children) {
      button.setAttribute("aria-pressed", String(button.dataset.race === state.raceId));
    }
  }

  /** The line above the chart follows the pointer. */
  function showReadout(column) {
    const readout = element("chart-readout");
    readout.textContent = column?.dataset.readout ?? readout.dataset.summary;
  }

  element("start-dates").innerHTML = renderStarts({ races, schedules });
  element("races").replaceChildren(...races.map((race) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.race = race.id;
    button.textContent = race.name;
    button.addEventListener("click", () => {
      raceMemory.save(race.id);
      state.raceId = race.id;
      draw();
      window.history.replaceState(null, "", search());
      element("status").textContent = `${race.name} plan`;
    });
    return button;
  }));
  const chart = element("chart");
  chart.addEventListener("pointerover", (event) => showReadout(event.target.closest("[data-readout]")));
  chart.addEventListener("pointerleave", () => showReadout(null));
  chart.addEventListener("click", (event) => {
    const column = event.target.closest("[data-index]");
    if (column) window.location.assign(planUrl({ weekKey: schedule()[Number(column.dataset.index)].key }));
  });
  draw();
}

try {
  const menu = element("menu");
  const { root } = menu.dataset;
  await drawMenu(menu);
  const [races, phases, weeks, weekTemplate, distances, baseBuild, track, gym] = await Promise.all(
    ["races", "phases", "weeks", "week_template", "distances", "base_build", "track", "gym"]
      .map((name) => fetchJson(`${root}data/${name}.json`)),
  );
  const location = readLocation(window.location.search);
  const getStorage = () => window.localStorage;
  startPage({
    races,
    planData: { phases, weeks, weekTemplate, distances, baseBuild, track, gym },
    root,
    location,
    today: location.date ?? localIsoDate(new Date()),
    raceMemory: createMemory({ getStorage, key: STORAGE_KEYS.race }),
    units: chooseUnits(createMemory({ getStorage, key: STORAGE_KEYS.units }).load()),
  });
} catch (error) {
  element("start-dates").textContent = `The dates did not load. ${error.message}`;
  console.error(error);
}
