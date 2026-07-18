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
      throw new Error('The Teachable Machine metadata does not contain a labels list.');
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

  function speciesCard(item, visibleIndex) {
    const background =
      visualBackgrounds[item.modelIndex % visualBackgrounds.length];

    const modelLabelLine = item.displayName === item.modelLabel
      ? item.modelLabel
      : `${item.modelLabel} (model label)`;

    return `
      <article
        class="species-card bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm active:scale-[0.98] transition-all"
        data-model-label="${escapeHtml(item.modelLabel)}"
      >
        <div class="h-40 relative overflow-hidden bg-surface-container-high" style="background:${background}">
          <div class="absolute inset-0 opacity-20" data-fish-image-fallback>
            <span class="material-symbols-outlined absolute -right-4 -bottom-7 text-white" style="font-size:150px;">phishing</span>
          </div>

          ${item.imageUrl ? `
            <img
              src="${escapeHtml(item.imageUrl)}"
              alt="${escapeHtml(item.imageAlt)}"
              loading="lazy"
              class="absolute inset-0 w-full h-full object-cover"
              style="object-position:${escapeHtml(item.imagePosition)}"
              data-fish-photo
            />` : ''}

          <div class="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/20 pointer-events-none"></div>

          <div class="absolute inset-0 p-4 flex flex-col justify-between">
            <div class="flex justify-between items-start gap-3">
              <span class="bg-secondary-container text-on-secondary-container font-label-md text-[10px] px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm">
                AI Identifiable
              </span>
              <span class="bg-black/35 border border-white/30 text-white font-label-md text-[10px] px-2 py-1 rounded-lg backdrop-blur-sm">
                Class ${item.modelIndex + 1}
              </span>
            </div>

            <div class="flex items-end justify-between gap-3">
              <div>
                <span class="material-symbols-outlined text-white" style="font-size:36px;">set_meal</span>
                <p class="text-white text-xs font-bold uppercase tracking-widest mt-1 drop-shadow">
                  MASOFISH Model
                </p>
              </div>

              <span class="bg-black/40 border border-white/25 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm">
                LOCAL PHOTO
              </span>
            </div>
          </div>
        </div>

        <div class="p-4">
          <div class="flex justify-between items-start gap-3 mb-1">
            <h3 class="font-headline-sm text-headline-sm text-on-surface">
              ${escapeHtml(item.displayName)}
            </h3>
            <span class="material-symbols-outlined text-primary text-sm" title="Available in the current model">verified</span>
          </div>

          <p class="font-body-sm text-body-sm text-on-surface-variant mb-3 italic">
            ${escapeHtml(item.scientificName)}
          </p>

          <div class="grid grid-cols-2 gap-3 border-t border-outline-variant pt-3">
            <div class="min-w-0">
              <span class="font-label-md text-[10px] text-outline uppercase">Local Name</span>
              <span class="block font-body-sm font-bold text-primary mt-1 break-words">
                ${escapeHtml(item.localName)}
              </span>
            </div>

            <div class="min-w-0">
              <span class="font-label-md text-[10px] text-outline uppercase">Model Label</span>
              <span class="block font-body-sm font-bold text-primary mt-1 break-words">
                ${escapeHtml(modelLabelLine)}
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
        `${matches.length} matching ${matches.length === 1 ? 'fish class' : 'fish classes'} from the current model`;
    } else {
      status.textContent =
        `${state.species.length} identifiable fish classes loaded from the current Teachable Machine model`;
    }

    sortButton.setAttribute(
      'aria-label',
      state.alphabetical
        ? 'Use model class order'
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