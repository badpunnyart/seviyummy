import { createClient } from '@supabase/supabase-js';
import './style.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const configured = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project'));
const supabase = configured ? createClient(supabaseUrl, supabaseKey) : null;
const state = { user: null, works: [], query: '', editing: null, selectedFile: null, loading: false };
const app = document.querySelector('#app');
const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
const normalizeTags = (value) => [...new Set(String(value || '').split(',').map((tag) => tag.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-')).filter(Boolean))];
const formatTags = (tags = []) => tags.join(', ');
const safeFileName = (name) => name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');

const shell = (content) => `<div class="grain" aria-hidden="true"></div><section class="frame">${content}</section>`;

function loginView(message = '') {
  app.innerHTML = shell(`
    <div class="brandline"><a class="brand" href="./">seviyummy</a><span>PRIVATE STUDIO</span></div>
    <div class="auth-layout">
      <div class="intro-copy"><p class="kicker">artist workspace · private</p><h1>Keep the<br /><em>soft archive.</em></h1><p class="lead">Upload real artwork, organize it with tags and publish it to the seviyummy gallery.</p></div>
      <div class="auth-card"><div class="card-top"><span>STUDIO ACCESS</span><span>01 / 01</span></div><h2>Enter the studio.</h2><p class="card-copy">Use the administrator account created in Supabase Auth.</p>${message ? `<div class="notice" role="status">${escapeHTML(message)}</div>` : ''}
        <form id="login-form"><label>Email<input id="email" type="email" autocomplete="username" required placeholder="artist@example.com" /></label><label>Password<input id="password" type="password" autocomplete="current-password" required placeholder="Your password" /></label><button class="primary" type="submit">Sign in ↗</button></form>
        <button class="text-button reset-button" id="reset" type="button">Forgot password?</button>
        ${!configured ? '<p class="setup-note">Supabase is not connected. Add the production URL and publishable key as environment variables before signing in.</p>' : ''}
      </div>
    </div><footer><span>seviyummy studio</span><a href="./">Back to gallery ↗</a></footer>`);
  document.querySelector('#login-form').addEventListener('submit', signIn);
  document.querySelector('#reset').addEventListener('click', resetPassword);
}

function studioView() {
  app.innerHTML = shell(`
    <div class="brandline"><a class="brand" href="./">seviyummy</a><span>PRIVATE STUDIO</span><nav><a href="./">Back to gallery ↗</a><button class="logout" id="logout" type="button">Sign out</button></nav></div>
    <main class="studio"><header class="studio-heading"><div><p class="kicker">artist workspace · archive</p><h1>Shape the<br /><em>gallery.</em></h1><p class="lead">Upload a finished artwork, add its visible and internal tags, then publish it when it is ready.</p></div><div class="account-chip">${escapeHTML(state.user.email)}</div></header>
      <section class="upload-panel"><div class="section-label">${state.editing ? 'EDIT ARTWORK' : 'NEW ARTWORK'} <span>${state.editing ? '02 / 02' : '01 / 02'}</span></div><form id="artwork-form"><label class="dropzone" id="dropzone"><input id="file" type="file" accept="image/png,image/jpeg,image/webp" /><span id="drop-copy">${state.editing ? 'Choose a replacement image or keep the current one' : 'Drop an image here or choose a file'}<small>PNG, JPG or WEBP · recommended maximum 5 MB</small></span><img id="preview" alt="Artwork preview" hidden /></label><div class="form-grid"><label>Artwork name<input id="title" required placeholder="e.g. Pikachu witch" /></label><label>Visible tags<input id="tags" placeholder="pokemon, halloween" /></label><label>Internal tags<input id="hidden-tags" placeholder="client, seasonal, commission" /><small>Not shown publicly; useful for internal search.</small></label><label class="check-row"><input id="is-public" type="checkbox" checked /> Publish to the public gallery</label></div><div class="form-actions"><button class="primary" type="submit">${state.editing ? 'Save changes ↗' : 'Publish artwork ↗'}</button>${state.editing ? '<button class="secondary" id="cancel-edit" type="button">Cancel</button>' : ''}</div></form><p id="form-message" class="form-message" role="status"></p></section>
      <section class="works-section"><div class="works-heading"><div><p class="kicker">archive / published work</p><h2>Your artworks <span id="total">0</span></h2></div><input id="works-search" class="works-search" type="search" placeholder="Search by name or tag…" autocomplete="off" /></div><div id="recent-tags" class="recent-tags"></div><div id="works" class="works-grid"></div></section>
    </main><footer><span>seviyummy studio</span><span>Production content only</span></footer>`);
  document.querySelector('#logout').addEventListener('click', signOut);
  document.querySelector('#artwork-form').addEventListener('submit', saveArtwork);
  document.querySelector('#file').addEventListener('change', handleFile);
  document.querySelector('#works-search').addEventListener('input', (event) => { state.query = event.target.value.trim().toLowerCase(); renderWorks(); });
  document.querySelector('#cancel-edit')?.addEventListener('click', () => { state.editing = null; state.selectedFile = null; studioView(); renderWorks(); });
  renderFormValues();
  loadWorks();
}

function renderFormValues() {
  if (!state.editing) return;
  document.querySelector('#title').value = state.editing.title || '';
  document.querySelector('#tags').value = formatTags(state.editing.tags);
  document.querySelector('#hidden-tags').value = formatTags(state.editing.hidden_tags);
  document.querySelector('#is-public').checked = state.editing.is_public !== false;
  if (state.editing.image_url) { const preview = document.querySelector('#preview'); preview.src = state.editing.image_url; preview.hidden = false; document.querySelector('#drop-copy').hidden = true; }
}

async function signIn(event) {
  event.preventDefault();
  if (!configured) return loginView('Connect Supabase before trying to sign in.');
  const button = event.currentTarget.querySelector('button'); button.disabled = true; button.textContent = 'Checking…';
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return loginView(error.message);
  state.user = data.user; studioView();
}

async function resetPassword() {
  if (!configured) return loginView('Connect Supabase before requesting a password reset.');
  const email = document.querySelector('#email').value.trim();
  if (!email) return loginView('Enter your email first, then request a reset.');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
  loginView(error ? error.message : 'Password reset instructions sent.');
}

async function signOut() { await supabase?.auth.signOut(); state.user = null; state.works = []; loginView(); }

function handleFile(event) {
  state.selectedFile = event.target.files[0] || null;
  if (!state.selectedFile) return;
  const preview = document.querySelector('#preview'); preview.src = URL.createObjectURL(state.selectedFile); preview.hidden = false; document.querySelector('#drop-copy').hidden = true;
}

async function saveArtwork(event) {
  event.preventDefault();
  const form = event.currentTarget; const button = form.querySelector('button[type="submit"]'); const message = document.querySelector('#form-message');
  if (!state.user || !configured) return;
  const title = document.querySelector('#title').value.trim(); const tags = normalizeTags(document.querySelector('#tags').value); const hiddenTags = normalizeTags(document.querySelector('#hidden-tags').value); const isPublic = document.querySelector('#is-public').checked;
  button.disabled = true; button.textContent = state.editing ? 'Saving…' : 'Uploading…'; message.textContent = '';
  try {
    let imagePath = state.editing?.image_path || '';
    if (state.selectedFile) {
      if (state.selectedFile.size > 5 * 1024 * 1024) throw new Error('The image must be 5 MB or smaller.');
      imagePath = `${state.user.id}/${crypto.randomUUID()}-${safeFileName(state.selectedFile.name)}`;
      const { error } = await supabase.storage.from('artworks').upload(imagePath, state.selectedFile, { cacheControl: '31536000', contentType: state.selectedFile.type, upsert: false });
      if (error) throw error;
    }
    if (!imagePath) throw new Error('Choose an image before saving.');
    const payload = { title, tags, hidden_tags: hiddenTags, image_path: imagePath, is_public: isPublic, updated_at: new Date().toISOString() };
    const result = state.editing
      ? await supabase.from('artworks').update(payload).eq('id', state.editing.id).eq('owner_id', state.user.id).select().single()
      : await supabase.from('artworks').insert({ ...payload, owner_id: state.user.id }).select().single();
    if (result.error) throw result.error;
    if (state.editing?.image_path && imagePath !== state.editing.image_path) await supabase.storage.from('artworks').remove([state.editing.image_path]);
    state.editing = null; state.selectedFile = null; studioView();
  } catch (error) {
    message.textContent = error.message || 'Could not save the artwork.'; button.disabled = false; button.textContent = state.editing ? 'Save changes ↗' : 'Publish artwork ↗';
  }
}

async function loadWorks() {
  if (!supabase || !state.user) return;
  const { data, error } = await supabase.from('artworks').select('id, title, image_path, tags, hidden_tags, is_public, created_at').eq('owner_id', state.user.id).order('created_at', { ascending: false });
  if (error) { document.querySelector('#works').innerHTML = `<p class="form-message">${escapeHTML(error.message)}</p>`; return; }
  state.works = (data || []).map((item) => ({ ...item, image_url: supabase.storage.from('artworks').getPublicUrl(item.image_path).data.publicUrl }));
  renderWorks();
}

function renderWorks() {
  const root = document.querySelector('#works'); if (!root) return;
  const query = state.query; const shown = state.works.filter((item) => !query || `${item.title} ${(item.tags || []).join(' ')} ${(item.hidden_tags || []).join(' ')}`.toLowerCase().includes(query));
  document.querySelector('#total').textContent = state.works.length;
  const tags = [...new Set(state.works.flatMap((item) => [...(item.tags || []), ...(item.hidden_tags || [])]))];
  document.querySelector('#recent-tags').innerHTML = tags.slice(0, 10).map((tag) => `<button type="button" data-tag="${escapeHTML(tag)}">#${escapeHTML(tag)}</button>`).join('');
  document.querySelectorAll('#recent-tags button').forEach((button) => button.addEventListener('click', () => { document.querySelector('#works-search').value = button.dataset.tag; state.query = button.dataset.tag; renderWorks(); }));
  root.innerHTML = shown.map((item) => `<article class="work-card"><div class="work-image"><img src="${escapeHTML(item.image_url)}" alt="${escapeHTML(item.title)}" loading="lazy" /><span class="status ${item.is_public ? 'published' : ''}">${item.is_public ? 'PUBLIC' : 'HIDDEN'}</span></div><div class="work-body"><h3>${escapeHTML(item.title)}</h3><p>${(item.tags || []).map((tag) => `<span>#${escapeHTML(tag)}</span>`).join('') || 'No visible tags'}</p><div class="work-actions"><button type="button" data-edit="${escapeHTML(item.id)}">Edit</button><button class="danger-button" type="button" data-delete="${escapeHTML(item.id)}">Delete</button></div></div></article>`).join('') || '<p class="empty-work">No artworks match this search.</p>';
  root.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => { state.editing = state.works.find((item) => item.id === button.dataset.edit); state.selectedFile = null; studioView(); }));
  root.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deleteArtwork(button.dataset.delete)));
}

async function deleteArtwork(id) {
  const item = state.works.find((entry) => entry.id === id); if (!item || !window.confirm(`Delete “${item.title}”?`)) return;
  const { error } = await supabase.from('artworks').delete().eq('id', id).eq('owner_id', state.user.id);
  if (error) return window.alert(error.message);
  await supabase.storage.from('artworks').remove([item.image_path]); await loadWorks();
}

loginView();
if (supabase) supabase.auth.getSession().then(({ data }) => { if (data.session) { state.user = data.session.user; studioView(); } });
