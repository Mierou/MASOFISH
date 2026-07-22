(function () {
  'use strict';

  const byId = id => document.getElementById(id);
  const DAYS = 7;

  const SAMPLE = {
    stats: [
      { icon: 'restaurant_menu', label: 'Recipes', value: 18 },
      { icon: 'forum', label: 'Forum Posts', value: 47 },
      { icon: 'phishing', label: 'Catches Logged', value: 132 },
      { icon: 'emergency', label: 'Safety Alerts', value: 3 },
      { icon: 'group', label: 'Registered Users', value: 64 }
    ],
    trend: [4, 7, 3, 9, 12, 6, 10],
    feed: [
      { icon: 'phishing', color: 'text-secondary', title: 'New catch logged: Milkfish', time: '2 hours ago' },
      { icon: 'forum', color: 'text-primary', title: 'New forum post: "Best bait for rabbitfish?"', time: '5 hours ago' },
      { icon: 'restaurant_menu', color: 'text-secondary', title: 'Recipe published: Grilled Tilapia', time: 'Yesterday' },
      { icon: 'emergency', color: 'text-error', title: 'Safety alert: Small craft warning', time: '2 days ago' }
    ]
  };

  function statCard(icon, label, value) {
    return `
      <div class="rounded-xl border border-outline-variant bg-surface-container-low p-4">
        <span class="material-symbols-outlined text-primary text-2xl">${icon}</span>
        <p class="text-2xl font-black text-primary mt-2">${value}</p>
        <p class="text-xs text-on-surface-variant font-bold uppercase tracking-wide">${label}</p>
      </div>`;
  }

  function feedItem(icon, color, title, time) {
    return `
      <li class="flex items-start gap-3 rounded-xl bg-surface-container-low p-3">
        <span class="material-symbols-outlined ${color} text-xl">${icon}</span>
        <div class="min-w-0">
          <p class="text-sm font-bold text-on-surface truncate">${title}</p>
          <p class="text-xs text-on-surface-variant">${time}</p>
        </div>
      </li>`;
  }

  function dayLabels() {
    const labels = [];
    const now = new Date();
    for (let i = DAYS - 1; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
    }
    return labels;
  }

  function renderChart(counts) {
    const max = Math.max(1, ...counts);
    const labels = dayLabels();
    const bars = counts.map((count, i) => `
      <div class="flex flex-col items-center gap-1 flex-1">
        <span class="text-[11px] font-extrabold text-primary">${count}</span>
        <div class="w-full max-w-[28px] bg-secondary-container rounded-t-md transition-all" style="height:${Math.max(6, Math.round((count / max) * 96))}px"></div>
        <span class="text-[10px] text-on-surface-variant font-bold">${labels[i]}</span>
      </div>`).join('');
    return `<div class="flex items-end gap-2 h-[150px]">${bars}</div>`;
  }

  function relativeTime(iso) {
    const then = new Date(iso).getTime();
    const diffMs = Date.now() - then;
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(iso).toLocaleDateString();
  }

  async function safeCount(client, table) {
    try {
      const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  async function safeSince(client, table, sinceIso) {
    try {
      const { data, error } = await client
        .from(table)
        .select('created_at')
        .gte('created_at', sinceIso)
        .limit(2000);
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async function safeRecent(client, table, columns) {
    try {
      const { data, error } = await client
        .from(table)
        .select(columns)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  function bucketByDay(rows) {
    const buckets = new Array(DAYS).fill(0);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    rows.forEach(row => {
      if (!row.created_at) return;
      const d = new Date(row.created_at);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diffDays = Math.round((startOfToday - dayStart) / 86400000);
      const index = DAYS - 1 - diffDays;
      if (index >= 0 && index < DAYS) buckets[index] += 1;
    });
    return buckets;
  }

  function renderSample() {
    byId('analyticsNotice').hidden = false;
    byId('analyticsStats').innerHTML = SAMPLE.stats.map(s => statCard(s.icon, s.label, s.value)).join('');
    byId('analyticsChart').innerHTML = renderChart(SAMPLE.trend);
    byId('analyticsFeed').innerHTML = SAMPLE.feed.map(f => feedItem(f.icon, f.color, f.title, f.time)).join('');
  }

  async function refresh() {
    const context = await window.masofishAdminReady;
    if (!context) return;

    const ready = await window.masofishAuthReady;
    if (!ready || ready.mode !== 'supabase') {
      renderSample();
      return;
    }

    byId('analyticsNotice').hidden = true;
    const client = window.MASOFISH_AUTH.client;
    const sinceIso = new Date(Date.now() - (DAYS - 1) * 86400000).toISOString();

    const [recipeCount, postCount, catchCount, alertCount, userCount] = await Promise.all([
      safeCount(client, 'recipes'),
      safeCount(client, 'forum_posts'),
      safeCount(client, 'catch_logs'),
      safeCount(client, 'safety_announcements'),
      safeCount(client, 'profiles')
    ]);

    byId('analyticsStats').innerHTML = [
      statCard('restaurant_menu', 'Recipes', recipeCount),
      statCard('forum', 'Forum Posts', postCount),
      statCard('phishing', 'Catches Logged', catchCount),
      statCard('emergency', 'Safety Alerts', alertCount),
      statCard('group', 'Registered Users', userCount)
    ].join('');

    const [recipeRows, postRows, catchRows, alertRows] = await Promise.all([
      safeSince(client, 'recipes', sinceIso),
      safeSince(client, 'forum_posts', sinceIso),
      safeSince(client, 'catch_logs', sinceIso),
      safeSince(client, 'safety_announcements', sinceIso)
    ]);
    const combined = bucketByDay([...recipeRows, ...postRows, ...catchRows, ...alertRows]);
    byId('analyticsChart').innerHTML = renderChart(combined);

    const [recentRecipes, recentPosts, recentCatches, recentAlerts] = await Promise.all([
      safeRecent(client, 'recipes', 'name,fish_name,created_at'),
      safeRecent(client, 'forum_posts', 'title,created_at'),
      safeRecent(client, 'catch_logs', 'fish_name,created_at'),
      safeRecent(client, 'safety_announcements', 'title,severity,created_at')
    ]);

    const events = [
      ...recentRecipes.map(r => ({ icon: 'restaurant_menu', color: 'text-secondary', title: `Recipe published: ${r.name || r.fish_name || 'Untitled'}`, created_at: r.created_at })),
      ...recentPosts.map(p => ({ icon: 'forum', color: 'text-primary', title: `New forum post: "${p.title || 'Untitled'}"`, created_at: p.created_at })),
      ...recentCatches.map(c => ({ icon: 'phishing', color: 'text-secondary', title: `New catch logged: ${c.fish_name || 'Unknown catch'}`, created_at: c.created_at })),
      ...recentAlerts.map(a => ({ icon: 'emergency', color: 'text-error', title: `Safety alert: ${a.title || 'Untitled'}`, created_at: a.created_at }))
    ]
      .filter(e => e.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);

    byId('analyticsFeed').innerHTML = events.length
      ? events.map(e => feedItem(e.icon, e.color, e.title, relativeTime(e.created_at))).join('')
      : '<li class="text-sm text-on-surface-variant p-3">No recent activity yet.</li>';
  }

  byId('refreshAnalyticsButton').addEventListener('click', () => {
    const button = byId('refreshAnalyticsButton');
    button.disabled = true;
    refresh().finally(() => { button.disabled = false; });
  });

  refresh().catch(error => {
    console.error('Administrator analytics failed to load:', error);
    renderSample();
  });
})();
