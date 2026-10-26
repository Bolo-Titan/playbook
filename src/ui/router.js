// Einfache Navigation zwischen den Ansichten.
// Jede Ansicht ist ein Objekt mit optional: tab (welcher Menüpunkt aktiv ist), enter(params), leave().
// Das HTML dazu ist ein <section id="v-NAME" class="view">.

const views = {};
let current = null;

export function register(name, view) {
  views[name] = view;
}

export const currentView = () => current;

export function go(name, params = {}) {
  const view = views[name];
  if (!view) throw new Error(`Unbekannte Ansicht: ${name}`);
  if (current && current !== name) views[current].leave?.();
  current = name;
  document.querySelectorAll('.view').forEach(s => { s.hidden = s.id !== 'v-' + name; });
  const tab = view.tab || name;
  document.querySelectorAll('nav [data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === tab));
  window.scrollTo(0, 0);
  view.enter?.(params);
}
