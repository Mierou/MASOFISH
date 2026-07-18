(function () {
  'use strict';

  const byId = id => document.getElementById(id);
  const modal = byId('saveCatchResultModal');
  const service = window.MASOFISH_CATCH_LOG;

  function cleanText(value) {
    const text = String(value || '').trim();
    return text && text !== '—' && text.toLowerCase() !== 'undefined' ? text : '';
  }

  function readStoredJson(key) {
    try {
      return JSON.parse(sessionStorage.getItem(key) || 'null');
    } catch (error) {
      console.warn(`Invalid ${key} data:`, error);
      return null;
    }
  }

  function resolveFishDetails(prediction) {
    const visibleName = cleanText(byId('resultFishName')?.textContent);
    const fishName =
      visibleName ||
      cleanText(prediction?.className) ||
      cleanText(prediction?.label) ||
      cleanText(prediction?.name) ||
      cleanText(prediction?.topPrediction?.className) ||
      'Unidentified Fish';

    const localName = cleanText(byId('localName')?.textContent);
    const scientificName = cleanText(byId('scientificName')?.textContent);
    return { fishName, localName, scientificName };
  }

  function openModal() {
    const prediction = readStoredJson('masofishPrediction');
    const freshness = readStoredJson('masofishFreshness');

    if (!prediction) {
      alert('The identification result is no longer available. Please identify the fish again.');
      return;
    }

    const details = resolveFishDetails(prediction);
    byId('saveCatchFishName').value = details.fishName;
    byId('saveCatchLocalName').value = details.localName;
    byId('saveCatchScientificName').value = details.scientificName;
    byId('saveCatchFishNameDisplay').textContent = details.fishName;
    byId('saveCatchNameDetails').textContent = [details.localName, details.scientificName].filter(Boolean).join(' • ');

    byId('saveCatchDate').value = new Date().toISOString().slice(0, 10);
    byId('saveCatchTime').value = new Date().toTimeString().slice(0, 5);

    const confidenceValue = prediction?.probability ?? prediction?.confidence ?? prediction?.topPrediction?.probability;
    byId('saveCatchConfidence').textContent = Number.isFinite(Number(confidenceValue))
      ? `${Math.round(Number(confidenceValue) * 100)}%`
      : '—';

    byId('saveCatchFreshness').textContent = freshness?.hasValidSample
      ? `${freshness.overallPercent}% — ${freshness.status}`
      : 'Unavailable';

    byId('saveCatchResultMessage').hidden = true;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function showMessage(text, type = 'error') {
    const box = byId('saveCatchResultMessage');
    box.hidden = false;
    box.className = 'rounded-xl border p-3 text-sm';
    if (type === 'success') box.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-900');
    else box.classList.add('bg-red-50', 'border-red-200', 'text-red-900');
    box.textContent = text;
  }

  byId('saveToCatchLogButton')?.addEventListener('click', openModal);
  byId('closeSaveCatchModalButton')?.addEventListener('click', closeModal);
  byId('cancelSaveCatchButton')?.addEventListener('click', closeModal);

  modal?.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
  });

  byId('saveCatchResultForm')?.addEventListener('submit', async event => {
    event.preventDefault();

    const submit = byId('confirmSaveCatchButton');
    submit.disabled = true;
    submit.textContent = 'Saving…';

    try {
      const prediction = readStoredJson('masofishPrediction');
      const freshness = readStoredJson('masofishFreshness');
      const image = sessionStorage.getItem('masofishImage');
      const details = resolveFishDetails(prediction);
      const fishName = cleanText(byId('saveCatchFishName').value) || details.fishName;

      if (!fishName) {
        throw new Error('The identified fish name could not be read. Please identify the fish again.');
      }

      const confidenceValue = prediction?.probability ?? prediction?.confidence ?? prediction?.topPrediction?.probability ?? null;

      await service.create({
        fish_name: fishName,
        local_name: cleanText(byId('saveCatchLocalName').value) || details.localName,
        scientific_name: cleanText(byId('saveCatchScientificName').value) || details.scientificName,
        confidence_score: confidenceValue,
        freshness_score: freshness?.hasValidSample ? freshness.overallScore : null,
        freshness_status: freshness?.hasValidSample ? freshness.status : null,
        weight_kg: byId('saveCatchWeight').value,
        length_cm: byId('saveCatchLength').value,
        catch_location: byId('saveCatchLocation').value,
        catch_date: byId('saveCatchDate').value,
        catch_time: byId('saveCatchTime').value,
        disposition: byId('saveCatchDisposition').value,
        notes: byId('saveCatchNotes').value,
        source: 'identification'
      }, image);

      const marker = prediction?.identifiedAt || prediction?.timestamp || new Date().toISOString();
      sessionStorage.setItem('masofishLastSavedIdentification', marker);

      const saveButton = byId('saveToCatchLogButton');
      saveButton.innerHTML = '<span class="material-symbols-outlined">check_circle</span>Saved to Catch Log';
      saveButton.disabled = true;

      showMessage('Catch saved successfully.', 'success');
      setTimeout(closeModal, 700);
    } catch (error) {
      console.error('Catch save failed:', error);
      showMessage(error.message || 'The catch could not be saved.');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Save Catch';
    }
  });

  const prediction = readStoredJson('masofishPrediction');
  const savedMarker = prediction?.identifiedAt || prediction?.timestamp;
  if (savedMarker && sessionStorage.getItem('masofishLastSavedIdentification') === savedMarker) {
    const saveButton = byId('saveToCatchLogButton');
    saveButton.innerHTML = '<span class="material-symbols-outlined">check_circle</span>Saved to Catch Log';
    saveButton.disabled = true;
  }
})();