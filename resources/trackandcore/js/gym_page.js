// Orchestrator of the strength page.
import { createCards } from "./cards.js";
import { drawMenu } from "./draw_menu.js";
import { fetchJson } from "./fetch_json.js";
import { renderGymPage } from "./render/gym.js";

const menu = document.getElementById("menu");
const content = document.getElementById("content");
const { root } = menu.dataset;

async function fileExists(path) {
  try {
    return (await fetch(path, { method: "HEAD" })).ok;
  } catch {
    return false;
  }
}

/** The same plan, without the pictures that the server does not have. */
async function withoutMissingImages(gym) {
  const sessions = await Promise.all(Object.entries(gym.sessions).map(async ([session, details]) => {
    const hasImage = details.image && await fileExists(`${root}assets/exercises/${details.image.file}`);
    return [session, { ...details, image: hasImage ? details.image : null }];
  }));
  return { ...gym, sessions: Object.fromEntries(sessions) };
}

/** The plan links to a session. The browser cannot scroll to it alone: the content arrives late, or the card is hidden. */
function openSessionFromUrl(cards) {
  const id = window.location.hash.slice(1);
  if (cards.show(id)) document.getElementById(id).scrollIntoView();
}

try {
  await drawMenu(menu);
  const [gym, weeks, weekTemplate] = await Promise.all(
    ["gym", "weeks", "week_template"].map((name) => fetchJson(`${root}data/${name}.json`)),
  );
  content.innerHTML = renderGymPage({ gym: await withoutMissingImages(gym), weeks, weekTemplate, root });
  const cards = createCards(content.querySelector("[data-cards]"));
  window.addEventListener("hashchange", () => openSessionFromUrl(cards));
  openSessionFromUrl(cards);
} catch (error) {
  content.textContent = `The strength page did not load. ${error.message}`;
  console.error(error);
}
