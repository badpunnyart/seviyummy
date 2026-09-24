import { createClient } from '@supabase/supabase-js';
import './style.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const configured = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project'));
const supabase = configured ? createClient(supabaseUrl, supabaseKey) : null;
const app = document.querySelector('#app');

const shell = (content) => `
  <div class="grain" aria-hidden="true"></div>
  <div class="orbit orbit-one" aria-hidden="true"></div>
  <div class="orbit orbit-two" aria-hidden="true"></div>
  <section class="frame">${content}</section>
`;

function authView(mode = 'login', message = '') {
  const isLogin = mode === 'login';
  app.innerHTML = shell(`
    <div class="brandline"><span class="dot"></span><span>SEVIYUMMY / PRIVATE STUDIO</span></div>
    <div class="auth-layout">
      <div class="intro-copy">
        <p class="kicker">artist workspace · 001</p>
        <h1>Make room<br /><em>for soft things.</em></h1>
        <p class="lead">A quiet control room for the characters, stickers and tiny universes of seviyummy.</p>
        <div class="stamp"><span>✦</span><span>archive<br />in progress</span></div>
      </div>
      <div class="auth-card">
        <div class="card-top"><span>${isLogin ? 'WELCOME BACK' : 'NEW ACCOUNT'}</span><span class="index">0${isLogin ? 1 : 2} / 02</span></div>
        <h2>${isLogin ? 'Enter the studio.' : 'Create your studio.'}</h2>
        <p class="card-copy">${isLogin ? 'Sign in to keep building your gallery.' : 'Use an email you can access to confirm your account.'}</p>
        ${message ? `<div class="notice" role="status">${message}</div>` : ''}
        <form id="auth-form">
          <label>Email<input id="email" type="email" autocomplete="email" required placeholder="you@example.com" /></label>
          <label>Password<input id="password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" minlength="6" required placeholder="At least 6 characters" /></label>
          <button class="primary" type="submit">${isLogin ? 'Enter studio ↗' : 'Create account ↗'}</button>
        </form>
        <div class="auth-actions">
          <button class="text-button" id="switch-mode" type="button">${isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}</button>
          ${isLogin ? '<button class="text-button" id="reset-password" type="button">Forgot password?</button>' : ''}
        </div>
        ${!configured ? '<p class="setup-note">Connect Supabase in <code>.env.local</code> to activate authentication.</p>' : ''}
      </div>
    </div>
    <footer><span>seviyummy © 2026</span><span>made with small magic</span></footer>
  `);

  document.querySelector('#switch-mode').addEventListener('click', () => authView(isLogin ? 'signup' : 'login'));
  document.querySelector('#auth-form').addEventListener('submit', (event) => submitAuth(event, isLogin));
  document.querySelector('#reset-password')?.addEventListener('click', resetPassword);
}

function workspace(user) {
  app.innerHTML = shell(`
    <div class="brandline"><span class="dot"></span><span>SEVIYUMMY / PRIVATE STUDIO</span><button class="logout" id="logout">Log out ↗</button></div>
    <div class="workspace">
      <p class="kicker">artist workspace · 002</p>
      <h1>Welcome,<br /><em>${user.email.split('@')[0]}.</em></h1>
      <div class="workspace-grid">
        <article><span class="tile-index">01 / GALLERY</span><h2>Your archive</h2><p>The new gallery tools will live here: images, tags and collections.</p></article>
        <article class="acid"><span class="tile-index">02 / NEXT</span><h2>Small steps.</h2><p>Supabase is connected. The workspace is ready for the next layer.</p></article>
      </div>
    </div>
    <footer><span>${user.email}</span><span>seviyummy studio</span></footer>
  `);
  document.querySelector('#logout').addEventListener('click', async () => {
    await supabase?.auth.signOut();
    authView();
  });
}

async function submitAuth(event, isLogin) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button');
  if (!configured) return authView(isLogin ? 'login' : 'signup', 'Add your Supabase keys in .env.local first.');
  button.disabled = true;
  button.textContent = 'Checking…';
  const email = form.querySelector('#email').value.trim();
  const password = form.querySelector('#password').value;
  const result = isLogin
    ? await supabase.auth.signInWithPassword({ email, password })
    : await supabase.auth.signUp({ email, password });
  if (result.error) {
    button.disabled = false;
    button.textContent = isLogin ? 'Enter studio ↗' : 'Create account ↗';
    return authView(isLogin ? 'login' : 'signup', result.error.message);
  }
  if (!isLogin && !result.data.session) return authView('login', 'Check your email to confirm the account, then sign in.');
  workspace(result.data.user);
}

async function resetPassword() {
  if (!configured) return authView('login', 'Add your Supabase keys in .env.local first.');
  const email = document.querySelector('#email').value.trim();
  if (!email) return authView('login', 'Enter your email first, then request a reset.');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  authView('login', error ? error.message : 'Password reset instructions sent.');
}

authView();
if (supabase) {
  supabase.auth.getSession().then(({ data }) => { if (data.session) workspace(data.session.user); });
  supabase.auth.onAuthStateChange((_event, session) => { if (session) workspace(session.user); });
}
