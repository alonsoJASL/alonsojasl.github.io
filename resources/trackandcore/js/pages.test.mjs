import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { formatWeeks, renderGymPage, weeksByLoad } from "./render/gym.js";
import { renderMenu } from "./render/menu.js";

const site = new URL("../", import.meta.url);
const readText = (path) => readFileSync(new URL(path, site), "utf8");
const load = (name) => JSON.parse(readText(`data/${name}.json`));
const pages = load("pages");
const gym = load("gym");
const weeks = load("weeks");
const weekTemplate = load("week_template");
const pageFile = (page) => new URL(`${page.path}index.html`, site);
const gymHtml = (changes = {}) => renderGymPage({ gym, weeks, weekTemplate, root: "../", ...changes });

test("menu: one current page, and links that reach the right page from each page", () => {
  for (const current of pages) {
    const root = current.path === "./" ? "./" : "../";
    const html = renderMenu({ pages, currentId: current.id, root });
    assert.equal(html.split("aria-current").length - 1, 1);
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((match) => new URL(match[1], pageFile(current)).href);
    assert.deepEqual(links, pages.map((page) => new URL(page.path, site).href));
  }
});

test("each page of pages.json exists and names itself and its root", () => {
  for (const page of pages) {
    assert.ok(existsSync(pageFile(page)), page.path);
    const root = page.path === "./" ? "./" : "../";
    assert.match(readFileSync(pageFile(page), "utf8"), new RegExp(`id="menu"[^>]*data-root="${root}" data-page="${page.id}"`));
  }
});

test("gym pictures: none, draft badge or credit, and each credited file exists", () => {
  for (const { image } of Object.values(gym.sessions)) {
    if (image?.credit) assert.ok(existsSync(new URL(`assets/exercises/${image.file}`, site)), image.file);
  }
  const withImage = (image) => gymHtml({ gym: { ...gym, sessions: { A: { ...gym.sessions.A, image } } } });
  assert.doesNotMatch(withImage(null), /<img|<details/);
  const image = { file: "example.jpeg", alt: "Example", credit: null };
  assert.match(withImage(image), /<img src="\.\.\/assets\/exercises\/example\.jpeg" alt="Example"[\s\S]*Draft: source to be added/);
  const credited = withImage({ ...image, credit: { text: "Example", url: "https://example.org/" } });
  assert.match(credited, /Source: <a href="https:\/\/example\.org\/">Example<\/a>/);
  assert.doesNotMatch(credited, /Draft/);
});

test("formatWeeks makes ranges", () => {
  assert.equal(formatWeeks([1, 2, 3, 5, 6, 7]), "1–3, 5–7");
  assert.equal(formatWeeks([4, 8, 12]), "4, 8, 12");
  assert.equal(formatWeeks([13, 14]), "13–14");
  assert.equal(formatWeeks([15]), "15");
});

test("the gym table has each of weeks 1 to 16 once", () => {
  const numbers = [...weeksByLoad(weeks).values()].flat().sort((a, b) => a - b);
  assert.deepEqual(numbers, Array.from({ length: 16 }, (_, index) => index + 1));
  assert.match(gymHtml(), />1–8<[\s\S]*>9–12<[\s\S]*>13–14<[\s\S]*>15<[\s\S]*>16</);
});

test("the gym page has both sessions, with the days of the week template", () => {
  assert.match(gymHtml(), /id="session-a"[\s\S]*Tuesday, after the run[\s\S]*id="session-b"[\s\S]*Friday/);
  const moved = weekTemplate.map(({ gym: session, ...day }) =>
    (day.label === "Thu" ? { ...day, gym: "B" } : day.label === "Fri" ? day : { ...day, gym: session }));
  assert.match(gymHtml({ weekTemplate: moved }), /id="session-b"[\s\S]*Thursday, after the run/);
});

test("gym text is escaped", () => {
  const html = gymHtml({ gym: { ...gym, rules: ["<b>2 & 3</b>"] } });
  assert.match(html, /&lt;b&gt;2 &amp; 3&lt;\/b&gt;/);
});

