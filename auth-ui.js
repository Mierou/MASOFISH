(function () {
  'use strict';

  const auth = window.MASOFISH_AUTH || {};
  const header = document.querySelector('header');
  if (!header) return;

  const style = document.createElement('style');
  style.textContent = `
    .masofish-header-controls {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: .45rem;
      margin-left: auto;
      flex: 0 0 auto;
    }
    .masofish-account-wrap {
      position: relative;
      flex: 0 0 auto;
    }
    .masofish-account-button {
      min-width: 42px;
      height: 42px;
      padding: 0 10px;
      border: 1px solid #c3c6d1;
      border-radius: 999px;
      background: #fff;
      color: #001e40;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      font: 700 12px/1 Inter, Arial, sans-serif;
      box-shadow: 0 2px 8px rgba(0, 30, 64, .06);
    }
    .masofish-account-button:hover { background: #f1f4f6; }
    .masofish-account-avatar {
      width: 26px;
      height: 26px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: #003366;
      color: #fff;
      font-size: 12px;
      flex: 0 0 auto;
    }
    .masofish-account-name {
      max-width: 105px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .masofish-account-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9996;
      background: rgba(0, 19, 43, .46);
      backdrop-filter: blur(2px);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity .2s ease, visibility .2s ease;
    }
    .masofish-account-backdrop.is-open {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }
    .masofish-account-panel {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 9997;
      width: min(370px, 100vw);
      height: 100dvh;
      display: flex;
      flex-direction: column;
      background: #f7fafc;
      color: #181c1e;
      border-left: 1px solid #c3c6d1;
      box-shadow: -22px 0 54px rgba(0, 30, 64, .22);
      transform: translateX(105%);
      visibility: hidden;
      transition: transform .24s ease, visibility .24s ease;
    }
    .masofish-account-panel.is-open {
      transform: translateX(0);
      visibility: visible;
    }
    .masofish-account-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 17px 18px;
      background: #fff;
      border-bottom: 1px solid #c3c6d1;
    }
    .masofish-account-panel-heading {
      margin: 0;
      color: #001e40;
      font: 900 21px/1.2 Inter, Arial, sans-serif;
    }
    .masofish-account-close {
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: #f1f4f6;
      color: #001e40;
      cursor: pointer;
      font-size: 22px;
    }
    .masofish-account-profile {
      padding: 22px 18px;
      background: #003366;
      color: #fff;
    }
    .masofish-account-profile-row {
      display: grid;
      grid-template-columns: 58px 1fr;
      align-items: center;
      gap: 13px;
    }
    .masofish-account-large-avatar {
      width: 58px;
      height: 58px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: #76f3ea;
      color: #003366;
      font: 900 22px/1 Inter, Arial, sans-serif;
    }
    .masofish-account-profile strong {
      display: block;
      color: #fff;
      font: 800 16px/1.35 Inter, Arial, sans-serif;
    }
    .masofish-account-email {
      margin: 4px 0 0;
      color: rgba(255, 255, 255, .76);
      font: 400 12px/1.4 Inter, Arial, sans-serif;
      overflow-wrap: anywhere;
    }
    .masofish-account-role {
      display: inline-flex;
      align-items: center;
      margin-top: 9px;
      padding: 5px 9px;
      border-radius: 999px;
      background: rgba(255, 255, 255, .14);
      color: #fff;
      font: 800 10px/1 Inter, Arial, sans-serif;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .masofish-account-panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    .masofish-account-section-label {
      margin: 2px 4px 9px;
      color: #737780;
      font: 800 10px/1.2 Inter, Arial, sans-serif;
      text-transform: uppercase;
      letter-spacing: .12em;
    }
    .masofish-account-action {
      width: 100%;
      min-height: 48px;
      border: 0;
      border-radius: 11px;
      padding: 12px 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      background: #fff;
      color: #001e40;
      border: 1px solid #c3c6d1;
      font: 800 13px/1.2 Inter, Arial, sans-serif;
      text-decoration: none;
      text-align: left;
      margin-bottom: 9px;
    }
    .masofish-account-action[hidden] { display: none; }
    .masofish-account-action:hover { background: #f1f4f6; }
    .masofish-account-action-icon {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      display: grid;
      place-items: center;
      background: #f1f4f6;
      color: #006a65;
      flex: 0 0 auto;
    }
    .masofish-account-signout {
      color: #93000a;
      border-color: #ffb4ab;
      background: #fff7f6;
    }
    .masofish-account-signout .masofish-account-action-icon {
      color: #93000a;
      background: #ffdad6;
    }
    .masofish-account-panel-footer {
      padding: 13px 16px;
      background: #fff;
      border-top: 1px solid #c3c6d1;
      color: #737780;
      font: 400 11px/1.45 Inter, Arial, sans-serif;
    }
    body.masofish-account-panel-open { overflow: hidden; }
    @media (max-width: 520px) {
      .masofish-account-name { display: none; }
      .masofish-account-button { padding: 0 7px; }
      .masofish-account-panel { width: min(340px, 92vw); }
    }
    @media (prefers-reduced-motion: reduce) {
      .masofish-account-panel,
      .masofish-account-backdrop { transition: none; }
    }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'masofish-account-wrap';
  wrap.innerHTML = `
    <button class="masofish-account-button" type="button" aria-expanded="false" aria-controls="masofish-account-panel" aria-label="Open user panel">
      <span class="masofish-account-avatar" data-auth-avatar>U</span>
      <span class="masofish-account-name" data-auth-name>Account</span>
    </button>
  `;

  const backdrop = document.createElement('div');
  backdrop.className = 'masofish-account-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');

  const panel = document.createElement('aside');
  panel.id = 'masofish-account-panel';
  panel.className = 'masofish-account-panel';
  panel.setAttribute('aria-label', 'User panel');
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <div class="masofish-account-panel-header">
      <div>
        <p style="margin:0;color:#006a65;font:800 10px/1.2 Inter,Arial,sans-serif;text-transform:uppercase;letter-spacing:.12em;">MASOFISH</p>
        <h2 class="masofish-account-panel-heading">User Panel</h2>
      </div>
      <button class="masofish-account-close" type="button" data-auth-close aria-label="Close user panel">×</button>
    </div>

    <div class="masofish-account-profile">
      <div class="masofish-account-profile-row">
        <span class="masofish-account-large-avatar" data-auth-large-avatar>U</span>
        <div>
          <strong data-auth-menu-name>MASOFISH User</strong>
          <p class="masofish-account-email" data-auth-email></p>
          <span class="masofish-account-role" data-auth-role>User account</span>
        </div>
      </div>
    </div>

    <div class="masofish-account-panel-body">
      <p class="masofish-account-section-label">Account actions</p>
      <a class="masofish-account-action" href="admin.html" data-auth-admin hidden>
        <span class="masofish-account-action-icon material-symbols-outlined">admin_panel_settings</span>
        <span>Administrator Panel</span>
      </a>
      <a class="masofish-account-action" href="catch-log.html">
        <span class="masofish-account-action-icon material-symbols-outlined">phishing</span>
        <span>My Catch Log</span>
      </a>
      <a class="masofish-account-action" href="forum.html">
        <span class="masofish-account-action-icon material-symbols-outlined">forum</span>
        <span>Community Discussions</span>
      </a>
      <button class="masofish-account-action masofish-account-signout" type="button" data-auth-signout>
        <span class="masofish-account-action-icon material-symbols-outlined">logout</span>
        <span>Sign out</span>
      </button>
    </div>

    <div class="masofish-account-panel-footer">
      The user panel remains fixed to the right side and does not change page layout.
    </div>
  `;

  // Keep all right-side controls together so the user button remains at the edge.
  const directChildren = Array.from(header.children);
  const lastChild = directChildren.at(-1);
  let controls = null;

  if (lastChild?.classList?.contains('masofish-header-controls')) {
    controls = lastChild;
  } else if (
    lastChild &&
    lastChild !== header.firstElementChild &&
    lastChild.matches?.('div.flex, div[class*="items-center"]')
  ) {
    controls = lastChild;
    controls.classList.add('masofish-header-controls');
  } else {
    controls = document.createElement('div');
    controls.className = 'masofish-header-controls';

    if (
      lastChild &&
      lastChild !== header.firstElementChild &&
      lastChild.matches?.('button, a')
    ) {
      header.insertBefore(controls, lastChild);
      controls.appendChild(lastChild);
    } else {
      header.appendChild(controls);
    }
  }

  controls.appendChild(wrap);
  document.body.append(backdrop, panel);

  const button = wrap.querySelector('.masofish-account-button');
  const closeButton = panel.querySelector('[data-auth-close]');
  const signOut = panel.querySelector('[data-auth-signout]');
  const adminLink = panel.querySelector('[data-auth-admin]');

  function openPanel() {
    window.MASOFISH_NOTIFICATIONS?.close?.();
    panel.classList.add('is-open');
    backdrop.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    backdrop.setAttribute('aria-hidden', 'false');
    button.setAttribute('aria-expanded', 'true');
    document.body.classList.add('masofish-account-panel-open');
    closeButton.focus({ preventScroll: true });
  }

  function closePanel() {
    panel.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    backdrop.setAttribute('aria-hidden', 'true');
    button.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('masofish-account-panel-open');
  }

  function togglePanel() {
    panel.classList.contains('is-open') ? closePanel() : openPanel();
  }

  button.addEventListener('click', event => {
    event.stopPropagation();
    togglePanel();
  });
  closeButton.addEventListener('click', closePanel);
  backdrop.addEventListener('click', closePanel);
  panel.querySelectorAll('a').forEach(link => link.addEventListener('click', closePanel));

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) {
      closePanel();
      button.focus({ preventScroll: true });
    }
  });

  function displayUser(name, email, mode, role = 'user') {
    const cleanName = name || (mode === 'prototype' ? 'Guest User' : 'MASOFISH User');
    const initial = cleanName.trim().charAt(0).toUpperCase() || 'U';
    const shortName = mode === 'prototype' ? 'Guest' : cleanName.split(' ')[0];

    wrap.querySelector('[data-auth-avatar]').textContent = initial;
    wrap.querySelector('[data-auth-name]').textContent = shortName;
    panel.querySelector('[data-auth-large-avatar]').textContent = initial;
    panel.querySelector('[data-auth-menu-name]').textContent = cleanName;
    panel.querySelector('[data-auth-email]').textContent =
      mode === 'prototype'
        ? 'Signed in as guest.'
        : (email || 'Signed in with Supabase');
    panel.querySelector('[data-auth-role]').textContent =
      role === 'admin' ? 'System Administrator' : 'User account';
  }

  async function initialize() {
    const ready = await window.masofishAuthReady;
    if (!ready) return;

    if (ready.mode === 'prototype') {
      displayUser('Guest Administrator', '', 'prototype', 'admin');
      adminLink.hidden = false;
      signOut.querySelector('span:last-child').textContent = 'Exit guest mode';
      signOut.addEventListener('click', () => {
        localStorage.removeItem('masofishPrototypeMode');
        location.href = 'auth.html';
      });
      return;
    }

    if (ready.mode === 'disabled') {
      displayUser('Authentication Disabled', '', 'prototype', 'user');
      signOut.hidden = true;
      return;
    }

    const user = ready.session?.user;
    const fullName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      'MASOFISH User';

    let role = 'user';

    try {
      const { data: profile, error: profileError } = await auth.client
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.warn('Could not read account role:', profileError);
      } else {
        role = profile?.role || 'user';
      }
    } catch (roleError) {
      console.warn('Administrator menu check failed:', roleError);
    }

    displayUser(fullName, user?.email, 'supabase', role);

    if (role === 'admin') {
      adminLink.hidden = false;
      wrap.querySelector('[data-auth-name]').textContent = 'Admin';
    }

    signOut.addEventListener('click', async () => {
      signOut.disabled = true;
      signOut.querySelector('span:last-child').textContent = 'Signing out…';
      const { error } = await auth.client.auth.signOut();
      if (error) {
        console.error(error);
        signOut.disabled = false;
        signOut.querySelector('span:last-child').textContent = 'Try signing out again';
      }
    });
  }

  function loadNotificationCenter() {
    if (window.MASOFISH_NOTIFICATION_CENTER_LOADED) return;
    if (document.querySelector('script[data-masofish-notification-loader]')) return;

    const script = document.createElement('script');
    script.src = 'notification-center.js';
    script.defer = true;
    script.dataset.masofishNotificationLoader = 'true';
    document.body.appendChild(script);
  }

  window.MASOFISH_ACCOUNT_PANEL = {
    open: openPanel,
    close: closePanel,
    toggle: togglePanel
  };

  initialize()
    .then(loadNotificationCenter)
    .catch(error => console.error('User panel failed:', error));
})();
