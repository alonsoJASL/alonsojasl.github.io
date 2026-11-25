// Orchestrator of the text pages. It draws the menu and, where the page has them, the cards.
// The text is in the HTML file.
import { createCards } from "./cards.js";
import { drawMenu } from "./draw_menu.js";

const container = document.querySelector("[data-cards]");
if (container) {
  const cards = createCards(container);
  const openFromUrl = () => cards.show(window.location.hash.slice(1));
  window.addEventListener("hashchange", openFromUrl);
  openFromUrl();
}

try {
  await drawMenu(document.getElementById("menu"));
} catch (error) {
  console.error(error);
}