test("the coaches have a role and no name", () => {
  const coaches = /<section id="coaches"[\s\S]*?<\/section>/.exec(readText("resources/index.html"))[0];
  assert.deepEqual([...coaches.matchAll(/<b>([^<]+)<\/b>/g)].map((match) => match[1]), ["Captain", "Co-captains", "Captain"]);
  assert.doesNotMatch(coaches, /class="coach"/);
});

const htmlOf = (page) => readFileSync(pageFile(page), "utf8");
const hrefs = (page) => [...htmlOf(page).matchAll(/<a [^>]*href="([^"]+)"/g)].map((match) => match[1]);
const isWebLink = (href) => /^[a-z]+:/.test(href);

test("each web link is https and is in one place", () => {
  const links = pages.flatMap(hrefs).filter(isWebLink);
  assert.ok(links.length > 10);
  for (const link of links) assert.match(link, /^https:\/\//);
  assert.equal(new Set(links).size, links.length);
});

test("each internal link and anchor exists", () => {
  for (const page of pages) {
    for (const href of hrefs(page).filter((value) => !isWebLink(value))) {
      const url = new URL(href, pageFile(page));
      const target = pages.find(({ path }) =>
        [new URL(path, site).pathname, pageFile({ path }).pathname].includes(url.pathname));
      assert.ok(target, `${href} in ${page.path}`);
      if (url.hash) assert.match(htmlOf(target), new RegExp(`id="${url.hash.slice(1)}"`), `${href} in ${page.path}`);
    }
  }
});

test("text pages do not repeat week numbers", () => {
  for (const page of pages) assert.doesNotMatch(htmlOf(page), /\bweeks? \d/i, page.path);
});

test("each page has one h1", () => {
  for (const page of pages) assert.equal(htmlOf(page).split("<h1").length - 1, 1, page.path);
});

test("each page has its own colour", () => {
  const styles = readText("css/styles.css");
  for (const page of pages) {
    assert.match(htmlOf(page), new RegExp(`<body class="page-${page.id}">`));
    assert.match(styles, new RegExp(`\\.page-${page.id} \\{ --page:`));
  }
});

test("strength: the rules, then the two cards, then the recommended plan", () => {
  assert.match(gymHtml(), /In every session[\s\S]*data-cards="Session"[\s\S]*data-card="Session A"[\s\S]*data-card="Session B"[\s\S]*Recommended plan/);
  assert.doesNotMatch(gymHtml(), /<details/);
});

test("nutrition: three cards, each with its own id", () => {
  const cards = [...readText("nutrition/index.html").matchAll(/<section id="([\w-]+)" class="panel" data-card="[^"]+"/g)];
  assert.equal(new Set(cards.map((match) => match[1])).size, 3);
});

test("faqs: all questions share one name, so that only one is open", () => {
  const questions = [...readText("faqs/index.html").matchAll(/<details[^>]*>/g)].map((match) => match[0]);
  assert.ok(questions.length > 10);
  assert.deepEqual([...new Set(questions)], ['<details name="faq">']);
});

test("mobility: each lunge matrix in a list has 5 reps, without the plan card", () => {
  const items = [...readText("mobility/index.html").matchAll(/<li>.*Lunge matrix.*<\/li>/g)].map((match) => match[0]);
  assert.equal(items.length, 2);
  for (const item of items) assert.ok(/5 reps in each direction/.test(item) && !/plan card/.test(item), item);
});

test("pace: the full table is the first view", () => {
  assert.match(readText("pace/index.html"), /id="view-table" type="button" aria-pressed="true"[\s\S]*id="view-row" type="button" aria-pressed="false"[\s\S]*id="pace-finder" class="panel" hidden/);
});

test("each draft badge has the draft colour", () => {
  for (const page of pages) assert.doesNotMatch(htmlOf(page), /class="badge">Draft/, page.path);
  assert.doesNotMatch(gymHtml(), /class="badge">Draft/);
});
