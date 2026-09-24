import { createClient } from '@supabase/supabase-js';
import './gallery.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const configured = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project'));
const supabase = configured ? createClient(supabaseUrl, supabaseKey) : null;

const state = { query: '', active: 'all', selected: new Map(), artwork: [], loading: true, error: '' };
const labelFor = (tag) => tag.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));

document.querySelector('#app').innerHTML = `
  <div class="gallery-shell">
    <header class="gallery-header">
      <div><span class="eyebrow">COLLECTION / SEVIYUMMY</span><h1>seviyummy <em>gallery</em></h1><p>Select the images you need, then click <strong>Copy names</strong> to share the exact list and quantity.</p></div>
      <a class="studio-link" href="./admin.html">Open studio ↗</a>
    </header>
    <section class="tools" aria-label="Gallery controls">
      <label class="search"><span>Search the gallery</span><input id="search" type="search" placeholder="Name or tag…" autocomplete="off" /></label>
      <div class="filters" id="filters"></div>
      <div class="results"><span id="count">Loading gallery…</span><span>select cards to build your list</span></div>
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
  const tags = [...new Set(state.artwork.flatMap((item) => item.tags))].sort();
  filters.innerHTML = tags.length
    ? [['all', 'All'], ...tags.map((tag) => [tag, labelFor(tag)])].map(([value, label]) => `<button class="filter${state.active === value ? ' active' : ''}" data-filter="${escapeHTML(value)}" type="button">${escapeHTML(label)}</button>`).join('')
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
    const matchesQuery = !query || `${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });
  count.textContent = `${shown.length} artworks`;
  gallery.innerHTML = shown.map((item) => {
    const key = item.id;
    return `<article class="art-card${state.selected.has(key) ? ' selected' : ''}" data-key="${escapeHTML(key)}" tabindex="0" role="button" aria-pressed="${state.selected.has(key)}"><div class="art-image"><img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" loading="lazy" draggable="false" /><span class="watermark">SEVIYUMMY</span></div><div class="art-info"><strong>${escapeHTML(item.title)}</strong><div>${item.tags.map((tag) => `<span>#${escapeHTML(tag)}</span>`).join('')}</div></div></article>`;
  }).join('') || `<p class="empty">${state.artwork.length ? 'No artworks found. Try another search.' : 'No published artworks yet.'}</p>`;
  renderSelection();
}

async function loadGallery() {
  if (!configured) {
    state.loading = false;
    state.error = 'The gallery is not connected to its production database yet.';
    render();
    return;
  }
  const { data, error } = await supabase.from('artworks').select('id, title, image_url, image_path, tags').eq('is_public', true).order('created_at', { ascending: false });
  if (error) {
    state.loading = false;
    state.error = 'The gallery could not load published artworks.';
    render();
    return;
  }
  state.artwork = (data || []).map((item) => ({
    id: item.id,
    title: item.title,
    tags: Array.isArray(item.tags) ? item.tags : [],
    image: item.image_url || (item.image_path ? supabase.storage.from('artworks').getPublicUrl(item.image_path).data.publicUrl : '')
  })).filter((item) => item.title && item.image);
  state.loading = false;
  render();
}

function toggle(card) {
  const item = state.artwork.find((entry) => entry.id === card.dataset.key);
  if (!item) return;
  if (state.selected.has(item.id)) state.selected.delete(item.id); else state.selected.set(item.id, item);
  render();
}

gallery.addEventListener('click', (event) => { const card = event.target.closest('.art-card'); if (card) toggle(card); });
gallery.addEventListener('keydown', (event) => { const card = event.target.closest('.art-card'); if (card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); toggle(card); } });
search.addEventListener('input', () => { state.query = search.value.trim(); render(); });
document.querySelector('#clear').addEventListener('click', () => { state.selected.clear(); render(); });
document.querySelector('#copy').addEventListener('click', async (event) => {
  const names = [...state.selected.values()].map((item) => item.title);
  await navigator.clipboard?.writeText(`${names.length} images:\n${names.join('\n')}`);
  event.currentTarget.textContent = 'Copied ✓';
  setTimeout(() => { event.currentTarget.textContent = 'Copy names'; }, 1600);
});

render();
loadGallery();
