import './gallery.css';

const groups = [
  { label: 'Pokemon', slug: 'pokemon', tags: ['pokemon', 'anime'] },
  { label: 'Digimon', slug: 'digimon', tags: ['digimon', 'anime'] },
  { label: 'Chainsaw Man', slug: 'chainsaw-man', tags: ['chainsaw-man', 'anime', 'action'] },
  { label: 'Cars', slug: 'cars', tags: ['cars', 'vehicles'] }
];

const artwork = groups.flatMap((group) => Array.from({ length: 40 }, (_, index) => ({
  title: `${group.label} ${String(index + 1).padStart(2, '0')}`,
  image: `https://picsum.photos/seed/seviyummy-${group.slug}-${index + 1}/800/800`,
  tags: group.tags
})));

const state = { query: '', active: 'all', selected: new Map() };
const labelFor = (tag) => ({ 'chainsaw-man': 'Chainsaw Man', vehicles: 'Vehicles' }[tag] || tag[0].toUpperCase() + tag.slice(1));

document.querySelector('#app').innerHTML = `
  <div class="gallery-shell">
    <header class="gallery-header">
      <div><span class="eyebrow">COLLECTION / SEVIYUMMY</span><h1>seviyummy <em>gallery</em></h1><p>Select the images you need, then click <strong>Copy names</strong> to share the exact list and quantity.</p></div>
      <a class="studio-link" href="./admin.html">Open studio ↗</a>
    </header>
    <section class="tools" aria-label="Gallery controls">
      <label class="search"><span>Search the gallery</span><input id="search" type="search" placeholder="Name or tag…" autocomplete="off" /></label>
      <div class="filters" id="filters"></div>
      <div class="results"><span id="count"></span><span>select cards to build your list</span></div>
      <div class="selection" id="selection" hidden><b><span id="selection-count">0</span> selected</b><div class="selected-list" id="selected-list"></div><button id="copy" type="button">Copy names</button><button id="clear" class="clear" type="button">Clear</button></div>
    </section>
    <section class="gallery" id="gallery" aria-label="Artwork gallery"></section>
    <footer><span>seviyummy gallery</span><span>small universes, carefully kept</span></footer>
  </div>
`;

const gallery = document.querySelector('#gallery');
const filters = document.querySelector('#filters');
const search = document.querySelector('#search');
const count = document.querySelector('#count');
const selection = document.querySelector('#selection');
const selectionCount = document.querySelector('#selection-count');
const selectedList = document.querySelector('#selected-list');

function renderFilters() {
  const tags = [...new Set(artwork.flatMap((item) => item.tags))];
  filters.innerHTML = [['all', 'All'], ...tags.map((tag) => [tag, labelFor(tag)])].map(([value, label]) => `<button class="filter${state.active === value ? ' active' : ''}" data-filter="${value}" type="button">${label}</button>`).join('');
  filters.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => { state.active = button.dataset.filter; render(); }));
}

function renderSelection() {
  selection.hidden = state.selected.size === 0;
  selectionCount.textContent = state.selected.size;
  selectedList.innerHTML = [...state.selected.values()].map((item) => `<span class="selected-item"><strong>${item.title}</strong><small>${item.tags.map((tag) => `#${tag}`).join(' ')}</small></span>`).join('');
}

function render() {
  const query = state.query.toLowerCase();
  const shown = artwork.filter((item) => {
    const matchesFilter = state.active === 'all' || item.tags.includes(state.active);
    const matchesQuery = !query || `${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });
  count.textContent = `${shown.length} artworks`;
  gallery.innerHTML = shown.map((item) => {
    const key = item.title;
    return `<article class="art-card${state.selected.has(key) ? ' selected' : ''}" data-key="${key}" tabindex="0" role="button" aria-pressed="${state.selected.has(key)}"><div class="art-image"><img src="${item.image}" alt="${item.title}" loading="lazy" /><span class="watermark">SEVIYUMMY</span></div><div class="art-info"><strong>${item.title}</strong><div>${item.tags.map((tag) => `<span>#${tag}</span>`).join('')}</div></div></article>`;
  }).join('') || '<p class="empty">No artworks found. Try another search.</p>';
  renderSelection();
}

function toggle(card) {
  const item = artwork.find((entry) => entry.title === card.dataset.key);
  if (state.selected.has(item.title)) state.selected.delete(item.title); else state.selected.set(item.title, item);
  render();
}

gallery.addEventListener('click', (event) => { const card = event.target.closest('.art-card'); if (card) toggle(card); });
gallery.addEventListener('keydown', (event) => { const card = event.target.closest('.art-card'); if (card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); toggle(card); } });
search.addEventListener('input', () => { state.query = search.value.trim(); render(); });
document.querySelector('#clear').addEventListener('click', () => { state.selected.clear(); render(); });
document.querySelector('#copy').addEventListener('click', async (event) => { const names = [...state.selected.keys()]; await navigator.clipboard?.writeText(`${names.length} images:\n${names.join('\n')}`); event.currentTarget.textContent = 'Copied ✓'; setTimeout(() => { event.currentTarget.textContent = 'Copy names'; }, 1600); });
renderFilters();
render();
