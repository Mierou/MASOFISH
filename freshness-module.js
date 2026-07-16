(function () {
  'use strict';

  const MODEL_URL = './freshness-model/model.json';
  const METADATA_URL = './freshness-model/metadata.json';
  const ORGAN_SUPPORT_THRESHOLD = 0.55;
  const LINKED_ORGAN_SUPPORT_THRESHOLD = 0.58;

  let model = null;
  let linkedFishImageData = null;

  const byId = id => document.getElementById(id);
  const eyeInput = byId('eyeFreshnessInput');
  const gillInput = byId('gillFreshnessInput');
  const eyePreview = byId('eyeFreshnessPreview');
  const gillPreview = byId('gillFreshnessPreview');
  const analyzeButton = byId('analyzeFreshnessButton');
  const linkedPanel = byId('linkedFishPhotoPanel');
  const linkedPreview = byId('linkedFishPhotoPreview');
  const linkedStatus = byId('linkedFishPhotoStatus');

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[character]);
  }

  function parseLabel(label) {
    const normalized = String(label).trim().toLowerCase();
    return {
      organ: normalized.includes('eye') ? 'eye' : normalized.includes('gill') ? 'gill' : 'unknown',
      state: normalized.includes('non-fresh') ? 'non-fresh' : normalized.includes('fresh') ? 'fresh' : 'unknown'
    };
  }

  function formatLabel(label) {
    return String(label).replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function showMessage(text, type = 'info') {
    const box = byId('freshnessMessage');
    box.className = 'rounded-lg p-3 font-body-sm';
    if (type === 'error') box.classList.add('bg-error-container', 'text-on-error-container');
    else if (type === 'success') box.classList.add('bg-secondary-container', 'text-on-secondary-container');
    else box.classList.add('bg-surface-container-high', 'text-on-surface');
    box.textContent = text;
  }

  function hasImage(preview) {
    return Boolean(preview.src) && !preview.classList.contains('hidden');
  }

  function updateAnalyzeState() {
    analyzeButton.disabled = !(model && (linkedFishImageData || hasImage(eyePreview) || hasImage(gillPreview)));
  }

  function setLinkedFishImage(dataUrl) {
    if (!dataUrl) return;
    linkedFishImageData = dataUrl;
    linkedPreview.src = dataUrl;
    linkedPanel.classList.remove('hidden');
    linkedStatus.textContent = 'Ready for automatic freshness analysis';
    byId('freshnessResults').classList.add('hidden');
    updateAnalyzeState();
  }

  function removeLinkedFishImage() {
    linkedFishImageData = null;
    linkedPreview.removeAttribute('src');
    linkedPanel.classList.add('hidden');
    updateAnalyzeState();
    showMessage('The linked Fish ID photo will not be used. Upload an eye or gill close-up below.');
  }

  function handleFile(file, preview, emptyElement) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showMessage('Please select a valid image file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      preview.onload = updateAnalyzeState;
      preview.src = reader.result;
      preview.classList.remove('hidden');
      emptyElement.classList.add('hidden');
      byId('freshnessResults').classList.add('hidden');
      byId('freshnessMessage').classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }

  function analyzeOrgan(predictions, organ, source = 'dedicated') {
    const enriched = predictions.map(prediction => ({
      className: prediction.className,
      probability: prediction.probability,
      parsed: parseLabel(prediction.className)
    }));

    const organPredictions = enriched.filter(item => item.parsed.organ === organ);
    const support = organPredictions.reduce((total, item) => total + item.probability, 0);
    const freshRaw = organPredictions
      .filter(item => item.parsed.state === 'fresh')
      .reduce((total, item) => total + item.probability, 0);
    const nonFreshRaw = organPredictions
      .filter(item => item.parsed.state === 'non-fresh')
      .reduce((total, item) => total + item.probability, 0);

    const freshScore = support > 0 ? freshRaw / support : 0;
    const nonFreshScore = support > 0 ? nonFreshRaw / support : 0;

    return {
      organ,
      support,
      freshScore,
      nonFreshScore,
      valid: support >= (source === 'linked' ? LINKED_ORGAN_SUPPORT_THRESHOLD : ORGAN_SUPPORT_THRESHOLD),
      source,
      predictions: enriched.sort((a, b) => b.probability - a.probability)
    };
  }

  function scoreDescription(score) {
    if (score >= 0.75) {
      return {
        title: 'Likely Fresh',
        explanation: 'The visible eye and/or gill characteristics are more similar to the model’s fresh examples.',
        cardClass: 'rounded-xl border border-secondary bg-secondary-container text-on-secondary-container p-5'
      };
    }
    if (score >= 0.55) {
      return {
        title: 'Mixed Freshness Indicators',
        explanation: 'The model found a mixture of fresh and non-fresh visual characteristics. Inspect the fish carefully.',
        cardClass: 'rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-950 p-5'
      };
    }
    return {
      title: 'Possible Reduced Freshness',
      explanation: 'The visible eye and/or gill characteristics are more similar to the model’s non-fresh examples.',
      cardClass: 'rounded-xl border border-error/30 bg-error-container text-on-error-container p-5'
    };
  }

  function renderOrganResult(result, scoreId, detailId) {
    if (!result) {
      byId(scoreId).textContent = 'Not analyzed';
      byId(detailId).textContent = 'No photo was provided for this indicator.';
      return;
    }

    if (!result.valid) {
      byId(scoreId).textContent = 'Invalid sample';
      byId(detailId).textContent = `Only ${(result.support * 100).toFixed(1)}% of the model response matched the selected body part. Use a clearer close-up.`;
      return;
    }

    byId(scoreId).textContent = `${Math.round(result.freshScore * 100)}%`;
    const sourceText = result.source === 'linked'
      ? ' Automatically evaluated from the Fish ID photo.'
      : ' Evaluated from the dedicated close-up.';
    byId(detailId).textContent =
      (result.freshScore >= 0.75
        ? 'Fresh visual characteristics were dominant.'
        : result.freshScore >= 0.55
          ? 'Fresh characteristics were slightly stronger, but the result is mixed.'
          : 'Non-fresh visual characteristics were dominant.') + sourceText;
  }

  function predictionList(title, result) {
    if (!result) {
      return `<div><h4 class="font-body-md font-bold text-primary">${escapeHtml(title)}</h4><p class="font-body-sm text-on-surface-variant mt-2">No image analyzed.</p></div>`;
    }

    return `
      <div>
        <h4 class="font-body-md font-bold text-primary">${escapeHtml(title)}</h4>
        <p class="font-label-md text-label-md text-on-surface-variant mt-1">
          Source: ${result.source === 'linked' ? 'Linked Fish ID photo' : 'Dedicated close-up'} •
          Selected-part support: ${(result.support * 100).toFixed(1)}%
        </p>
        <div class="space-y-3 mt-3">
          ${result.predictions.map(item => {
            const percentage = (item.probability * 100).toFixed(1);
            return `
              <div>
                <div class="flex justify-between gap-3 font-body-sm mb-1">
                  <span>${escapeHtml(formatLabel(item.className))}</span>
                  <strong>${percentage}%</strong>
                </div>
                <div class="h-2 bg-outline-variant rounded-full overflow-hidden">
                  <div class="h-full bg-secondary rounded-full" style="width:${percentage}%"></div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  function renderResults(eyeResult, gillResult) {
    const validResults = [eyeResult, gillResult].filter(result => result && result.valid);
    const resultsPanel = byId('freshnessResults');
    resultsPanel.classList.remove('hidden');

    renderOrganResult(eyeResult, 'eyeFreshnessScore', 'eyeFreshnessDetail');
    renderOrganResult(gillResult, 'gillFreshnessScore', 'gillFreshnessDetail');

    byId('freshnessPredictionDetails').innerHTML =
      predictionList('Eye Model Output', eyeResult) +
      predictionList('Gill Model Output', gillResult);

    if (!validResults.length) {
      byId('overallFreshnessPercent').textContent = '--';
      byId('overallFreshnessStatus').textContent = 'Unable to Calculate';
      byId('overallFreshnessExplanation').textContent =
        'The uploaded image or images did not strongly match the required eye or gill close-up categories.';
      byId('overallFreshnessBasis').textContent = 'Upload a clearer close-up and try again.';
      byId('overallFreshnessRing').style.setProperty('--score', 0);
      byId('overallFreshnessCard').className =
        'rounded-xl border border-error/30 bg-error-container text-on-error-container p-5';
      showMessage('No valid freshness sample was detected. Please follow the close-up photo guidelines.', 'error');
      resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const overall = validResults.reduce((sum, result) => sum + result.freshScore, 0) / validResults.length;
    const description = scoreDescription(overall);
    const percentage = Math.round(overall * 100);

    byId('overallFreshnessPercent').textContent = `${percentage}%`;
    byId('overallFreshnessStatus').textContent = description.title;
    byId('overallFreshnessExplanation').textContent = description.explanation;
    const linkedCount = validResults.filter(result => result.source === 'linked').length;
    byId('overallFreshnessBasis').textContent =
      validResults.length === 2
        ? `Overall score = average of the valid eye and gill scores${linkedCount ? ' using the linked Fish ID photo where no close-up was provided' : ''}.`
        : validResults[0].source === 'linked'
          ? `Overall score is based on the ${validResults[0].organ} characteristics automatically detected in the Fish ID photo.`
          : `Overall score is based only on the valid ${validResults[0].organ} close-up.`;
    byId('overallFreshnessRing').style.setProperty('--score', percentage);
    byId('overallFreshnessCard').className = description.cardClass;

    showMessage(
      'Freshness analysis completed. The displayed percentage is a model-derived visual score, not a literal food-safety measurement.',
      'success'
    );
    resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function loadModel() {
    try {
      if (!window.tmImage) {
        throw new Error('The Teachable Machine library did not load. Check your connection and refresh.');
      }
      model = await tmImage.load(MODEL_URL, METADATA_URL);
      byId('freshnessModelStatus').textContent = `Freshness model ready — ${model.getTotalClasses()} visual classes`;
      byId('freshnessModelStatusIcon').textContent = 'check_circle';
      byId('freshnessModelStatusIcon').className = 'material-symbols-outlined text-secondary';
      updateAnalyzeState();
    } catch (error) {
      console.error(error);
      byId('freshnessModelStatus').textContent = 'Freshness model could not be loaded';
      byId('freshnessModelStatusIcon').textContent = 'error';
      byId('freshnessModelStatusIcon').className = 'material-symbols-outlined text-error';
      showMessage(error.message || 'Unable to load the freshness model.', 'error');
    }
  }

  byId('chooseEyeFreshnessButton').addEventListener('click', () => eyeInput.click());
  byId('chooseGillFreshnessButton').addEventListener('click', () => gillInput.click());

  eyeInput.addEventListener('change', () => {
    handleFile(eyeInput.files?.[0], eyePreview, byId('eyeFreshnessEmpty'));
  });
  gillInput.addEventListener('change', () => {
    handleFile(gillInput.files?.[0], gillPreview, byId('gillFreshnessEmpty'));
  });

  analyzeButton.addEventListener('click', async () => {
    if (!model || (!hasImage(eyePreview) && !hasImage(gillPreview))) return;

    analyzeButton.disabled = true;
    analyzeButton.innerHTML =
      '<span class="material-symbols-outlined animate-spin">progress_activity</span> Analyzing Freshness…';
    showMessage('Analyzing the linked Fish ID photo and any dedicated close-ups locally…');

    try {
      let linkedPredictions = null;
      if (linkedFishImageData) {
        const linkedImage = new Image();
        linkedImage.src = linkedFishImageData;
        await linkedImage.decode();
        linkedPredictions = await model.predict(linkedImage, false);
      }

      const eyeResult = hasImage(eyePreview)
        ? analyzeOrgan(await model.predict(eyePreview, false), 'eye', 'dedicated')
        : linkedPredictions
          ? analyzeOrgan(linkedPredictions, 'eye', 'linked')
          : null;

      const gillResult = hasImage(gillPreview)
        ? analyzeOrgan(await model.predict(gillPreview, false), 'gill', 'dedicated')
        : linkedPredictions
          ? analyzeOrgan(linkedPredictions, 'gill', 'linked')
          : null;

      renderResults(eyeResult, gillResult);
    } catch (error) {
      console.error(error);
      showMessage('Freshness analysis failed. Try another image or refresh the page.', 'error');
    } finally {
      analyzeButton.innerHTML =
        '<span class="material-symbols-outlined">science</span> Analyze Linked Photo / Close-Ups';
      updateAnalyzeState();
    }
  });

  byId('resetFreshnessButton').addEventListener('click', () => {
    eyeInput.value = '';
    gillInput.value = '';

    [eyePreview, gillPreview].forEach(preview => {
      preview.removeAttribute('src');
      preview.classList.add('hidden');
    });

    byId('eyeFreshnessEmpty').classList.remove('hidden');
    byId('gillFreshnessEmpty').classList.remove('hidden');
    byId('freshnessResults').classList.add('hidden');
    byId('freshnessMessage').classList.add('hidden');
    if (linkedFishImageData) {
      linkedStatus.textContent = 'Fish ID photo still linked and ready';
    }
    updateAnalyzeState();
    byId('freshness').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  byId('removeLinkedFishPhotoButton').addEventListener('click', removeLinkedFishImage);

  window.addEventListener('masofish:fish-image-selected', event => {
    setLinkedFishImage(event.detail?.dataUrl);
  });

  const existingFishPreview = byId('fishPreview');
  const storedFishImage =
    sessionStorage.getItem('masofishPendingImage') ||
    sessionStorage.getItem('masofishImage');

  if (existingFishPreview?.src && !existingFishPreview.classList.contains('hidden')) {
    setLinkedFishImage(existingFishPreview.src);
  } else if (storedFishImage) {
    setLinkedFishImage(storedFishImage);
  }

  loadModel();
})();