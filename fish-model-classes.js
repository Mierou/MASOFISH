(function () {
  'use strict';

  const METADATA_PATH = './model/metadata.json';
  const CLASS_DETAILS_PATH = './fish-classes.json';

  const byId = id => document.getElementById(id);
  const grid = byId('modelFishGrid');
  const search = byId('modelFishSearch');
  const status = byId('modelFishStatus');
  const count = byId('modelFishCount');
  const loading = byId('modelFishLoading');
  const empty = byId('modelFishEmpty');

  if (!grid || !search || !status || !count || !loading || !empty) return;

  const state = {
    allFish: [],
    details: {}
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

  function normalize(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\bmackarel\b/g, 'mackerel')
      .replace(/\s+/g, ' ');
  }

  function displayLabel(modelLabel) {
    return String(modelLabel || '').replace(/\bMackarel\b/gi, 'Mackerel');
  }

  function initials(label) {
    const words = displayLabel(label).split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase() || 'F';
  }

  function findDetails(modelLabel) {
    const target = normalize(modelLabel);

    const entry = Object.entries(state.details).find(([key]) =>
      normalize(key) === target
    );

    return entry?.[1] || null;
  }

  function searchableText(item) {
    return normalize([
      item.modelLabel,
      item.displayName,
      item.details?.localName,
      item.details?.scientificName
    ].filter(Boolean).join(' '));
  }

  function card(item, index) {
    const correctedLabel = item.displayName !== item.modelLabel;
    const localName = item.details?.localName;
    const scientificName = item.details?.scientificName;

    return `
      <article class="model-fish-card rounded-xl border border-outline-variant bg-white p-4 shadow-sm"
               data-search="${escapeHtml(searchableText(item))}">
        <div class="flex items-start gap-3">
          <div class="w-12 h-12 rounded-full bg-secondary-container/55 text-on-secondary-container flex items-center justify-center font-black shrink-0">
            ${escapeHtml(initials(item.displayName))}
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-[10px] font-extrabold uppercase tracking-wider text-secondary">
                  Model class ${index + 1}
                </p>
                <h3 class="font-headline-sm text-headline-sm text-primary leading-tight mt-1">
                  ${escapeHtml(item.displayName)}
                </h3>
              </div>
              <span class="material-symbols-outlined text-secondary shrink-0" aria-hidden="true">verified</span>
            </div>

            ${localName ? `
              <p class="font-body-sm text-on-surface-variant mt-1">
                Local name: <strong>${escapeHtml(localName)}</strong>
              </p>` : ''}

            ${scientificName ? `
              <p class="font-body-sm text-on-surface-variant italic mt-1">
                ${escapeHtml(scientificName)}
              </p>` : ''}

            ${!localName && !scientificName ? `
              <p class="font-body-sm text-on-surface-variant mt-1">
                Available in the deployed Fish ID model.
              </p>` : ''}

            ${correctedLabel ? `
              <p class="text-[10px] text-outline mt-2">
                Metadata label: ${escapeHtml(item.modelLabel)}
              </p>` : ''}
          </div>
        </div>
      </article>`;
  }

  function render() {
    const term = normalize(search.value);
    const visible = state.allFish.filter(item =>
      !term || searchableText(item).includes(term)
    );

    grid.innerHTML = visible.map(card).join('');

    empty.hidden = visible.length > 0;
    empty.classList.toggle('hidden', visible.length > 0);

    count.textContent = term
      ? `${visible.length} of ${state.allFish.length}`
      : `${state.allFish.length} fish`;

    status.textContent = state.allFish.length
      ? `${state.allFish.length} identifiable fish classes loaded directly from the Teachable Machine metadata.`
      : 'No identifiable fish classes were found in the model metadata.';
  }

  async function fetchJson(path, required = true) {
    const response = await fetch(path, { cache: 'no-store' });

    if (!response.ok) {
      if (!required) return {};
      throw new Error(`Unable to load ${path} (${response.status}).`);
    }

    return response.json();
  }

  async function initialize() {
    try {
      const [metadata, classDetails] = await Promise.all([
        fetchJson(METADATA_PATH, true),
        fetchJson(CLASS_DETAILS_PATH, false).catch(() => ({}))
      ]);

      const labels = Array.isArray(metadata.labels) ? metadata.labels : [];
      state.details = classDetails && typeof classDetails === 'object'
        ? classDetails
        : {};

      state.allFish = labels
        .filter(label => normalize(label) !== 'no fish')
        .map(modelLabel => ({
          modelLabel,
          displayName: displayLabel(modelLabel),
          details: findDetails(modelLabel)
        }));

      loading.hidden = true;
      loading.classList.add('hidden');
      search.disabled = state.allFish.length === 0;

      render();

      window.MASOFISH_MODEL_CLASSES = {
        metadata,
        fishLabels: state.allFish.map(item => item.modelLabel),
        refresh: initialize
      };
    } catch (error) {
      console.error('Fish model class list failed:', error);

      loading.hidden = true;
      loading.classList.add('hidden');
      grid.innerHTML = '';
      search.disabled = true;
      count.textContent = 'Unavailable';
      status.textContent =
        error.message || 'The Teachable Machine class list could not be loaded.';

      empty.hidden = false;
      empty.classList.remove('hidden');
      empty.querySelector('p.font-bold').textContent =
        'Fish class list unavailable';
      empty.querySelector('p.font-body-sm').textContent =
        'Check that model/metadata.json is deployed with the project.';
    }
  }

  search.addEventListener('input', render);
  initialize();
})();