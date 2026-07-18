(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    html.masofish-admin-pending body { visibility: hidden !important; }
    html.masofish-admin-pending::before {
      content: "Checking administrator access…";
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: grid;
      place-items: center;
      visibility: visible;
      background: #f7fafc;
      color: #001e40;
      font: 700 15px/1.4 Inter, Arial, sans-serif;
    }
  `;
  document.head.appendChild(style);
  document.documentElement.classList.add('masofish-admin-pending');

  function denyAccess() {
    location.replace('index.html?admin=denied');
  }

  function allowAccess(role, profile) {
    document.documentElement.classList.remove('masofish-admin-pending');
    window.MASOFISH_ADMIN_CONTEXT = { role, profile };
    document.dispatchEvent(new CustomEvent('masofish:admin-ready', {
      detail: window.MASOFISH_ADMIN_CONTEXT
    }));
    return window.MASOFISH_ADMIN_CONTEXT;
  }

  async function checkAdmin() {
    const ready = await window.masofishAuthReady;
    if (!ready) return null;

    if (ready.mode === 'prototype') {
      return allowAccess('admin', {
        full_name: 'Prototype Administrator',
        role: 'admin'
      });
    }

    if (ready.mode !== 'supabase') {
      denyAccess();
      return null;
    }

    const client = window.MASOFISH_AUTH?.client;
    const user = ready.session?.user;
    if (!client || !user) {
      denyAccess();
      return null;
    }

    try {
      const { data, error } = await client
        .from('profiles')
        .select('id,full_name,role')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data?.role !== 'admin') {
        denyAccess();
        return null;
      }

      return allowAccess('admin', data);
    } catch (error) {
      console.error('Administrator role check failed:', error);
      denyAccess();
      return null;
    }
  }

  window.masofishAdminReady = checkAdmin();
})();