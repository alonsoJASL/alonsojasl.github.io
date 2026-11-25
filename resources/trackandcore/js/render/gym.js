// Pure: gym.json, weeks.json and week_template.json -> HTML for the strength page.
import { escapeHtml, sessionId, weekdayName } from "./format.js";

/** @param {import("../contracts.js").WeekRow[]} weeks  @returns {Map<string, number[]>} load name -> week numbers */
export function weeksByLoad(weeks) {
  const result = new Map();
  for (const { week, gym } of weeks) result.set(gym, [...(result.get(gym) ?? []), week]);
  return result;
}

/** [1, 2, 3, 5] -> "1–3, 5" */
export function formatWeeks(numbers) {
  const ranges = [];
  for (const number of numbers) {
    const last = ranges.at(-1);
    if (last && number === last.to + 1) last.to = number;
    else ranges.push({ from: number, to: number });
  }
  return ranges.map(({ from, to }) => (from === to ? `${from}` : `${from}–${to}`)).join(", ");
}

/** "Tuesday, after the run". The day comes from the week template. */
function usualDay({ session, weekTemplate }) {
  const day = weekTemplate.find((candidate) => candidate.gym === session);
  if (!day) return "No usual day";
  return `${weekdayName(day.label)}${day.distanceKey ? ", after the run" : ""}`;
}

const renderExercise = ({ name, sets, tip }) => `<li class="exercise">
    <strong>${escapeHtml(name)}</strong><span class="sets">${escapeHtml(sets)}</span>
    <small>${escapeHtml(tip)}</small></li>`;

function renderCredit(credit) {
  if (!credit) return '<span class="badge badge-draft">Draft: source to be added</span>';
  return `Source: <a href="${escapeHtml(credit.url)}">${escapeHtml(credit.text)}</a>`;
}

const renderImage = ({ image, root }) => `<figure>
    <img src="${escapeHtml(`${root}assets/exercises/${image.file}`)}" alt="${escapeHtml(image.alt)}" loading="lazy">
    <figcaption>${renderCredit(image.credit)}</figcaption></figure>`;

function renderSession({ session, details, weekTemplate, root }) {
  return `<section class="session panel" id="${sessionId(session)}" data-card="Session ${escapeHtml(session)}">
    <header class="session-header">
      <h2>${escapeHtml(session)}: ${escapeHtml(details.name)}</h2>
      <p>${usualDay({ session, weekTemplate })}</p>
    </header>
    <p class="muted">${escapeHtml(details.focus)}</p>
    ${details.image ? renderImage({ image: details.image, root }) : ""}
    <ol class="exercises">${details.exercises.map(renderExercise).join("")}</ol>
  </section>`;
}

function renderLoads({ gym, weeks }) {
  const sessions = Object.keys(gym.sessions);
  const rows = [...weeksByLoad(weeks)].map(([load, numbers]) => `<tr>
      <th scope="row">${formatWeeks(numbers)}</th>
      ${sessions.map((session) => `<td>${escapeHtml(gym.loads[load][session])}</td>`).join("")}</tr>`).join("");
  return `<table class="loads"><thead><tr><th scope="col">Weeks</th>
    ${sessions.map((session) => `<th scope="col">${escapeHtml(session)}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody></table>`;
}

/**
 * @param {{ gym: import("../contracts.js").GymPlan, weeks: import("../contracts.js").WeekRow[],
 *           weekTemplate: import("../contracts.js").TemplateDay[], root: string }} input
 */
export function renderGymPage({ gym, weeks, weekTemplate, root }) {
  const sessions = Object.entries(gym.sessions)
    .map(([session, details]) => renderSession({ session, details, weekTemplate, root })).join("");
  return `<section><h2>In every session</h2>
      <ul class="rules">${gym.rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}</ul></section>
    <div class="cards" data-cards="Session">${sessions}</div>
    <section><h2>Recommended plan</h2>${renderLoads({ gym, weeks })}</section>`;
}
