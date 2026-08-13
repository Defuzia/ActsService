const COLUMNS = [
  // Общие поля (акт + оферта)
  { key: 'FIO', label: 'ФИО исполнителя', placeholder: 'Иванов Иван Иванович', icon: 'user' },
  { key: 'PASSPORT', label: 'Паспорт', placeholder: '4516 123456', icon: 'id' },
  { key: 'INN_EXEC', label: 'ИНН исполнителя', placeholder: '123456789012', icon: 'hash' },
  { key: 'ADDRESS_EXEC', label: 'Адрес исполнителя', placeholder: 'г. Москва, ул. Ленина...', icon: 'pin' },
  { key: 'ORG_NAME', label: 'Организация', placeholder: 'ООО "Ромашка"', icon: 'building' },
  { key: 'INN_ORG', label: 'ИНН организации', placeholder: '1234567890', icon: 'hash' },
  { key: 'ADDRESS_ORG', label: 'Адрес организации', placeholder: 'г. Москва, ул. Ленина...', icon: 'pin' },
  { key: 'SERVICES', label: 'Вид услуги', placeholder: 'Вид услуги', icon: 'services' },
  { key: 'DATE', label: 'Дата оказания услуг', placeholder: '01.01.2026', picker: 'date', icon: 'calendar' },
  { key: 'PLACE', label: 'Место оказания услуг', placeholder: 'г. Москва', icon: 'pin' },
  { key: 'VOLUME', label: 'Объём', placeholder: '8 часов', icon: 'clock' },
  { key: 'PRICE', label: 'Стоимость', placeholder: '2595,08', icon: 'card' },
  { key: 'SIGN_DATETIME', label: 'Дата подписи', placeholder: '01.01.2026 12:00:00', picker: 'datetime', icon: 'calendar', doc: 'act' },
  { key: 'VALID_FROM', label: 'Действителен с', placeholder: '01.01.2026', picker: 'date', icon: 'calendar' },
  { key: 'VALID_TO', label: 'Действителен по', placeholder: '01.01.2029', picker: 'date', icon: 'calendar' },
  // Поля, характерные только для оферты (с разделителем)
  { key: 'OFFER_SENT_DATE', label: 'Дата отправки оферты', placeholder: '01.01.2026', picker: 'date', icon: 'calendar', doc: 'offer' },
  { key: 'EXEC_PHONE', label: 'Телефон исполнителя', placeholder: '+7 900 000-00-00', icon: 'phone', doc: 'offer' },
  { key: 'EXEC_EMAIL', label: 'E-mail исполнителя', placeholder: 'mail@example.com', icon: 'mail', doc: 'offer' },
  { key: 'EXEC_ACCBANK', label: 'Банковские реквизиты', placeholder: 'р/с ..., банк ...', icon: 'bank', doc: 'offer' },
  { key: 'SIGN_DATETIMEOFF', label: 'Дата подписи оферты', placeholder: '01.01.2026 00:00:00', picker: 'datetime', icon: 'calendar', doc: 'offer' },
  // ФИО владельца сертификата — в самом конце
  { key: 'OWNER_FIO', label: 'ФИО владельца сертификата', placeholder: 'Иванов Иван Иванович', icon: 'user' },
];

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'index') initIndexPage();
  if (page === 'admin') initAdminPage();
});

