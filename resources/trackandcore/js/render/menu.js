// Pure: Page[] -> HTML links for the site menu.
import { escapeHtml } from "./format.js";

/**
 * @param {{ pages: import("../contracts.js").Page[], currentId: string, root: string }} input
 *   root: the way from this page to the site root, "./" or "../"
 */
export function renderMenu({ pages, currentId, root }) {
  return pages.map(({ id, title, path }) =>
    `<a href="${escapeHtml(root + path)}"${id === currentId ? ' aria-current="page"' : ""}>${escapeHtml(title)}</a>`).join("");
}
