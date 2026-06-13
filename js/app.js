// app.js — main controller

document.addEventListener('DOMContentLoaded', () => {
  let zoom = 1;

  // ---- user photo upload ----
  document.getElementById('photoInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const b64 = await toBase64(file);
      resumeData.personal.photo = b64;
      document.getElementById('photoPreview').innerHTML = `<img src="${b64}" style="width:100%;height:100%;object-fit:cover;">`;
      document.getElementById('removePhotoBtn').style.display = 'inline-flex';
      renderResume();
    } catch (err) {
      toast('Could not load photo');
    }
  });

  document.getElementById('removePhotoBtn').addEventListener('click', () => {
    resumeData.personal.photo = '';
    document.getElementById('photoInput').value = '';
    document.getElementById('photoPreview').innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    document.getElementById('removePhotoBtn').style.display = 'none';
    renderResume();
  });

  // ---- autosave logic ----
  function saveToCache() {
    localStorage.setItem('resumegen_data', JSON.stringify(window.resumeData));
    localStorage.setItem('resumegen_settings', JSON.stringify(window.settings));
  }
  window.saveToCache = saveToCache; // expose to renderer

  function loadFromCache() {
    const cachedData = localStorage.getItem('resumegen_data');
    const cachedSettings = localStorage.getItem('resumegen_settings');
    
    if (cachedData && cachedData !== 'undefined') {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed && typeof loadResumeData === 'function') {
          loadResumeData(parsed);
        }
      } catch (e) { 
        console.error('Cache load failed', e);
        localStorage.removeItem('resumegen_data');
      }
    }
    
    if (cachedSettings && cachedSettings !== 'undefined') {
      try {
        const parsed = JSON.parse(cachedSettings);
        if (parsed) {
          Object.assign(window.settings, parsed);
        }
      } catch (e) { 
        console.error('Settings cache load failed', e);
        localStorage.removeItem('resumegen_settings');
      }
    }
  }

  // ---- initial render + sync inputs ----
  loadFromCache();
  syncFormToData();
  renderAllEditors();
  renderResume();
  applyAccent();
  applyZoom();
  showMobilePanel('editor');

  // ---- form inputs -> data ----
  document.querySelectorAll('[data-field]').forEach(el => {
    el.addEventListener('input', () => {
      resumeData.personal[el.dataset.field] = el.value;
      renderResume();
    });
  });

  // summary
  document.getElementById('summary').addEventListener('input', e => {
    resumeData.summary = e.target.value;
    renderResume();
  });

  // ---- collapsible sections ----
  document.querySelectorAll('.section-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const section = hdr.closest('.editor-section');
      section.classList.toggle('open');
    });
  });

  // ---- experience ----
  document.getElementById('addExperienceBtn').addEventListener('click', () => {
    resumeData.experience.push(emptyExperience());
    renderExperienceEditor();
    renderResume();
  });

  // ---- education ----
  document.getElementById('addEducationBtn').addEventListener('click', () => {
    resumeData.education.push(emptyEducation());
    renderEducationEditor();
    renderResume();
  });

  // ---- projects ----
  document.getElementById('addProjectBtn').addEventListener('click', () => {
    resumeData.projects.push(emptyProject());
    renderProjectsEditor();
    renderResume();
  });

  // ---- certifications ----
  document.getElementById('addCertBtn').addEventListener('click', () => {
    resumeData.certifications.push(emptyCert());
    renderCertsEditor();
    renderResume();
  });

  // ---- skills ----
  document.getElementById('addSkillBtn').addEventListener('click', addSkill);
  document.getElementById('skillInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addSkill();
  });

  function addSkill() {
    const input = document.getElementById('skillInput');
    const level = document.getElementById('skillLevel').value;
    const name = input.value.trim();
    if (!name) return;
    // allow comma-separated bulk add
    name.split(',').forEach(n => {
      n = n.trim();
      if (n) resumeData.skills.push({ id: makeId(), name: n, level });
    });
    input.value = '';
    renderSkillsEditor();
    renderResume();
  }

  // ---- languages ----
  document.getElementById('addLangBtn').addEventListener('click', addLang);
  document.getElementById('langInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addLang();
  });

  function addLang() {
    const input = document.getElementById('langInput');
    const level = document.getElementById('langLevel').value;
    const name = input.value.trim();
    if (!name) return;
    resumeData.languages.push({ id: makeId(), name, level });
    input.value = '';
    renderLanguagesEditor();
    renderResume();
  }

  // ---- template picker ----
  document.getElementById('templateGrid').addEventListener('click', e => {
    const card = e.target.closest('[data-template]');
    if (!card) return;
    document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    settings.template = card.dataset.template;
    const paper = document.getElementById('resumePreview');
    paper.style.opacity = '0.5';
    setTimeout(() => {
      renderResume();
      paper.style.opacity = '1';
    }, 50);
  });

  // ---- color swatches ----
  document.getElementById('colorSwatches').addEventListener('click', e => {
    const sw = e.target.closest('.swatch');
    if (!sw) return;
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
    const color = sw.dataset.color;
    document.getElementById('customColor').value = color;
    document.getElementById('hexInput').value = color.toUpperCase();
    settings.accent = color;
    applyAccent();
    renderResume();
  });

  document.getElementById('customColor').addEventListener('input', e => {
    const color = e.target.value;
    settings.accent = color;
    document.getElementById('hexInput').value = color.toUpperCase();
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    applyAccent();
    renderResume();
  });

  document.getElementById('hexInput').addEventListener('input', e => {
    let color = e.target.value;
    if (!color.startsWith('#')) color = '#' + color;
    if (/^#[0-9A-F]{6}$/i.test(color)) {
      settings.accent = color;
      document.getElementById('customColor').value = color;
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      applyAccent();
      renderResume();
    }
  });

  // ---- sliders ----
  bindSlider('fontSize',    'fontSizeVal',    v => { settings.fontSize = parseFloat(v); });
  bindSlider('lineSpacing', 'lineSpacingVal', v => { settings.lineSpacing = parseFloat(v); });
  bindSlider('pageMargin',  'marginVal',      v => { settings.pageMargin = parseInt(v); });

  function bindSlider(id, labelId, fn) {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      document.getElementById(labelId).textContent = el.value;
      fn(el.value);
      renderResume();
    });
  }

  // ---- font ----
  document.getElementById('fontFamily').addEventListener('change', e => {
    settings.fontFamily = e.target.value;
    renderResume();
  });

  document.getElementById('customFontInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    
    showLoading('Loading font...');
    try {
      const buffer = await file.arrayBuffer();
      const fontName = file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '');
      const format = file.name.endsWith('.woff2') ? 'woff2' : file.name.endsWith('.woff') ? 'woff' : 'truetype';
      
      const b64 = arrayBufferToBase64(buffer);
      
      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-family: '${fontName}';
          src: url(data:font/${format};charset=utf-8;base64,${b64}) format('${format}');
        }
      `;
      document.head.appendChild(style);

      const opt = document.getElementById('customFontOption');
      opt.value = fontName;
      opt.textContent = `Custom: ${file.name}`;
      opt.style.display = 'block';
      
      document.getElementById('fontFamily').value = fontName;
      settings.fontFamily = fontName;
      renderResume();
      toast('Custom font loaded ✓');
    } catch (err) {
      toast('Failed to load font');
      console.error(err);
    } finally {
      hideLoading();
    }
  });

  // ---- section visibility ----
  document.querySelectorAll('[data-section]').forEach(cb => {
    cb.addEventListener('change', () => {
      settings.visibleSections[cb.dataset.section] = cb.checked;
      renderResume();
    });
  });

  // ---- paper size ----
  document.querySelectorAll('[name="paperSize"]').forEach(r => {
    r.addEventListener('change', () => {
      settings.paperSize = r.value;
      const paper = document.getElementById('resumePreview');
      paper.style.width = r.value === 'letter' ? '816px' : '794px';
      renderResume();
    });
  });

  // ---- zoom ----
  document.getElementById('zoomIn').addEventListener('click',  () => changeZoom(0.1));
  document.getElementById('zoomOut').addEventListener('click', () => changeZoom(-0.1));

  function changeZoom(delta) {
    zoom = Math.min(2, Math.max(0.4, zoom + delta));
    applyZoom();
  }

  function applyZoom() {
    document.getElementById('previewScaleWrapper').style.transform = `scale(${zoom})`;
    document.getElementById('zoomLevel').textContent = Math.round(zoom * 100) + '%';
  }

  // ---- import modal ----
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importModal').classList.add('open');
  });

  document.getElementById('importModalClose').addEventListener('click', closeModal);

  document.getElementById('importModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  function closeModal() {
    document.getElementById('importModal').classList.remove('open');
  }

  document.querySelectorAll('.import-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.import-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.import-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  // JSON file drop-zone
  setupDropZone('jsonDropZone', 'jsonFileInput', async file => {
    const text = await file.text();
    if (importFromJson(text)) {
      syncFormToData();
      renderAllEditors();
      renderResume();
      closeModal();
      toast('Resume imported ✓');
    } else {
      toast('Couldn\'t parse that JSON file');
    }
  });

  // LinkedIn drop-zone
  setupDropZone('linkedinDropZone', 'linkedinFileInput', async file => {
    const text = await file.text();
    if (importFromJson(text)) {
      syncFormToData();
      renderAllEditors();
      renderResume();
      closeModal();
      toast('LinkedIn profile imported ✓');
    } else {
      toast('Couldn\'t parse LinkedIn data');
    }
  });

  // PDF drop-zone
  setupDropZone('pdfDropZone', 'pdfFileInput', async file => {
    const progress = document.getElementById('pdfProgress');
    const fill = document.getElementById('pdfProgressFill');
    progress.style.display = 'block';
    fill.style.width = '0%';

    try {
      const ok = await importFromPdf(file, pct => {
        fill.style.width = pct + '%';
      });
      if (ok) {
        syncFormToData();
        renderAllEditors();
        renderResume();
        closeModal();
        toast('PDF parsed — check and adjust fields');
      } else {
        toast('PDF parsing failed');
      }
    } catch (e) {
      toast('PDF error: ' + e.message);
    } finally {
      progress.style.display = 'none';
    }
  });

  // paste text
  document.getElementById('parseTextBtn').addEventListener('click', () => {
    const text = document.getElementById('pasteTextarea').value.trim();
    if (!text) return;
    
    // Simple block-based parsing fallback
    parseRawText(text);
    
    syncFormToData();
    renderAllEditors();
    renderResume();
    closeModal();
    toast('Text parsed — review and adjust fields');
  });

  // ---- export ----
  document.getElementById('copyJsonBtn').addEventListener('click', () => {
    const json = JSON.stringify(resumeData, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      toast('Resume JSON copied to clipboard ✓');
    }).catch(err => {
      toast('Failed to copy JSON');
      console.error(err);
    });
  });

  document.getElementById('exportJsonBtn').addEventListener('click', exportJson);

  document.getElementById('exportPdfBtn').addEventListener('click', () => {
    showPdfExportOptionsModal(async (customSettings) => {
      showLoading('Generating PDF...');
      try {
        await exportPdf(customSettings);
        toast('PDF downloaded ✓');
      } catch (e) {
        toast('PDF export failed: ' + e.message);
        console.error(e);
      } finally {
        hideLoading();
      }
    });
  });

  // ---- mobile panel switching ----
  document.getElementById('mobileEditorBtn').addEventListener('click',    () => showMobilePanel('editor'));
  document.getElementById('mobilePreviewBtn').addEventListener('click',   () => showMobilePanel('preview'));
  document.getElementById('mobileCustomizeBtn').addEventListener('click', () => showMobilePanel('customize'));

  function showMobilePanel(which) {
    const panels = { editor: 'editorPanel', preview: 'previewPanel', customize: 'customizePanel' };
    const btns   = { editor: 'mobileEditorBtn', preview: 'mobilePreviewBtn', customize: 'mobileCustomizeBtn' };
    Object.keys(panels).forEach(k => {
      document.getElementById(panels[k]).classList.toggle('mobile-active', k === which);
      document.getElementById(btns[k]).classList.toggle('active', k === which);
    });
  }

  // ---------------------------------------------------------------

  function setupDropZone(zoneId, inputId, handler) {
    const zone  = document.getElementById(zoneId);
    const input = document.getElementById(inputId);

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragging'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragging');
      const file = e.dataTransfer.files[0];
      if (file) handler(file);
    });

    if (input) {
      input.addEventListener('change', () => {
        if (input.files[0]) handler(input.files[0]);
        input.value = '';
      });
    }
  }

  function syncFormToData() {
    const p = resumeData.personal;
    Object.keys(p).forEach(key => {
      const el = document.querySelector(`[data-field="${key}"]`);
      if (el) el.value = p[key] || '';
    });
    const summaryEl = document.getElementById('summary');
    if (summaryEl) summaryEl.value = resumeData.summary || '';
  }

  function renderAllEditors() {
    renderExperienceEditor();
    renderEducationEditor();
    renderSkillsEditor();
    renderProjectsEditor();
    renderCertsEditor();
    renderLanguagesEditor();
    renderSectionOrderEditor();
  }

  // ---- dynamic editors ----

  function renderExperienceEditor() {
    const list = document.getElementById('experienceList');
    list.innerHTML = resumeData.experience.map((e, i) => `
      <div class="entry-card">
        <div class="entry-card-header">
          <div class="entry-card-title">${e.company || e.title || 'New Entry'}</div>
          <div class="entry-card-actions">
            ${i > 0 ? `<button class="btn-icon" onclick="moveEntry('experience',${i},-1)">↑</button>` : ''}
            ${i < resumeData.experience.length - 1 ? `<button class="btn-icon" onclick="moveEntry('experience',${i},1)">↓</button>` : ''}
            <button class="btn-icon del" onclick="deleteEntry('experience','${e.id}')">✕</button>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Company</label>
            <input value="${esc2(e.company)}" oninput="updateEntry('experience','${e.id}','company',this.value)" /></div>
          <div class="form-group"><label>Title</label>
            <input value="${esc2(e.title)}" oninput="updateEntry('experience','${e.id}','title',this.value)" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Start</label>
            <input value="${esc2(e.start)}" placeholder="MM/YYYY" oninput="updateEntry('experience','${e.id}','start',this.value)" /></div>
          <div class="form-group"><label>End</label>
            <input value="${esc2(e.end)}" placeholder="MM/YYYY or Present" oninput="updateEntry('experience','${e.id}','end',this.value)" /></div>
        </div>
        <div class="form-group"><label>Location</label>
          <input value="${esc2(e.location)}" oninput="updateEntry('experience','${e.id}','location',this.value)" /></div>
        <div class="form-group"><label>URL</label>
          <input value="${esc2(e.url)}" placeholder="https://..." oninput="updateEntry('experience','${e.id}','url',this.value)" /></div>
        <div class="form-group"><label>Description</label>
          <textarea rows="3" oninput="updateEntry('experience','${e.id}','description',this.value)">${esc2(e.description)}</textarea></div>
      </div>
    `).join('');
  }

  function renderEducationEditor() {
    const list = document.getElementById('educationList');
    list.innerHTML = resumeData.education.map((e, i) => `
      <div class="entry-card">
        <div class="entry-card-header">
          <div class="entry-card-title">${e.institution || 'New Entry'}</div>
          <div class="entry-card-actions">
            ${i > 0 ? `<button class="btn-icon" onclick="moveEntry('education',${i},-1)">↑</button>` : ''}
            ${i < resumeData.education.length - 1 ? `<button class="btn-icon" onclick="moveEntry('education',${i},1)">↓</button>` : ''}
            <button class="btn-icon del" onclick="deleteEntry('education','${e.id}')">✕</button>
          </div>
        </div>
        <div class="form-group"><label>Institution</label>
          <input value="${esc2(e.institution)}" oninput="updateEntry('education','${e.id}','institution',this.value)" /></div>
        <div class="form-row">
          <div class="form-group"><label>Degree</label>
            <input value="${esc2(e.degree)}" oninput="updateEntry('education','${e.id}','degree',this.value)" /></div>
          <div class="form-group"><label>Field of Study</label>
            <input value="${esc2(e.field)}" oninput="updateEntry('education','${e.id}','field',this.value)" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Start</label>
            <input value="${esc2(e.start)}" placeholder="YYYY" oninput="updateEntry('education','${e.id}','start',this.value)" /></div>
          <div class="form-group"><label>End</label>
            <input value="${esc2(e.end)}" placeholder="YYYY" oninput="updateEntry('education','${e.id}','end',this.value)" /></div>
        </div>
        <div class="form-group"><label>GPA (optional)</label>
          <input value="${esc2(e.gpa)}" oninput="updateEntry('education','${e.id}','gpa',this.value)" /></div>
      </div>
    `).join('');
  }

  function renderProjectsEditor() {
    const list = document.getElementById('projectsList');
    list.innerHTML = resumeData.projects.map((p, i) => `
      <div class="entry-card">
        <div class="entry-card-header">
          <div class="entry-card-title">${p.name || 'New Project'}</div>
          <div class="entry-card-actions">
            ${i > 0 ? `<button class="btn-icon" onclick="moveEntry('projects',${i},-1)">↑</button>` : ''}
            ${i < resumeData.projects.length - 1 ? `<button class="btn-icon" onclick="moveEntry('projects',${i},1)">↓</button>` : ''}
            <button class="btn-icon del" onclick="deleteEntry('projects','${p.id}')">✕</button>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Name</label>
            <input value="${esc2(p.name)}" oninput="updateEntry('projects','${p.id}','name',this.value)" /></div>
          <div class="form-group"><label>Tech Stack</label>
            <input value="${esc2(p.tech)}" placeholder="React, Node.js" oninput="updateEntry('projects','${p.id}','tech',this.value)" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Start</label>
            <input value="${esc2(p.start)}" placeholder="MM/YYYY" oninput="updateEntry('projects','${p.id}','start',this.value)" /></div>
          <div class="form-group"><label>End</label>
            <input value="${esc2(p.end)}" placeholder="MM/YYYY" ${p.current ? 'disabled' : ''} oninput="updateEntry('projects','${p.id}','end',this.value)" /></div>
        </div>
        <div style="margin-bottom: 12px;">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.75rem; color:var(--text-dim);">
            <input type="checkbox" ${p.current ? 'checked' : ''} onchange="updateEntry('projects','${p.id}','current',this.checked); renderProjectsEditor();" /> Currently Working
          </label>
        </div>
        <div class="form-group"><label>URL</label>
          <input value="${esc2(p.url)}" placeholder="https://..." oninput="updateEntry('projects','${p.id}','url',this.value)" /></div>
        <div class="form-group"><label>Description</label>
          <textarea rows="3" oninput="updateEntry('projects','${p.id}','description',this.value)">${esc2(p.description)}</textarea></div>
      </div>
    `).join('');
  }

  function renderCertsEditor() {
    const list = document.getElementById('certificationsList');
    list.innerHTML = resumeData.certifications.map((c, i) => `
      <div class="entry-card">
        <div class="entry-card-header">
          <div class="entry-card-title">${c.name || 'New Certification'}</div>
          <div class="entry-card-actions">
            ${i > 0 ? `<button class="btn-icon" onclick="moveEntry('certifications',${i},-1)">↑</button>` : ''}
            ${i < resumeData.certifications.length-1 ? `<button class="btn-icon" onclick="moveEntry('certifications',${i},1)">↓</button>` : ''}
            <button class="btn-icon del" onclick="deleteEntry('certifications','${c.id}')">✕</button>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Name</label>
            <input value="${esc2(c.name)}" oninput="updateEntry('certifications','${c.id}','name',this.value)" /></div>
          <div class="form-group"><label>Issuer</label>
            <input value="${esc2(c.issuer)}" oninput="updateEntry('certifications','${c.id}','issuer',this.value)" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Date</label>
            <input value="${esc2(c.date)}" placeholder="MM/YYYY" oninput="updateEntry('certifications','${c.id}','date',this.value)" /></div>
          <div class="form-group"><label>URL</label>
            <input value="${esc2(c.url)}" oninput="updateEntry('certifications','${c.id}','url',this.value)" /></div>
        </div>
      </div>
    `).join('');
  }

  function renderSkillsEditor() {
    const list = document.getElementById('skillsList');
    list.innerHTML = `<div class="skills-chips">${
      resumeData.skills.map(s => `
        <div class="chip">
          <span class="chip-label">${esc2(s.name)}</span>
          <span class="chip-level">${s.level}</span>
          <button class="chip-remove" onclick="removeSkill('${s.id}')">×</button>
        </div>
      `).join('')
    }</div>`;
  }

  function renderLanguagesEditor() {
    const list = document.getElementById('languagesList');
    list.innerHTML = `<div class="langs-chips">${
      resumeData.languages.map(l => `
        <div class="chip">
          <span class="chip-label">${esc2(l.name)}</span>
          <span class="chip-level">${l.level}</span>
          <button class="chip-remove" onclick="removeLang('${l.id}')">×</button>
        </div>
      `).join('')
    }</div>`;
  }

  // ---- resizer logic ----
  // ---- resizer logic ----
  setupResizer('editorResizer', '--editor-w', 260, 600, 'left');
  setupResizer('customizeResizer', '--customize-w', 240, 500, 'right');

  function setupResizer(id, cssVar, min, max, side) {
    const resizer = document.getElementById(id);
    if (!resizer) return;
    let isDragging = false;

    resizer.addEventListener('mousedown', () => {
      isDragging = true;
      resizer.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      // Add a transparent overlay to prevent iframe issues if any
      const overlay = document.createElement('div');
      overlay.id = 'resizer-overlay';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.zIndex = '9999';
      overlay.style.cursor = 'col-resize';
      document.body.appendChild(overlay);
    });

    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      let w;
      if (side === 'left') {
        w = e.clientX;
      } else {
        w = window.innerWidth - e.clientX;
      }
      if (w < min) w = min;
      if (w > max) w = max;
      document.documentElement.style.setProperty(cssVar, w + 'px');
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      resizer.classList.remove('dragging');
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      const overlay = document.getElementById('resizer-overlay');
      if (overlay) overlay.remove();
      
      saveToCache();
    });
  }

  // expose to inline onclick handlers
  window.updateEntry = (section, id, field, value) => {
    const entry = resumeData[section].find(e => e.id === id);
    if (entry) { entry[field] = value; renderResume(); }
  };

  window.deleteEntry = (section, id) => {
    resumeData[section] = resumeData[section].filter(e => e.id !== id);
    renderAllEditors();
    renderResume();
  };

  window.moveEntry = (section, idx, dir) => {
    const arr = resumeData[section];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    renderAllEditors();
    renderResume();
  };

  window.removeSkill = (id) => {
    resumeData.skills = resumeData.skills.filter(s => s.id !== id);
    renderSkillsEditor();
    renderResume();
  };

  window.removeLang = (id) => {
    resumeData.languages = resumeData.languages.filter(l => l.id !== id);
    renderLanguagesEditor();
    renderResume();
  };
  window.moveSection = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= settings.sectionOrder.length) return;
    [settings.sectionOrder[idx], settings.sectionOrder[target]] = [settings.sectionOrder[target], settings.sectionOrder[idx]];
    renderSectionOrderEditor();
    renderResume();
    saveToCache();
  };

  function renderSectionOrderEditor() {
    const list = document.getElementById('sectionOrderList');
    if (!list) return;
    list.innerHTML = settings.sectionOrder.map((s, i) => `
      <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-card); padding:6px 10px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
        <span style="text-transform:capitalize; font-weight:500;">${s}</span>
        <div style="display:flex; gap:4px;">
          ${i > 0 ? `<button class="btn-icon" onclick="moveSection(${i},-1)" title="Move Up">↑</button>` : '<div style="width:24px"></div>'}
          ${i < settings.sectionOrder.length - 1 ? `<button class="btn-icon" onclick="moveSection(${i},1)" title="Move Down">↓</button>` : '<div style="width:24px"></div>'}
        </div>
      </div>
    `).join('');
  }

  // Periodic Autosave (every 7 seconds)
  setInterval(() => {
    if (typeof window.saveToCache === 'function') {
      window.saveToCache();
    }
  }, 7000);
});

// ---- helpers ----

function applyAccent() {
  document.documentElement.style.setProperty('--accent', settings.accent);
}

function showLoading(msg) {
  document.getElementById('loadingText').textContent = msg || 'Processing...';
  document.getElementById('loadingOverlay').classList.add('visible');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('visible');
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// same as esc() in renderer but available here too
function esc2(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// ---- Pagination Controls ----
document.addEventListener('DOMContentLoaded', () => {
  const toolbar = document.createElement('div');
  toolbar.id = 'pagination-toolbar';
  toolbar.innerHTML = `
    <button id="page-push-prev" title="Force to stay on this page">⬆️ Pull Up</button>
    <button id="page-push-next" title="Force to start on next page">⬇️ Push Down</button>
    <button id="page-push-reset" title="Reset pagination override for this block">🔄 Auto</button>
  `;
  document.body.appendChild(toolbar);

  let activeBlockIdx = null;
  const previewPanel = document.getElementById('resumePreview');
  
  previewPanel.addEventListener('mouseover', (e) => {
    const block = e.target.closest('[data-block-idx]');
    if (block) {
      activeBlockIdx = block.getAttribute('data-block-idx');
      
      const rect = block.getBoundingClientRect();
      toolbar.style.display = 'flex';
      toolbar.style.top = (rect.top + window.scrollY - 34) + 'px';
      toolbar.style.left = (rect.left + window.scrollX + rect.width - toolbar.offsetWidth) + 'px';
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!e.target.closest('#resumePreview') && !e.target.closest('#pagination-toolbar')) {
      toolbar.style.display = 'none';
      activeBlockIdx = null;
    }
  });

  document.getElementById('page-push-prev').addEventListener('click', () => {
    if (activeBlockIdx !== null) {
      if (!settings.pageBreaks) settings.pageBreaks = {};
      settings.pageBreaks[activeBlockIdx] = 'prev';
      renderResume();
      saveToCache();
    }
  });

  document.getElementById('page-push-next').addEventListener('click', () => {
    if (activeBlockIdx !== null) {
      if (!settings.pageBreaks) settings.pageBreaks = {};
      settings.pageBreaks[activeBlockIdx] = 'next';
      renderResume();
      saveToCache();
    }
  });

  document.getElementById('page-push-reset').addEventListener('click', () => {
    if (activeBlockIdx !== null && settings.pageBreaks) {
      delete settings.pageBreaks[activeBlockIdx];
      renderResume();
      saveToCache();
    }
  });
});

function showPdfExportOptionsModal(onConfirm) {
  // Check if modal already exists, remove it
  const existing = document.getElementById('pdf-export-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'pdf-export-modal';
  modal.className = 'modal-overlay';
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.background = 'rgba(0, 0, 0, 0.6)';
  modal.style.backdropFilter = 'blur(10px)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '2000';

  modal.innerHTML = `
    <div style="background: #16181d; border: 1px solid #464554; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 8px 32px rgba(0,0,0,0.4); animation: fadeInUp 0.3s ease;">
      <h3 style="margin-top:0; margin-bottom:16px; font-family: var(--font-head); color: var(--text);">PDF Export Settings</h3>
      <p style="font-size:0.85rem; color: var(--text-dim); margin-bottom: 20px;">Adjust layout parameters specifically for this PDF download. Leave as is to use your current preview settings.</p>
      
      <div style="display:flex; flex-direction:column; gap:16px; margin-bottom:24px;">
        <div>
          <label style="display:block; font-size:0.75rem; color:var(--text-dim); margin-bottom:6px; font-weight:600; text-align:left;">FONT SIZE (PT)</label>
          <input type="number" id="pdf-font-size" value="${settings.fontSize}" min="6" max="24" step="0.5" style="width:100%; padding:10px; background:#262730; border:1px solid #464554; border-radius:6px; color:var(--text); box-sizing:border-box;" />
        </div>
        
        <div>
          <label style="display:block; font-size:0.75rem; color:var(--text-dim); margin-bottom:6px; font-weight:600; text-align:left;">LINE SPACING</label>
          <input type="number" id="pdf-line-spacing" value="${settings.lineSpacing}" min="0.8" max="3.0" step="0.05" style="width:100%; padding:10px; background:#262730; border:1px solid #464554; border-radius:6px; color:var(--text); box-sizing:border-box;" />
        </div>
        
        <div>
          <label style="display:block; font-size:0.75rem; color:var(--text-dim); margin-bottom:6px; font-weight:600; text-align:left;">PAGE MARGIN (PX)</label>
          <input type="number" id="pdf-page-margin" value="${settings.pageMargin}" min="10" max="150" step="5" style="width:100%; padding:10px; background:#262730; border:1px solid #464554; border-radius:6px; color:var(--text); box-sizing:border-box;" />
        </div>
      </div>
      
      <div style="display:flex; justify-content:flex-end; gap:12px;">
        <button id="pdf-cancel-btn" class="btn-secondary" style="padding:10px 16px; border-radius:6px; font-weight:500; cursor:pointer; background:transparent; border:1px solid #464554; color:#e2e2eb;">Cancel</button>
        <button id="pdf-export-btn" class="btn-primary" style="padding:10px 20px; border-radius:6px; font-weight:500; cursor:pointer; background:var(--accent); border:none; color:white;">Download PDF</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();

  document.getElementById('pdf-cancel-btn').addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  document.getElementById('pdf-export-btn').addEventListener('click', () => {
    const fontSize = parseFloat(document.getElementById('pdf-font-size').value) || settings.fontSize;
    const lineSpacing = parseFloat(document.getElementById('pdf-line-spacing').value) || settings.lineSpacing;
    const pageMargin = parseInt(document.getElementById('pdf-page-margin').value) || settings.pageMargin;
    close();
    onConfirm({ fontSize, lineSpacing, pageMargin });
  });
}