function initIndexPage() {
  const rowsContainer = document.getElementById('acts-body');
  const emptyHint = document.getElementById('empty-hint');
  const addRowBtn = document.getElementById('add-row-btn');
  const clearBtn = document.getElementById('clear-btn');
  const generateBtn = document.getElementById('generate-btn');
  const progressSection = document.getElementById('progress-section');
  const progressBar = document.getElementById('progress-bar');
  const progressStatus = document.getElementById('progress-status');
  const downloadBtn = document.getElementById('download-btn');
  const modeOptions = document.querySelectorAll('.mode-option');

  // Режим по умолчанию — «Только акт». Режимы с офертой пока заблокированы.
  let selectedMode = 'act_only'; // 'act_only' (оферта пока не готова)
  let progressTimer = null;
  let currentProgress = 0;

  updateEmptyState();

  // Переключение режима генерации (только незаблокированные кнопки).
  function applyMode() {
    rowsContainer.querySelectorAll('.act-fields').forEach((grid) => {
      grid.dataset.mode = selectedMode;
    });
  }

  modeOptions.forEach((option) => {
    if (option.disabled) return; // заблокированные режимы игнорируем
    option.addEventListener('click', () => {
      modeOptions.forEach((o) => o.classList.remove('active'));
      option.classList.add('active');
      selectedMode = option.dataset.mode;
      applyMode();
    });
  });
  applyMode();

  addRowBtn.addEventListener('click', () => {
    const sourceRow = rowsContainer.querySelector('.act-row:last-child');
    const initialData = sourceRow ? collectRowDataForCopy(sourceRow) : {};
    addRow(rowsContainer, initialData);
  });

  clearBtn.addEventListener('click', () => {
    if (!rowsContainer.children.length) return;
    if (confirm('Удалить все строки из таблицы?')) {
      rowsContainer.innerHTML = '';
      renumberRows();
      resetProgress();
    }
  });

  generateBtn.addEventListener('click', async () => {
    const acts = collectRows(rowsContainer);
    generateBtn.disabled = true;
    downloadBtn.classList.add('hidden');
    downloadBtn.removeAttribute('href');
    progressSection.classList.remove('hidden');
    setProgress(0, 'Запуск генерации...');
    startAnimatedProgress();

    try {
      const response = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acts,
          mode: selectedMode,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Неизвестная ошибка генерации.');
      }

      stopAnimatedProgress();
      setProgress(100, 'Готово! 100%');
      progressStatus.textContent = '✅ Все документы сгенерированы! Нажмите кнопку для скачивания.';
      progressStatus.classList.remove('error-text');
      progressStatus.classList.add('ok-text');
      downloadBtn.href = data.download_url;
      downloadBtn.dataset.archive = data.archive || '';
      downloadBtn.classList.remove('hidden');
    } catch (error) {
      stopAnimatedProgress();
      setProgress(currentProgress, `❌ Ошибка: ${error.message}`, true);
    } finally {
      generateBtn.disabled = false;
    }
  });

  downloadBtn.addEventListener('click', async (event) => {
    if (isDesktopApp()) {
      event.preventDefault();
      await saveArchiveInDesktopApp();
      return;
    }

    // В обычном браузере сервер удалит ZIP после отдачи файла.
    setTimeout(resetProgress, 1200);
  });

  async function saveArchiveInDesktopApp() {
    const archiveName = downloadBtn.dataset.archive;
    if (!archiveName) {
      setProgress(currentProgress, '❌ Ошибка: имя ZIP-архива не найдено.', true);
      return;
    }

    downloadBtn.classList.add('disabled');
    progressStatus.textContent = 'Сохранение ZIP-архива...';
    progressStatus.classList.remove('error-text');

    try {
      const result = await window.pywebview.api.save_archive(archiveName);

      if (result && result.ok) {
        progressStatus.textContent = result.message || '✅ ZIP-архив сохранён.';
        progressStatus.classList.add('ok-text');
        downloadBtn.classList.add('hidden');
        downloadBtn.removeAttribute('href');
        downloadBtn.dataset.archive = '';
        setTimeout(resetProgress, 1800);
        return;
      }

      if (result && result.cancelled) {
        progressStatus.textContent = 'Сохранение отменено. Нажмите «Скачать ZIP», чтобы выбрать место ещё раз.';
        progressStatus.classList.remove('ok-text', 'error-text');
        return;
      }

      throw new Error((result && (result.error || result.message)) || 'Не удалось сохранить ZIP-архив.');
    } catch (error) {
      setProgress(currentProgress, `❌ Ошибка сохранения: ${error.message}`, true);
    } finally {
      downloadBtn.classList.remove('disabled');
    }
  }

  function addRow(container, initialData = {}) {
    const row = document.createElement('article');
    row.className = 'act-row';

    const header = document.createElement('div');
    header.className = 'act-row-head';

    const title = document.createElement('div');
    title.className = 'row-number';
    header.appendChild(title);

    const rowActions = document.createElement('div');
    rowActions.className = 'act-row-actions';

    const clearActBtn = document.createElement('button');
    clearActBtn.type = 'button';
    clearActBtn.className = 'clear-act-btn';
    clearActBtn.title = 'Очистить поля этого документа';
    clearActBtn.textContent = 'Очистить документ';
    clearActBtn.addEventListener('click', () => {
      if (confirm('Очистить поля этого акта?')) {
        clearAct(row);
      }
    });
    rowActions.appendChild(clearActBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'icon-btn';
    deleteBtn.title = 'Удалить строку';
    deleteBtn.innerHTML = iconMarkup('trash');
    deleteBtn.addEventListener('click', () => {
      row.remove();
      renumberRows();
    });
    rowActions.appendChild(deleteBtn);
    header.appendChild(rowActions);

    const grid = document.createElement('div');
    grid.className = 'act-fields';

    grid.dataset.mode = selectedMode;

    let offerDividerAdded = false;
    COLUMNS.forEach((column) => {
      if (column.doc === 'offer' && !offerDividerAdded) {
        const divider = document.createElement('div');
        divider.className = 'field-divider';
        divider.dataset.doc = 'offer';
        divider.innerHTML = '<span class="field-divider-text">Поля оферты</span>';
        grid.appendChild(divider);
        offerDividerAdded = true;
      }

      const field = document.createElement('label');
      field.className = 'field';
      if (column.doc) field.dataset.doc = column.doc;
      const inputId = `${column.key}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      field.setAttribute('for', inputId);

      const label = document.createElement('span');
      label.className = 'field-label';
      label.innerHTML = `${iconMarkup(column.icon)}<span>${column.label}</span>`;
      field.appendChild(label);

      if (column.picker) {
        field.appendChild(createCalendarInput(column, inputId, row));
      } else {
        field.appendChild(createTextInput(column, inputId));
      }

      grid.appendChild(field);
    });

    row.appendChild(header);
    row.appendChild(grid);
    container.appendChild(row);
    applyRowData(row, initialData);
    renumberRows();
  }

  function applyRowData(row, data = {}) {
    COLUMNS.forEach((column) => {
      const input = row.querySelector(`[name="${column.key}"]`);
      if (!input) return;

      input.value = data[column.key] || '';
      if (column.key === 'DATE') {
        input.dataset.autoFilled = data.__dateAutoFilled ? 'true' : 'false';
      }
    });
  }

  function clearAct(row) {
    row.querySelectorAll('input').forEach((input) => {
      input.value = '';
      if (input.dataset) input.dataset.autoFilled = '';
    });
  }

  function collectRowDataForCopy(row) {
    const data = collectSingleRow(row);
    const dateInput = row.querySelector('[name="DATE"]');
    data.__dateAutoFilled = dateInput && dateInput.dataset.autoFilled === 'true';
    return data;
  }

  function createTextInput(column, inputId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'input-wrap';

    const inputIcon = document.createElement('span');
    inputIcon.className = 'input-icon';
    inputIcon.innerHTML = iconMarkup(column.icon);
    wrapper.appendChild(inputIcon);

    const input = document.createElement('input');
    input.type = 'text';
    input.name = column.key;
    input.id = inputId;
    input.placeholder = column.placeholder;
    input.autocomplete = 'off';
    if (column.key === 'ORG_NAME') {
      input.addEventListener('blur', () => {
        input.value = normalizeOrgName(input.value);
      });
    }
    wrapper.appendChild(input);

    return wrapper;
  }

  function createCalendarInput(column, inputId, row) {
    const wrapper = document.createElement('div');
    wrapper.className = 'input-wrap date-input-wrap no-left-icon';

    const visibleInput = document.createElement('input');
    visibleInput.type = 'text';
    visibleInput.name = column.key;
    visibleInput.id = inputId;
    visibleInput.placeholder = column.placeholder;
    visibleInput.autocomplete = 'off';
    visibleInput.inputMode = 'numeric';

    const pickerBtn = document.createElement('button');
    pickerBtn.type = 'button';
    pickerBtn.className = 'calendar-btn';
    pickerBtn.title = 'Выбрать дату в календаре';
    pickerBtn.innerHTML = iconMarkup('calendar');

    const nativeInput = document.createElement('input');
    nativeInput.className = 'calendar-native';
    nativeInput.type = column.picker === 'datetime' ? 'datetime-local' : 'date';
    nativeInput.tabIndex = -1;
    if (column.picker === 'datetime') nativeInput.step = '1';

    nativeInput.addEventListener('change', () => {
      if (!nativeInput.value) return;
      visibleInput.value = column.picker === 'datetime'
        ? formatDateTimeFromNative(nativeInput.value)
        : formatDateFromNative(nativeInput.value);
      if (column.key === 'DATE') visibleInput.dataset.autoFilled = 'false';
      if (column.key === 'SIGN_DATETIME') {
        fillNextServiceDate(row);
        fillCertificateDates(row);
        fillOfferDates(row);
      }
    });

    visibleInput.addEventListener('input', () => {
      if (column.key === 'DATE') visibleInput.dataset.autoFilled = 'false';
    });
    visibleInput.addEventListener('change', () => {
      syncNativeFromText();
      if (column.key === 'SIGN_DATETIME') {
        fillNextServiceDate(row);
        fillCertificateDates(row);
        fillOfferDates(row);
      }
      if (column.key === 'DATE') {
        fillOfferDates(row);
      }
    });
    visibleInput.addEventListener('blur', () => {
      syncNativeFromText();
      if (column.key === 'SIGN_DATETIME') {
        fillNextServiceDate(row);
        fillCertificateDates(row);
        fillOfferDates(row);
      }
      if (column.key === 'DATE') {
        fillOfferDates(row);
      }
    });

    pickerBtn.addEventListener('click', () => {
      syncNativeFromText();
      if (typeof nativeInput.showPicker === 'function') {
        nativeInput.showPicker();
      } else {
        nativeInput.focus();
        nativeInput.click();
      }
    });

    wrapper.appendChild(visibleInput);
    wrapper.appendChild(pickerBtn);
    wrapper.appendChild(nativeInput);

    return wrapper;

    function syncNativeFromText() {
      const parsed = column.picker === 'datetime'
        ? parseRuDateTimeToNative(visibleInput.value)
        : parseRuDateToNative(visibleInput.value);
      if (parsed) nativeInput.value = parsed;
    }
  }

  function fillNextServiceDate(row) {
    const signInput = row.querySelector('[name="SIGN_DATETIME"]');
    const dateInput = row.querySelector('[name="DATE"]');
    if (!signInput || !dateInput) return;

    // Не перезаписываем дату услуг, если пользователь уже ввёл её вручную.
    if (dateInput.value.trim() && dateInput.dataset.autoFilled !== 'true') return;

    const nextDate = getNextServiceDateText(signInput.value);
    if (!nextDate) return;

    dateInput.value = nextDate;
    dateInput.dataset.autoFilled = 'true';
  }

  function fillCertificateDates(row) {
    const signInput = row.querySelector('[name="SIGN_DATETIME"]');
    const validFromInput = row.querySelector('[name="VALID_FROM"]');
    const validToInput = row.querySelector('[name="VALID_TO"]');
    if (!signInput || !validFromInput || !validToInput) return;

    const validity = getCertificateValidityDatesText(signInput.value);
    if (!validity) return;

    validFromInput.value = validity.validFrom;
    validToInput.value = validity.validTo;
  }

  // Автосвязь дат оферты: OFFER_SENT_DATE и SIGN_DATETIMEOFF = DATE - 1 день.
  function fillOfferDates(row) {
    const dateInput = row.querySelector('[name="DATE"]');
    const offerSentInput = row.querySelector('[name="OFFER_SENT_DATE"]');
    const signOffInput = row.querySelector('[name="SIGN_DATETIMEOFF"]');
    if (!dateInput || !offerSentInput || !signOffInput) return;

    const offerDates = getOfferDatesFromServiceDate(dateInput.value);
    if (!offerDates) return;

    if (!offerSentInput.value.trim()) offerSentInput.value = offerDates.offerSent;
    if (!signOffInput.value.trim()) signOffInput.value = offerDates.signOff;
  }

  function renumberRows() {
    [...rowsContainer.querySelectorAll('.act-row')].forEach((row, index) => {
      row.querySelector('.row-number').textContent = `Документ №${index + 1}`;
    });
    updateEmptyState();
  }

  function updateEmptyState() {
    if (!emptyHint) return;
    emptyHint.classList.toggle('hidden', rowsContainer.children.length > 0);
  }

  function collectRows(container) {
    return [...container.querySelectorAll('.act-row')].map((row) => collectSingleRow(row));
  }

  function collectSingleRow(row) {
    const data = {};
    COLUMNS.forEach((column) => {
      const input = row.querySelector(`[name="${column.key}"]`);
      let value = input ? input.value.trim() : '';
      if (column.key === 'ORG_NAME') value = normalizeOrgName(value);
      data[column.key] = value;
    });
    return data;
  }

  function startAnimatedProgress() {
    stopAnimatedProgress();
    currentProgress = 0;
    progressTimer = setInterval(() => {
      if (currentProgress < 85) {
        currentProgress += Math.max(1, Math.round((85 - currentProgress) * 0.08));
        currentProgress = Math.min(currentProgress, 85);
        setProgress(currentProgress, `Генерация... ${currentProgress}%`);
      }
    }, 350);
  }

  function stopAnimatedProgress() {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }

  function setProgress(percent, text, isError = false) {
    currentProgress = percent;
    progressBar.style.width = `${percent}%`;
    progressStatus.textContent = text;
    progressStatus.classList.toggle('error-text', isError);
    if (isError) progressStatus.classList.remove('ok-text');
  }

  function resetProgress() {
    stopAnimatedProgress();
    currentProgress = 0;
    progressBar.style.width = '0%';
    progressStatus.textContent = 'Запуск генерации...';
    progressStatus.classList.remove('ok-text', 'error-text');
    downloadBtn.classList.add('hidden');
    downloadBtn.removeAttribute('href');
    progressSection.classList.add('hidden');
  }
}

function isDesktopApp() {
  return Boolean(
    window.pywebview
    && window.pywebview.api
    && typeof window.pywebview.api.save_archive === 'function'
  );
}

function iconMarkup(name) {
  const icons = {
    user: '<svg viewBox="0 0 24 24" fill="none"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>',
    id: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 10h6M9 14h4"/></svg>',
    hash: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    building: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 21h16M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
    services: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M8 12h8M8 16h6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    bank: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 21h18M4 18h16M5 18V9M9 18V9M15 18V9M19 18V9M3 6l9-4 9 4H3Z"/></svg>',
  };
  return icons[name] || icons.id;
}

function normalizeOrgName(value) {
  return (value || '').trim().replace(/^[oOоО0]{3}(?=\s|["«]|$)/u, 'ООО');
}

function getNextServiceDateText(signDatetimeText) {
  const date = getDateOnlyFromSignDatetime(signDatetimeText);
  if (!date) return '';

  date.setDate(date.getDate() + 1);
  return formatDateObjectRu(date);
}

// Даты оферты: OFFER_SENT_DATE и SIGN_DATETIMEOFF = DATE - 1 день.
function getOfferDatesFromServiceDate(serviceDateText) {
  const native = parseRuDateToNative(serviceDateText);
  if (!native) return null;
  const datePart = native.split('T')[0];
  const date = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  date.setDate(date.getDate() - 1);
  const offerSent = formatDateObjectRu(date);
  const signOff = `${offerSent} 00:00:00`;
  return { offerSent, signOff };
}

function getCertificateValidityDatesText(signDatetimeText) {
  const date = getDateOnlyFromSignDatetime(signDatetimeText);
  if (!date) return null;

  return {
    validFrom: formatDateObjectRu(date),
    validTo: formatDateObjectRu(addYearsKeepDate(date, 3)),
  };
}

function getDateOnlyFromSignDatetime(signDatetimeText) {
  const nativeValue = parseRuDateTimeToNative(signDatetimeText);
  if (!nativeValue) return null;

  const datePart = nativeValue.split('T')[0];
  const date = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addYearsKeepDate(date, years) {
  const result = new Date(date.getTime());
  const sourceMonth = date.getMonth();
  result.setFullYear(result.getFullYear() + years);

  // Например, 29.02.2024 + 3 года -> 28.02.2027, а не 01.03.2027.
  if (result.getMonth() !== sourceMonth) result.setDate(0);
  return result;
}

function formatDateObjectRu(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy}`;
}

function formatDateFromNative(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return value || '';
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function formatDateTimeFromNative(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value || '');
  if (!match) return value || '';
  const seconds = match[6] || '00';
  return `${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}:${seconds}`;
}

function parseRuDateToNative(value) {
  const text = (value || '').trim();
  let match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;

  match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match) return text;

  return '';
}

function parseRuDateTimeToNative(value) {
  const text = (value || '').trim();
  let match = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (match) return `${match[3]}-${match[2]}-${match[1]}T${match[4]}:${match[5]}:${match[6] || '00'}`;

  match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
  if (match) return `${match[3]}-${match[2]}-${match[1]}T00:00:00`;

  match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (match) return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6] || '00'}`;

  match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match) return `${match[1]}-${match[2]}-${match[3]}T00:00:00`;

  return '';
}

function initAdminPage() {
  setupUploader(
    'upload-zone', 'template-file', 'selected-file-name', 'upload-btn', 'upload-status', '/admin/upload'
  );
  setupUploader(
    'upload-zone-offer', 'template-file-offer', 'selected-file-name-offer', 'upload-btn-offer', 'upload-status-offer', '/admin/upload_offer'
  );
}

function setupUploader(zoneId, inputId, fileNameId, btnId, statusId, url) {
  const uploadZone = document.getElementById(zoneId);
  const fileInput = document.getElementById(inputId);
  const fileName = document.getElementById(fileNameId);
  const uploadBtn = document.getElementById(btnId);
  const status = document.getElementById(statusId);

  let selectedFile = null;

  uploadZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    selectedFile = fileInput.files[0] || null;
    showSelectedFile();
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    uploadZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      uploadZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    uploadZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      uploadZone.classList.remove('dragover');
    });
  });

  uploadZone.addEventListener('drop', (event) => {
    selectedFile = event.dataTransfer.files[0] || null;
    showSelectedFile();
  });

  uploadBtn.addEventListener('click', async () => {
    clearStatus();

    if (!selectedFile) {
      setStatus('❌ Выберите .docx файл.', true);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith('.docx')) {
      setStatus('❌ Можно загрузить только файл формата .docx.', true);
      return;
    }

    const formData = new FormData();
    formData.append('template', selectedFile);

    uploadBtn.disabled = true;
    setStatus('Загрузка шаблона...', false);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Неизвестная ошибка загрузки.');
      }

      setStatus(data.message || '✅ Шаблон успешно обновлён!', false, true);
    } catch (error) {
      setStatus(`❌ Ошибка: ${error.message}`, true);
    } finally {
      uploadBtn.disabled = false;
    }
  });

  function showSelectedFile() {
    fileName.textContent = selectedFile ? selectedFile.name : 'Файл не выбран';
    clearStatus();
  }

  function clearStatus() {
    status.textContent = '';
    status.classList.remove('ok-text', 'error-text');
  }

  function setStatus(text, isError = false, isOk = false) {
    status.textContent = text;
    status.classList.toggle('error-text', isError);
    status.classList.toggle('ok-text', isOk);
  }
}
