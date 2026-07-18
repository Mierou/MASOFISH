(function () {
  'use strict';

  if (window.MASOFISH_NOTIFICATION_CENTER_LOADED) return;
  window.MASOFISH_NOTIFICATION_CENTER_LOADED = true;

  const FORUM_STORAGE_KEY = 'masofishPrototypeForumV1';
  const SAFETY_STORAGE_KEY = 'masofishPrototypeSafetyAnnouncements';
  const MAX_READ_IDS = 500;

  const state = {
    ready: null,
    mode: 'loading',
    client: null,
    user: null,
    userId: 'guest',
    role: 'user',
    items: [],
    readIds: new Set(),
    panelOpen: false
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[character]);
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function roleStorageKey() {
    return `masofishNotificationRead:${state.userId}`;
  }

  function browserStorageKey() {
    return `masofishBrowserNotified:${state.userId}`;
  }

  function loadReadIds() {
    const values = readJson(roleStorageKey(), []);
    state.readIds = new Set(Array.isArray(values) ? values : []);
  }

  function saveReadIds() {
    const values = Array.from(state.readIds).slice(-MAX_READ_IDS);
    localStorage.setItem(roleStorageKey(), JSON.stringify(values));
  }

  function markRead(id) {
    state.readIds.add(id);
    saveReadIds();
    render();
  }

  function markAllRead() {
    state.items.forEach(item => state.readIds.add(item.id));
    saveReadIds();
    render();
  }

  function relativeTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  }

  function iconFor(item) {
    if (item.kind === 'comment') return 'forum';
    if (item.kind === 'like') return 'favorite';
    if (item.severity === 'critical') return 'emergency';
    if (item.severity === 'warning') return 'warning';
    if (item.kind === 'safety') return 'cloud_alert';
    if (item.kind === 'admin') return 'admin_panel_settings';
    return 'notifications';
  }

  function itemClass(item) {
    if (item.severity === 'critical') return 'masofish-notification-critical';
    if (item.severity === 'warning') return 'masofish-notification-warning';
    if (item.kind === 'comment' || item.kind === 'like') return 'masofish-notification-community';
    return 'masofish-notification-info';
  }

  function activeSafety(item) {
    const now = Date.now();
    const starts = item.starts_at ? new Date(item.starts_at).getTime() : 0;
    const expires = item.expires_at ? new Date(item.expires_at).getTime() : Number.POSITIVE_INFINITY;
    return item.status !== 'draft' &&
      item.status !== 'cancelled' &&
      starts <= now &&
      expires >= now;
  }

  function prototypeNotifications() {
    const notifications = [];
    const safetyItems = readJson(SAFETY_STORAGE_KEY, []);
    const forum = readJson(FORUM_STORAGE_KEY, {
      posts: [],
      comments: [],
      likes: []
    });

    (Array.isArray(safetyItems) ? safetyItems : [])
      .filter(activeSafety)
      .forEach(item => {
        notifications.push({
          id: `safety:${item.id}`,
          kind: 'safety',
          severity: item.severity || 'advisory',
          title: item.title || 'Sea safety announcement',
          message: item.message || '',
          createdAt: item.created_at || item.starts_at || new Date().toISOString(),
          href: 'announcements.html#sea-safety-center'
        });
      });

    const posts = (forum.posts || []).filter(post => post.user_id === state.userId);
    const postMap = new Map(posts.map(post => [post.id, post]));

    (forum.comments || [])
      .filter(comment => postMap.has(comment.post_id) && comment.user_id !== state.userId)
      .forEach(comment => {
        const post = postMap.get(comment.post_id);
        notifications.push({
          id: `comment:${comment.id}`,
          kind: 'comment',
          title: `${comment.author_name || 'Someone'} commented on your discussion`,
          message: comment.content || post.title,
          createdAt: comment.created_at,
          href: `forum.html?post=${encodeURIComponent(comment.post_id)}`
        });
      });

    (forum.likes || [])
      .filter(like => postMap.has(like.post_id) && like.user_id !== state.userId)
      .forEach(like => {
        const post = postMap.get(like.post_id);
        notifications.push({
          id: `like:${like.post_id}:${like.user_id}`,
          kind: 'like',
          title: 'Someone appreciated your discussion',
          message: post.title,
          createdAt: like.created_at || post.created_at,
          href: `forum.html?post=${encodeURIComponent(like.post_id)}`
        });
      });

    notifications.push({
      id: 'admin:prototype-ready',
      kind: 'admin',
      title: 'Prototype administrator mode is active',
      message: 'Connect Supabase to use account-based notifications in production.',
      createdAt: new Date().toISOString(),
      href: 'admin.html'
    });

    return notifications;
  }

  async function fetchSafetyNotifications() {
    const { data, error } = await state.client
      .from('safety_announcements')
      .select('id,title,message,severity,area,starts_at,expires_at,status,created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.warn('Safety notifications unavailable:', error.message || error);
      return [];
    }

    return (data || [])
      .filter(activeSafety)
      .map(item => ({
        id: `safety:${item.id}`,
        kind: 'safety',
        severity: item.severity || 'advisory',
        title: item.title || 'Sea safety announcement',
        message: [item.message, item.area ? `Area: ${item.area}` : ''].filter(Boolean).join(' '),
        createdAt: item.created_at || item.starts_at,
        href: 'announcements.html#sea-safety-center'
      }));
  }

  async function fetchForumNotifications() {
    const { data: posts, error: postsError } = await state.client
      .from('forum_posts')
      .select('id,title,created_at')
      .eq('user_id', state.userId)
      .order('created_at', { ascending: false })
      .limit(60);

    if (postsError) {
      console.warn('Forum notifications unavailable:', postsError.message || postsError);
      return [];
    }

    if (!posts?.length) return [];

    const postIds = posts.map(post => post.id);
    const postMap = new Map(posts.map(post => [post.id, post]));

    const [commentsResult, likesResult] = await Promise.all([
      state.client
        .from('forum_comments')
        .select('id,post_id,user_id,author_name,content,created_at')
        .in('post_id', postIds)
        .neq('user_id', state.userId)
        .order('created_at', { ascending: false })
        .limit(60),
      state.client
        .from('forum_likes')
        .select('post_id,user_id,created_at')
        .in('post_id', postIds)
        .neq('user_id', state.userId)
        .order('created_at', { ascending: false })
        .limit(60)
    ]);

    if (commentsResult.error) {
      console.warn('Comment notifications unavailable:', commentsResult.error.message || commentsResult.error);
    }
    if (likesResult.error) {
      console.warn('Like notifications unavailable:', likesResult.error.message || likesResult.error);
    }

    const comments = (commentsResult.data || []).map(comment => {
      const post = postMap.get(comment.post_id);
      return {
        id: `comment:${comment.id}`,
        kind: 'comment',
        title: `${comment.author_name || 'Someone'} commented on your discussion`,
        message: comment.content || post?.title || '',
        createdAt: comment.created_at,
        href: `forum.html?post=${encodeURIComponent(comment.post_id)}`
      };
    });

    const likes = (likesResult.data || []).map(like => {
      const post = postMap.get(like.post_id);
      return {
        id: `like:${like.post_id}:${like.user_id}`,
        kind: 'like',
        title: 'Someone appreciated your discussion',
        message: post?.title || 'Open your community discussion.',
        createdAt: like.created_at || post?.created_at,
        href: `forum.html?post=${encodeURIComponent(like.post_id)}`
      };
    });

    return [...comments, ...likes];
  }

  async function loadNotifications() {
    if (state.mode === 'prototype') {
      state.items = prototypeNotifications();
    } else {
      const results = await Promise.allSettled([
        fetchSafetyNotifications(),
        fetchForumNotifications()
      ]);

      state.items = results.flatMap(result =>
        result.status === 'fulfilled' ? result.value : []
      );

      if (state.role === 'admin') {
        state.items.push({
          id: 'admin:account-active',
          kind: 'admin',
          title: 'Administrator account active',
          message: 'Administrator tools are available from the account menu.',
          createdAt: state.user?.last_sign_in_at || new Date().toISOString(),
          href: 'admin.html'
        });
      }
    }

    state.items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    render();
    sendBrowserAlerts();
  }

  function unreadCount() {
    return state.items.filter(item => !state.readIds.has(item.id)).length;
  }

  function createButton() {
    const header = document.querySelector('header');
    if (!header) return null;

    const existing = Array.from(header.querySelectorAll('button')).find(button => {
      const icon = button.querySelector('.material-symbols-outlined');
      return icon?.textContent.trim() === 'notifications';
    });

    const button = existing || document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Open notifications');
    button.setAttribute('aria-expanded', 'false');
    button.dataset.masofishNotificationButton = 'true';

    if (!existing) {
      button.className =
        'masofish-notification-button w-10 h-10 rounded-full border border-outline-variant bg-white text-primary flex items-center justify-center';

      const rightArea = Array.from(header.children).find((child, index) =>
        index > 0 && child.matches?.('div.flex, div[class*="items-center"]')
      );

      (rightArea || header).appendChild(button);
    }

    button.classList.add('masofish-notification-button');
    button.innerHTML = `
      <span class="material-symbols-outlined">notifications</span>
      <span class="masofish-notification-badge" data-notification-badge hidden>0</span>
    `;

    return button;
  }

  function createPanel() {
    const style = document.createElement('style');
    style.textContent = `
      .masofish-notification-button {
        position: relative;
        flex: 0 0 auto;
        cursor: pointer;
      }
      .masofish-notification-badge {
        position: absolute;
        top: -4px;
        right: -5px;
        min-width: 19px;
        height: 19px;
        padding: 0 5px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: #ba1a1a;
        color: #fff;
        border: 2px solid #fff;
        font: 800 10px/1 Inter, Arial, sans-serif;
      }
      .masofish-notification-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9996;
        background: rgba(0, 19, 43, .45);
        backdrop-filter: blur(2px);
      }
      .masofish-notification-backdrop[hidden],
      .masofish-notification-panel[hidden] {
        display: none !important;
      }
      .masofish-notification-panel {
        position: fixed;
        z-index: 9997;
        top: 0;
        right: 0;
        width: min(430px, 100vw);
        height: 100dvh;
        display: flex;
        flex-direction: column;
        background: #f7fafc;
        color: #181c1e;
        border-left: 1px solid #c3c6d1;
        box-shadow: -20px 0 50px rgba(0, 30, 64, .2);
      }
      .masofish-notification-header {
        padding: 18px;
        background: #fff;
        border-bottom: 1px solid #c3c6d1;
      }
      .masofish-notification-tools {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .masofish-notification-tool {
        border: 0;
        border-radius: 10px;
        padding: 9px 11px;
        background: #f1f4f6;
        color: #001e40;
        cursor: pointer;
        font: 800 12px/1 Inter, Arial, sans-serif;
      }
      .masofish-notification-list {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
      }
      .masofish-notification-item {
        position: relative;
        display: block;
        margin-bottom: 10px;
        padding: 14px;
        border: 1px solid #c3c6d1;
        border-radius: 13px;
        background: #fff;
        color: inherit;
        text-decoration: none;
      }
      .masofish-notification-item[data-unread="true"] {
        border-left: 5px solid #006a65;
      }
      .masofish-notification-item-grid {
        display: grid;
        grid-template-columns: 38px 1fr;
        gap: 11px;
      }
      .masofish-notification-icon {
        width: 38px;
        height: 38px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: #e5e9eb;
        color: #001e40;
      }
      .masofish-notification-critical .masofish-notification-icon {
        background: #ffdad6;
        color: #93000a;
      }
      .masofish-notification-warning .masofish-notification-icon {
        background: #fff4d6;
        color: #704d00;
      }
      .masofish-notification-community .masofish-notification-icon {
        background: #76f3ea55;
        color: #006a65;
      }
      .masofish-notification-title {
        margin: 0;
        color: #001e40;
        font: 800 14px/1.35 Inter, Arial, sans-serif;
      }
      .masofish-notification-message {
        margin: 5px 0 0;
        color: #43474f;
        font: 400 13px/1.45 Inter, Arial, sans-serif;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .masofish-notification-time {
        display: block;
        margin-top: 7px;
        color: #737780;
        font: 700 11px/1.2 Inter, Arial, sans-serif;
      }
      .masofish-notification-empty {
        padding: 40px 20px;
        text-align: center;
        color: #43474f;
      }
      .masofish-notification-footer {
        padding: 12px;
        background: #fff;
        border-top: 1px solid #c3c6d1;
      }
      .masofish-browser-alert-button {
        width: 100%;
        border: 0;
        border-radius: 11px;
        padding: 13px;
        background: #006a65;
        color: #fff;
        cursor: pointer;
        font: 800 13px/1 Inter, Arial, sans-serif;
      }
    `;
    document.head.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.className = 'masofish-notification-backdrop';
    backdrop.hidden = true;

    const panel = document.createElement('aside');
    panel.className = 'masofish-notification-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Notifications');
    panel.innerHTML = `
      <div class="masofish-notification-header">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div>
            <p style="margin:0;color:#006a65;font:800 11px/1.2 Inter,Arial,sans-serif;text-transform:uppercase;letter-spacing:.12em;">MASOFISH</p>
            <h2 style="margin:4px 0 0;color:#001e40;font:900 23px/1.2 Inter,Arial,sans-serif;">Notifications</h2>
          </div>
          <button type="button" class="masofish-notification-tool" data-close-notifications aria-label="Close notifications">Close</button>
        </div>
        <div class="masofish-notification-tools" style="margin-top:14px;">
          <button type="button" class="masofish-notification-tool" data-refresh-notifications>Refresh</button>
          <button type="button" class="masofish-notification-tool" data-mark-all-read>Mark all read</button>
        </div>
      </div>
      <div class="masofish-notification-list" data-notification-list></div>
      <div class="masofish-notification-footer">
        <button type="button" class="masofish-browser-alert-button" data-enable-browser-alerts>
          Enable Device Alerts
        </button>
        <p style="margin:8px 3px 0;color:#737780;font:400 11px/1.4 Inter,Arial,sans-serif;">
          Device alerts work while MASOFISH is open. Official PAGASA warnings should still be checked.
        </p>
      </div>
    `;

    document.body.append(backdrop, panel);
    return { backdrop, panel };
  }

  const button = createButton();
  const ui = createPanel();
  const list = ui.panel.querySelector('[data-notification-list]');

  function render() {
    const count = unreadCount();
    const badge = button?.querySelector('[data-notification-badge]');

    if (badge) {
      badge.hidden = count === 0;
      badge.textContent = count > 99 ? '99+' : String(count);
    }

    if (!list) return;

    if (!state.items.length) {
      list.innerHTML = `
        <div class="masofish-notification-empty">
          <span class="material-symbols-outlined" style="font-size:46px;color:#006a65;">notifications_none</span>
          <h3 style="margin:12px 0 0;color:#001e40;">No notifications yet</h3>
          <p style="font-size:13px;">Safety alerts and activity on your forum discussions will appear here.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = state.items.map(item => {
      const unread = !state.readIds.has(item.id);
      return `
        <a class="masofish-notification-item ${itemClass(item)}"
           data-notification-id="${escapeHtml(item.id)}"
           data-unread="${unread}"
           href="${escapeHtml(item.href || '#')}">
          <div class="masofish-notification-item-grid">
            <span class="masofish-notification-icon">
              <span class="material-symbols-outlined">${iconFor(item)}</span>
            </span>
            <div>
              <p class="masofish-notification-title">${escapeHtml(item.title)}</p>
              <p class="masofish-notification-message">${escapeHtml(item.message)}</p>
              <span class="masofish-notification-time">${escapeHtml(relativeTime(item.createdAt))}</span>
            </div>
          </div>
        </a>
      `;
    }).join('');

    list.querySelectorAll('[data-notification-id]').forEach(link => {
      link.addEventListener('click', () => markRead(link.dataset.notificationId));
    });
  }

  function openPanel() {
    window.MASOFISH_ACCOUNT_PANEL?.close?.();
    state.panelOpen = true;
    ui.panel.hidden = false;
    ui.backdrop.hidden = false;
    button?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closePanel() {
    state.panelOpen = false;
    ui.panel.hidden = true;
    ui.backdrop.hidden = true;
    button?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  async function requestBrowserAlerts() {
    if (!('Notification' in window)) {
      throw new Error('Device alerts are not supported by this browser.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission was not granted.');
    }

    sendBrowserAlerts();
    return permission;
  }

  function sendBrowserAlerts() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const sentIds = new Set(readJson(browserStorageKey(), []));
    const urgent = state.items.filter(item =>
      !sentIds.has(item.id) &&
      item.kind === 'safety' &&
      ['critical', 'warning'].includes(item.severity)
    );

    urgent.slice(0, 3).forEach(item => {
      new Notification(`MASOFISH: ${item.title}`, {
        body: item.message,
        tag: item.id
      });
      sentIds.add(item.id);
    });

    localStorage.setItem(
      browserStorageKey(),
      JSON.stringify(Array.from(sentIds).slice(-MAX_READ_IDS))
    );
  }

  async function initialize() {
    state.ready = await window.masofishAuthReady;
    if (!state.ready) return;

    if (state.ready.mode === 'supabase') {
      state.mode = 'supabase';
      state.client = window.MASOFISH_AUTH.client;
      state.user = state.ready.session.user;
      state.userId = state.user.id;

      try {
        const { data } = await state.client
          .from('profiles')
          .select('role')
          .eq('id', state.userId)
          .maybeSingle();
        state.role = data?.role || 'user';
      } catch (_) {
        state.role = 'user';
      }
    } else {
      state.mode = 'prototype';
      state.userId = 'prototype-user';
      state.role = 'admin';
    }

    loadReadIds();
    await loadNotifications();
  }

  button?.addEventListener('click', event => {
    event.stopPropagation();
    state.panelOpen ? closePanel() : openPanel();
  });

  ui.backdrop.addEventListener('click', closePanel);
  ui.panel.querySelector('[data-close-notifications]').addEventListener('click', closePanel);
  ui.panel.querySelector('[data-mark-all-read]').addEventListener('click', markAllRead);

  ui.panel.querySelector('[data-refresh-notifications]').addEventListener('click', async event => {
    const control = event.currentTarget;
    control.disabled = true;
    control.textContent = 'Refreshing…';
    try {
      await loadNotifications();
    } finally {
      control.disabled = false;
      control.textContent = 'Refresh';
    }
  });

  ui.panel.querySelector('[data-enable-browser-alerts]').addEventListener('click', async event => {
    const control = event.currentTarget;
    control.disabled = true;
    const previous = control.textContent;
    control.textContent = 'Requesting permission…';

    try {
      await requestBrowserAlerts();
      control.textContent = 'Device Alerts Enabled';
    } catch (error) {
      control.textContent = error.message || 'Unable to enable alerts';
    } finally {
      setTimeout(() => {
        control.disabled = false;
        control.textContent = previous;
      }, 3000);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.panelOpen) closePanel();
  });

  window.MASOFISH_NOTIFICATIONS = {
    refresh: loadNotifications,
    open: openPanel,
    close: closePanel,
    markAllRead
  };

  initialize().catch(error => {
    console.error('Notification center failed:', error);
    render();
  });
})();