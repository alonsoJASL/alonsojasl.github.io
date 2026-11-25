// Draws the site menu. For the orchestrators.
import { fetchJson } from "./fetch_json.js";
import { renderMenu } from "./render/menu.js";

/** @param {HTMLElement} menu  its data-root and data-page say where the page is */
export async function drawMenu(menu) {
  const { root, page } = menu.dataset;
  menu.innerHTML = renderMenu({ pages: await fetchJson(`${root}data/pages.json`), currentId: page, root });
  const current = menu.querySelector("[aria-current]");
  menu.scrollLeft = current.offsetLeft - (menu.clientWidth - current.offsetWidth) / 2;
}
