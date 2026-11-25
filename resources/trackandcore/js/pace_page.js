// Orchestrator of the pace page: the slider and the two views.
import { drawMenu } from "./draw_menu.js";
import { fetchJson } from "./fetch_json.js";
import { startIndex } from "./pace.js";
import { headlineTimes, renderPaceRow, renderPaceTable, spokenRow } from "./render/pace.js";

const element = (id) => document.getElementById(id);

function startPage(pace) {
  const slider = element("pace-slider");
  const times = headlineTimes(pace);
  const state = { index: startIndex(pace), isExample: true, view: "table" };

  function draw() {
    const { index, isExample, view } = state;
    slider.value = String(index);
    slider.setAttribute("aria-valuetext", spokenRow({ pace, index }));
    element("pace-row").innerHTML = renderPaceRow({ pace, index, isExample });
    element("pace-finder").hidden = view !== "row";
    element("pace-table").hidden = view !== "table";
    element("view-row").setAttribute("aria-pressed", String(view === "row"));
    element("view-table").setAttribute("aria-pressed", String(view === "table"));
  }

  /** No row is marked until the reader moves the slider: the example is not a target. */
  function showTable() {
    state.view = "table";
    element("pace-table").innerHTML = renderPaceTable({ pace, index: state.isExample ? null : state.index });
    draw();
    const box = element("pace-table").querySelector(".table-scroll");
    const row = box.querySelector(".is-current");
    if (row) box.scrollTop = row.offsetTop - (box.clientHeight - row.offsetHeight) / 2;
  }

  slider.max = String(times.length - 1);
  element("pace-slowest").textContent = times[0];
  element("pace-fastest").textContent = times.at(-1);
  slider.addEventListener("input", () => {
    Object.assign(state, { index: Number(slider.value), isExample: false });
    draw();
  });
  element("view-row").addEventListener("click", () => {
    state.view = "row";
    draw();
  });
  element("view-table").addEventListener("click", showTable);
  showTable();
}

try {
  const menu = element("menu");
  await drawMenu(menu);
  startPage(await fetchJson(`${menu.dataset.root}data/pace.json`));
} catch (error) {
  element("pace-table").textContent = `The pace table did not load. ${error.message}`;
  console.error(error);
}
