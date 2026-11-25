// The only place that loads JSON. For the orchestrators.

/** @param {string} path  relative to the page */
export async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Cannot load ${path} (status ${response.status})`);
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`${path} is not valid JSON. ${error.message}`);
  }
}
