import { createClient } from '@supabase/supabase-js';
import './gallery.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const configured = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project'));
const supabase = configured ? createClient(supabaseUrl, supabaseKey) : null;

const state = { query: '', active: 'all', selected: new Map(), artwork: [], loading: true, error: '', requestId: 0, searchTimer: null, serverSearchQuery: null };
const labelFor = (tag) => tag.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));

document.querySelector('#app').innerHTML = `
  <main>
    <section class="shell gallery-page" id="galeria">
      <div class="section-head">
        <div><span class="mono">collection</span><h2>seviyummy gallery</h2><p class="gallery-instruction">Select the images you need, then click <strong>Copy names</strong> to share the exact list and quantity.</p></div>
        <span class="count" id="count">Loading gallery…</span>
      </div>
      <div class="gallery-sticky" id="gallery-sticky">
        <div class="sticky-search"><div class="search-box"><label for="search">Search the gallery</label><input id="search" type="search" placeholder="Name or tag…" autocomplete="off" /></div></div>
        <div class="filters" id="filters"></div>
        <div id="selection" class="selection-bar" hidden><div class="selection-count"><b id="selection-count">0</b><span>selected</span></div><div id="selected-list" class="selection-names"></div><button id="copy" class="selection-copy" type="button">Copy names</button><button id="clear" class="selection-clear" type="button">Clear</button></div>
      </div>
      <div class="gallery" id="gallery" aria-label="Artwork gallery"></div>
    </section>
  </main>
  <footer class="pclaf-footer"><div class="pclaf-footer-inner"><div class="pclaf-footer-brand"><a class="pclaf-credit" href="https://www.pclaf.com.ar/" target="_blank" rel="noreferrer"><span>Site developed by</span><img src="https://www.pclaf.com.ar/assets/pclaf-logo.png" alt="PCLAF" /><b>PCLAF</b></a></div><span class="pclaf-footer-links"><a href="https://www.pclaf.com.ar/" target="_blank" rel="noreferrer">PCLAF website ↗</a><a href="https://wa.me/5491135708345" target="_blank" rel="noreferrer">WhatsApp ↗</a></span></div></footer>
`;

const gallery = document.querySelector('#gallery');
const filters = document.querySelector('#filters');
const search = document.querySelector('#search');
const count = document.querySelector('#count');
const selection = document.querySelector('#selection');
const selectionCount = document.querySelector('#selection-count');
const selectedList = document.querySelector('#selected-list');

function renderFilters() {
  const preferredOrder = ['pokemon', 'anime', 'demo', 'digimon', 'chainsaw-man', 'action', 'cars', 'vehicles'];
  const tags = [...new Set(state.artwork.flatMap((item) => item.tags))].sort((a, b) => {
    const ai = preferredOrder.indexOf(a); const bi = preferredOrder.indexOf(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
  filters.innerHTML = tags.length
    ? [['all', 'All'], ...tags.map((tag) => [tag, tag === 'pokemon' ? 'Pokémon' : labelFor(tag)])].map(([value, label]) => `<button class="filter${state.active === value ? ' active' : ''}" data-filter="${escapeHTML(value)}" type="button">${escapeHTML(label)}</button>`).join('')
    : '';
  filters.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => { state.active = button.dataset.filter; render(); }));
}

function renderSelection() {
  selection.hidden = state.selected.size === 0;
  selectionCount.textContent = state.selected.size;
  selectedList.innerHTML = [...state.selected.values()].map((item) => `<span class="selected-item"><strong>${escapeHTML(item.title)}</strong><small>${item.tags.map((tag) => `#${escapeHTML(tag)}`).join(' ')}</small></span>`).join('');
}

function render() {
  renderFilters();
  if (state.loading) {
    count.textContent = 'Loading gallery…';
    gallery.innerHTML = '<p class="empty">Loading published artworks…</p>';
    return;
  }
  if (state.error) {
    count.textContent = 'Gallery unavailable';
    gallery.innerHTML = `<p class="empty error-state">${escapeHTML(state.error)}</p>`;
    renderSelection();
    return;
  }
  const query = state.query.toLowerCase();
  const shown = state.artwork.filter((item) => {
    const matchesFilter = state.active === 'all' || item.tags.includes(state.active);
    const matchesQuery = !query || state.serverSearchQuery === query || `${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });
  count.textContent = `${shown.length} artworks`;
  gallery.innerHTML = shown.map((item) => {
    const key = item.id;
    return `<button class="card${state.selected.has(key) ? ' is-selected' : ''}" data-key="${escapeHTML(key)}" type="button" aria-pressed="${state.selected.has(key)}"><div class="art"><img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" loading="lazy" draggable="false" /><div class="card-info"><strong class="card-title">${escapeHTML(item.title)}</strong><div class="tags">${item.tags.map((tag) => `<span class="tag">#${escapeHTML(tag)}</span>`).join('')}</div></div></div></button>`;
  }).join('') || `<p class="empty">${state.artwork.length ? 'No artworks found. Try another search.' : 'No published artworks yet.'}</p>`;
  renderSelection();
}

async function loadGallery(query = state.query) {
  const requestId = ++state.requestId;
  if (!configured) {
    state.loading = false;
    state.error = 'The gallery is not connected to its production database yet.';
    render();
    return;
  }
  state.loading = true;
  state.error = '';
  render();

  const { data, error } = await supabase.rpc('search_public_artworks', { p_query: query });
  if (requestId !== state.requestId) return;
  let rows = data;
  if (error) {
    // Keep visible-tag search working until the accompanying SQL migration is applied.
    const fallback = await supabase.from('artworks').select('id, title, image_path, tags, created_at').eq('is_public', true).order('created_at', { ascending: false });
    if (requestId !== state.requestId) return;
    if (fallback.error) {
      state.loading = false;
      state.serverSearchQuery = null;
      state.error = 'The gallery could not load published artworks.';
      render();
      return;
    }
    rows = fallback.data;
    state.serverSearchQuery = null;
  } else {
    state.serverSearchQuery = query;
  }
  if (!rows) {
    state.loading = false;
    state.artwork = [];
  } else {
    state.artwork = rows.map((item) => ({
      id: item.id,
      title: item.title,
      tags: Array.isArray(item.tags) ? item.tags : [],
      image: item.image_path ? supabase.storage.from('artworks').getPublicUrl(item.image_path).data.publicUrl : ''
    })).filter((item) => item.title && item.image);
  }
  state.loading = false;
  render();
}

function toggle(card) {
  const item = state.artwork.find((entry) => entry.id === card.dataset.key);
  if (!item) return;
  if (state.selected.has(item.id)) state.selected.delete(item.id); else state.selected.set(item.id, item);
  render();
}

gallery.addEventListener('click', (event) => { const card = event.target.closest('.card'); if (card) toggle(card); });
search.addEventListener('input', () => {
  state.query = search.value.trim().toLowerCase();
  clearTimeout(state.searchTimer);
  state.requestId += 1;
  state.searchTimer = setTimeout(() => loadGallery(state.query), 180);
});
document.querySelector('#clear').addEventListener('click', () => { state.selected.clear(); render(); });
document.querySelector('#copy').addEventListener('click', async (event) => {
  const names = [...state.selected.values()].map((item) => item.title);
  await navigator.clipboard?.writeText(`${names.length} images:\n${names.join('\n')}`);
  event.currentTarget.textContent = 'Copied ✓';
  setTimeout(() => { event.currentTarget.textContent = 'Copy names'; }, 1600);
});

render();
loadGallery();
