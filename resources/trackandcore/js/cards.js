// Shows one card at a time, with a selector above the cards. For the orchestrators.

/**
 * @param {HTMLElement} container  its data-cards names the selector. Each child with data-card is a card,
 *   and data-card is the text of its button
 * @returns {{ show: (id: string) => boolean }} show: opens the card with this id. False when there is none.
 */
export function createCards(container) {
  const page = container.ownerDocument;
  const cards = [...container.querySelectorAll(":scope > [data-card]")];

  function open(selected) {
    cards.forEach((card, index) => {
      card.hidden = card !== selected;
      buttons[index].setAttribute("aria-pressed", String(card === selected));
    });
  }

  const buttons = cards.map((card) => {
    const button = page.createElement("button");
    button.type = "button";
    button.textContent = card.dataset.card;
    button.addEventListener("click", () => open(card));
    return button;
  });

  const selector = page.createElement("div");
  selector.className = "segmented";
  selector.setAttribute("role", "group");
  selector.setAttribute("aria-label", container.dataset.cards);
  selector.append(...buttons);
  container.prepend(selector);
  open(cards[0]);

  return {
    show(id) {
      const card = cards.find((candidate) => candidate.id === id);
      if (card) open(card);
      return Boolean(card);
    },
  };
}
