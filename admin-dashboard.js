(function () {
  'use strict';

  const byId = id => document.getElementById(id);

  function featureCard(label, available, description) {
    return `
      <article class="rounded-xl border ${available ? 'border-secondary/30 bg-secondary-container/20' : 'border-amber-300 bg-amber-50'} p-4">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined ${available ? 'text-secondary' : 'text-amber-700'}">
            ${available ? 'check_circle' : 'warning'}
          </span>
          <h3 class="font-black text-primary">${label}</h3>
        </div>
        <p class="text-sm text-on-surface-variant mt-2">${description}</p>
      </article>`;
  }

  async function tableAvailable(client, table) {
    const { error } = await client.from(table).select('*', { count: 'exact', head: true });
    if (!error) return true;

    const text = `${error.message || ''} ${error.details || ''}`.toLowerCase();
    if (text.includes('does not exist') || text.includes('relation') || text.includes(table.toLowerCase())) {
      return false;
    }

    // Permission-related errors still mean the table exists.
    if (text.includes('permission') || text.includes('row-level security')) {
      return true;
    }

    console.warn(`Status check failed for ${table}:`, error);
    return false;
  }

  async function refresh() {
    const context = await window.masofishAdminReady;
    if (!context) return;

    const ready = await window.masofishAuthReady;
    const user = ready?.session?.user;
    const profile = context.profile || {};

    const name =
      profile.full_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      'Administrator';

    byId('adminWelcomeText').textContent =
      `${name} is signed in with the administrator role. Use this page to manage MASOFISH content and safety features.`;

    if (ready.mode === 'prototype') {
      byId('adminFeatureStatus').innerHTML = [
        featureCard('Guest Administrator', true, 'Administrator interface is enabled in local guest mode.'),
        featureCard('Supabase Connection', false, 'Connect Supabase and create a real administrator account for production use.')
      ].join('');
      return;
    }

    const client = window.MASOFISH_AUTH.client;
    const checks = await Promise.all([
      tableAvailable(client, 'safety_announcements'),
      tableAvailable(client, 'recipes'),
      tableAvailable(client, 'forum_posts'),
      tableAvailable(client, 'catch_logs')
    ]);

    byId('adminFeatureStatus').innerHTML = [
      featureCard('Safety Announcements', checks[0], checks[0] ? 'Database feature is available.' : 'Run supabase-safety-schema.sql.'),
      featureCard('Recipe Management', checks[1], checks[1] ? 'Database feature is available.' : 'Run supabase-catch-recipes-schema.sql.'),
      featureCard('Forum Moderation', checks[2], checks[2] ? 'Database feature is available.' : 'Run supabase-forum-schema.sql.'),
      featureCard('Catch Log', checks[3], checks[3] ? 'Database feature is available.' : 'Run supabase-catch-recipes-schema.sql.')
    ].join('');
  }

  byId('refreshAdminStatusButton').addEventListener('click', () => {
    const button = byId('refreshAdminStatusButton');
    button.disabled = true;
    refresh().finally(() => { button.disabled = false; });
  });

  refresh().catch(error => {
    console.error('Administrator dashboard failed:', error);
    byId('adminFeatureStatus').innerHTML =
      featureCard('Administrator Dashboard', false, error.message || 'The administrator status could not be loaded.');
  });
})();