(function () {
  'use strict';

  const METADATA_URL = './model/metadata.json';
  const CLASS_INFO_URL = './fish-classes.json';
  const INITIAL_VISIBLE_COUNT = 4;

  const byId = id => document.getElementById(id);
  const grid = byId('speciesGrid');
  const searchInput = byId('speciesSearchInput');
  const sortButton = byId('speciesSortButton');
  const seeAllButton = byId('speciesSeeAllButton');
  const status = byId('speciesStatus');
  const message = byId('speciesListMessage');
  const messageTitle = byId('speciesListMessageTitle');
  const messageText = byId('speciesListMessageText');

  if (!grid) return;

  const state = {
    species: [],
    searchTerm: '',
    showAll: false,
    alphabetical: false
  };

  const visualBackgrounds = [
    'linear-gradient(145deg, #003366 0%, #006a65 100%)',
    'linear-gradient(145deg, #004d62 0%, #3a5f94 100%)',
    'linear-gradient(145deg, #006f69 0%, #001e40 100%)',
    'linear-gradient(145deg, #1f477b 0%, #00504c 100%)',
    'linear-gradient(145deg, #00212c 0%, #006a65 100%)',
    'linear-gradient(145deg, #003848 0%, #3a5f94 100%)'
  ];

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
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function setVisible(element, visible) {
    if (!element) return;
    element.hidden = !visible;
    element.classList.toggle('hidden', !visible);
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`${url} returned ${response.status}.`);
    }
    return response.json();
  }

  function buildSpecies(metadata, classInfo) {
    if (!Array.isArray(metadata?.labels)) {
      throw new Error('The fish species data could not be loaded.');
    }

    return metadata.labels
      .map((modelLabel, modelIndex) => {
        const info = classInfo[modelLabel] || {};
        return {
          modelLabel,
          modelIndex,
          displayName: info.displayName || modelLabel,
          localName: info.localName || 'Local name not yet added',
          scientificName: info.scientificName || 'Scientific name not yet added',
          imageUrl: info.imageUrl || '',
          imageAlt: info.imageAlt || `${info.displayName || modelLabel} fish`,
          imagePosition: info.imagePosition || 'center',
          isFish: info.isFish !== false && normalize(modelLabel) !== 'no fish'
        };
      })
      .filter(item => item.isFish);
  }

  function filteredSpecies() {
    const term = normalize(state.searchTerm);

    let items = state.species.filter(item => {
      if (!term) return true;

      return [
        item.modelLabel,
        item.displayName,
        item.localName,
        item.scientificName
      ].some(value => normalize(value).includes(term));
    });

    if (state.alphabetical) {
      items = [...items].sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      );
    } else {
      items = [...items].sort((a, b) => a.modelIndex - b.modelIndex);
    }

    return items;
  }

  function speciesCard(item) {
    const background =
      visualBackgrounds[item.modelIndex % visualBackgrounds.length];

    const modelLabelLine = item.displayName === item.modelLabel
      ? item.modelLabel
      : `${item.modelLabel} model class`;

    return `
      <article
        class="species-card group bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,30,64,0.08)] hover:shadow-[0_16px_34px_rgba(0,30,64,0.14)] hover:-translate-y-1 active:scale-[0.99] transition-all duration-200"
        data-model-label="${escapeHtml(item.modelLabel)}"
      >
        <div
          class="h-48 relative overflow-hidden bg-surface-container-high"
          style="background:${background}"
        >
          <div class="absolute inset-0 opacity-20" data-fish-image-fallback>
            <span class="material-symbols-outlined absolute -right-4 -bottom-7 text-white" style="font-size:150px;">phishing</span>
          </div>

          ${item.imageUrl ? `
            <img
              src="${escapeHtml(item.imageUrl)}"
              alt="${escapeHtml(item.imageAlt)}"
              loading="lazy"
              class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              style="object-position:${escapeHtml(item.imagePosition)}"
              data-fish-photo
            />` : ''}

          <div class="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/55 pointer-events-none"></div>

          <div class="absolute inset-x-0 top-0 p-3 flex items-start justify-between gap-3">
            <span class="inline-flex items-center gap-1.5 bg-white/92 text-primary border border-white/70 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur">
              <span class="material-symbols-outlined text-[15px]" style="font-variation-settings:'FILL' 1;">verified</span>
              AI Identifiable
            </span>

            <span class="bg-primary/78 border border-white/25 text-white rounded-full px-2.5 py-1.5 text-[10px] font-extrabold backdrop-blur">
              Class ${item.modelIndex + 1}
            </span>
          </div>

          <div class="absolute inset-x-0 bottom-0 p-4">
            <p class="text-white/80 text-[10px] font-bold uppercase tracking-[0.16em]">
              MASOFISH Model
            </p>
            <h3 class="text-white text-xl font-black leading-tight mt-1 drop-shadow">
              ${escapeHtml(item.displayName)}
            </h3>
          </div>
        </div>

        <div class="p-4">
          <p class="font-body-sm text-body-sm text-on-surface-variant italic line-clamp-1">
            ${escapeHtml(item.scientificName)}
          </p>

          <div class="grid grid-cols-1 gap-2.5 mt-4">
            <div class="rounded-xl bg-secondary-container/30 border border-secondary/10 px-3 py-2.5">
              <span class="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-on-secondary-container">
                Local Name
              </span>
              <span class="block text-sm font-black text-primary mt-0.5">
                ${escapeHtml(item.localName)}
              </span>
            </div>

            <div class="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-3 py-2.5">
              <div class="min-w-0">
                <span class="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-outline">
                  Model Label
                </span>
                <span class="block text-xs font-bold text-on-surface mt-0.5 truncate">
                  ${escapeHtml(modelLabelLine)}
                </span>
              </div>

              <span class="material-symbols-outlined text-secondary shrink-0" aria-hidden="true">
                neurology
              </span>
            </div>
          </div>
        </div>
      </article>`;
  }

  function render() {
    const matches = filteredSpecies();
    const searching = Boolean(normalize(state.searchTerm));
    const visibleItems =
      state.showAll || searching
        ? matches
        : matches.slice(0, INITIAL_VISIBLE_COUNT);

    grid.innerHTML = visibleItems.map(speciesCard).join('');

    grid.querySelectorAll('[data-fish-photo]').forEach(image => {
      image.addEventListener('error', () => {
        image.hidden = true;
      }, { once: true });
    });

    const hasMatches = matches.length > 0;
    setVisible(grid, hasMatches);
    setVisible(message, !hasMatches);

    if (!hasMatches) {
      messageTitle.textContent = 'No matching fish found';
      messageText.textContent =
        'Try another English name, local name, or scientific name.';
    }

    const canToggle =
      !searching && state.species.length > INITIAL_VISIBLE_COUNT;

    setVisible(seeAllButton, canToggle);
    seeAllButton.textContent = state.showAll ? 'SHOW LESS' : 'SEE ALL';

    if (searching) {
      status.textContent =
        `${matches.length} matching ${matches.length === 1 ? 'fish species' : 'fish species'}`;
    } else {
      status.textContent = 'Identifiable fish species';
    }

    sortButton.setAttribute(
      'aria-label',
      state.alphabetical
        ? 'Use default order'
        : 'Sort fish alphabetically'
    );

    sortButton.title =
      state.alphabetical
        ? 'Use model class order'
        : 'Sort fish alphabetically';

    const icon = sortButton.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.textContent =
        state.alphabetical ? 'format_list_numbered' : 'sort_by_alpha';
    }
  }

  async function initialize() {
    try {
      const [metadata, classInfo] = await Promise.all([
        fetchJson(METADATA_URL),
        fetchJson(CLASS_INFO_URL)
      ]);

      state.species = buildSpecies(metadata, classInfo);
      render();
    } catch (error) {
      console.error('Identifiable fish list could not be loaded:', error);
      grid.innerHTML = '';
      setVisible(grid, false);
      setVisible(message, true);
      setVisible(seeAllButton, false);

      status.textContent = 'The model species list is unavailable.';
      messageTitle.textContent = 'Unable to read the model classes';
      messageText.textContent =
        'Confirm that model/metadata.json and fish-classes.json are deployed with this page.';
    }
  }

  searchInput?.addEventListener('input', event => {
    state.searchTerm = event.target.value;
    render();
  });

  sortButton?.addEventListener('click', () => {
    state.alphabetical = !state.alphabetical;
    render();
  });

  seeAllButton?.addEventListener('click', () => {
    state.showAll = !state.showAll;
    render();

    if (!state.showAll) {
      byId('speciesListHeading')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });

  initialize();
})();