// renderer.js — builds the resume HTML from data + settings

function renderResume() {
  const el = document.getElementById('resumePreview');
  const s = settings;
  const d = resumeData;

  // paper size
  el.className = 'resume-paper' + (s.paperSize === 'letter' ? ' letter' : '');
  el.style.fontFamily = `'${s.fontFamily}', sans-serif`;
  el.style.fontSize = s.fontSize + 'pt';
  el.style.lineHeight = s.lineSpacing;

  // inject accent CSS var into the paper (templates read it)
  el.style.setProperty('--accent', s.accent);

  const show = s.visibleSections;
  const m = s.pageMargin + 'px';

  let html = '';

  switch (s.template) {
    case 'modern':   html = tplModern(d, show, s.accent, m);    break;
    case 'classic':  html = tplClassic(d, show, s.accent, m);   break;
    case 'minimal':  html = tplMinimal(d, show, s.accent, m);   break;
    case 'executive':html = tplExecutive(d, show, s.accent, m); break;
    case 'creative': html = tplCreative(d, show, s.accent, m);  break;
    default:         html = tplModern(d, show, s.accent, m);
  }

  el.innerHTML = html;
}

// ---- shared helpers ----

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function contactItems(p) {
  const items = [];
  if (p.email)    items.push(esc(p.email));
  if (p.phone)    items.push(esc(p.phone));
  if (p.location) items.push(esc(p.location));
  if (p.website)  items.push(esc(p.website.replace(/^https?:\/\//, '')));
  if (p.linkedin) items.push(esc(p.linkedin.replace(/^https?:\/\//, '')));
  if (p.github)   items.push(esc(p.github.replace(/^https?:\/\//, '')));
  return items;
}

function formatDateRange(start, end, current) {
  if (!start && !end) return '';
  const s = start || '';
  const e = current ? 'Present' : (end || '');
  return [s, e].filter(Boolean).join(' – ');
}

function renderExperience(list) {
  if (!list.length) return '';
  return list.map(e => `
    <div class="res-entry">
      <div class="res-entry-header">
        <div>
          <div class="res-entry-title">${esc(e.title || 'Title')}</div>
          <div class="res-entry-sub">${esc(e.company)}${e.location ? ` · ${esc(e.location)}` : ''}</div>
        </div>
        <div class="res-entry-date">${formatDateRange(e.start, e.end, e.current)}</div>
      </div>
      ${e.description ? `<div class="res-entry-desc">${esc(e.description)}</div>` : ''}
    </div>
  `).join('');
}

function renderEducation(list) {
  if (!list.length) return '';
  return list.map(e => `
    <div class="res-entry">
      <div class="res-entry-header">
        <div>
          <div class="res-entry-title">${esc(e.institution || 'Institution')}</div>
          <div class="res-entry-sub">${[e.degree, e.field].filter(Boolean).map(esc).join(', ')}${e.gpa ? ` · GPA: ${esc(e.gpa)}` : ''}</div>
        </div>
        <div class="res-entry-date">${formatDateRange(e.start, e.end, false)}</div>
      </div>
      ${e.description ? `<div class="res-entry-desc">${esc(e.description)}</div>` : ''}
    </div>
  `).join('');
}

function renderSkills(list, chipBg, chipColor) {
  if (!list.length) return '';
  return `<div class="res-skills-list">${
    list.map(s => `<span class="res-skill-chip" style="background:${chipBg};color:${chipColor}">${esc(s.name)}</span>`).join('')
  }</div>`;
}

function renderProjects(list) {
  if (!list.length) return '';
  return list.map(p => `
    <div class="res-entry">
      <div class="res-entry-title">${esc(p.name || 'Project')}</div>
      ${p.tech ? `<div class="res-entry-sub">${esc(p.tech)}</div>` : ''}
      ${p.description ? `<div class="res-entry-desc">${esc(p.description)}</div>` : ''}
      ${p.url ? `<div class="res-entry-link">${esc(p.url)}</div>` : ''}
    </div>
  `).join('');
}

function renderCerts(list) {
  if (!list.length) return '';
  return list.map(c => `
    <div class="res-entry">
      <div class="res-entry-header">
        <div>
          <div class="res-entry-title">${esc(c.name || 'Certification')}</div>
          ${c.issuer ? `<div class="res-entry-sub">${esc(c.issuer)}</div>` : ''}
        </div>
        ${c.date ? `<div class="res-entry-date">${esc(c.date)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function renderLanguages(list) {
  if (!list.length) return '';
  return `<div class="res-skills-list">${
    list.map(l => `<span class="res-skill-chip" style="background:#f0f0f0;color:#333">${esc(l.name)}${l.level ? ` · ${esc(l.level)}` : ''}</span>`).join('')
  }</div>`;
}

// ---- section block helper ----
function section(label, content, accentColor) {
  if (!content || !content.trim()) return '';
  return `
    <div class="res-section" style="color:${accentColor}">
      <div class="res-section-title">${label}</div>
      <div style="color: inherit">${content}</div>
    </div>
  `;
}

// ================================================================
// TEMPLATES
// ================================================================

function tplModern(d, show, accent, margin) {
  const p = d.personal;
  const contacts = contactItems(p);
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';

  const body = [
    show.summary && d.summary ? section('Summary', `<p style="color:#333;font-size:0.92em;line-height:1.6">${esc(d.summary)}</p>`, accent) : '',
    show.experience && d.experience.length ? section('Experience', renderExperience(d.experience), accent) : '',
    show.education && d.education.length  ? section('Education',  renderEducation(d.education),   accent) : '',
    show.projects && d.projects.length    ? section('Projects',   renderProjects(d.projects),      accent) : '',
    show.skills && d.skills.length        ? section('Skills',     renderSkills(d.skills, 'rgba(0,0,0,0.06)', '#333'), accent) : '',
    show.certifications && d.certifications.length ? section('Certifications', renderCerts(d.certifications), accent) : '',
    show.languages && d.languages.length  ? section('Languages',  renderLanguages(d.languages),    accent) : '',
  ].join('');

  return `
    <div class="tpl-modern" style="--accent:${accent}">
      <div class="res-header" style="background:${accent};padding:${margin}">
        <div style="display:flex; gap: 20px; align-items: center;">
          ${p.photo ? `<img src="${p.photo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.5)">` : ''}
          <div>
            <div class="res-name">${esc(name)}</div>
            ${p.jobTitle ? `<div class="res-jobtitle">${esc(p.jobTitle)}</div>` : ''}
            <div class="res-contact">${contacts.map(c => `<span>${c}</span>`).join('')}</div>
          </div>
        </div>
      </div>
      <div class="res-body" style="padding:${margin};padding-top:24px;color:#333">${body}</div>
    </div>
  `;
}

function tplClassic(d, show, accent, margin) {
  const p = d.personal;
  const contacts = contactItems(p);
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';

  const body = [
    show.summary && d.summary ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Profile</div><p style="color:#444;font-size:0.9em">${esc(d.summary)}</p></div>` : '',
    show.experience && d.experience.length ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Experience</div>${renderExperience(d.experience)}</div>` : '',
    show.education && d.education.length   ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Education</div>${renderEducation(d.education)}</div>` : '',
    show.projects && d.projects.length     ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Projects</div>${renderProjects(d.projects)}</div>` : '',
    show.skills && d.skills.length         ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Skills</div>${renderSkills(d.skills, '#f0f0f0', '#333')}</div>` : '',
    show.certifications && d.certifications.length ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Certifications</div>${renderCerts(d.certifications)}</div>` : '',
    show.languages && d.languages.length   ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Languages</div>${renderLanguages(d.languages)}</div>` : '',
  ].join('');

  return `
    <div class="tpl-classic" style="padding:${margin}">
      <div class="res-header">
        ${p.photo ? `<img src="${p.photo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:12px;">` : ''}
        <div class="res-name" style="color:${accent}">${esc(name)}</div>
        ${p.jobTitle ? `<div class="res-jobtitle">${esc(p.jobTitle)}</div>` : ''}
        <div class="res-contact">${contacts.map(c => `<span>${c}</span>`).join(' · ')}</div>
      </div>
      ${body}
    </div>
  `;
}

function tplMinimal(d, show, accent, margin) {
  const p = d.personal;
  const contacts = contactItems(p);
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';

  const body = [
    show.summary && d.summary ? `<div class="res-section"><div class="res-section-title">About</div><p style="color:#555;font-size:0.9em">${esc(d.summary)}</p></div>` : '',
    show.experience && d.experience.length ? `<div class="res-section"><div class="res-section-title">Work</div>${renderExperience(d.experience)}</div>` : '',
    show.education && d.education.length   ? `<div class="res-section"><div class="res-section-title">Education</div>${renderEducation(d.education)}</div>` : '',
    show.projects && d.projects.length     ? `<div class="res-section"><div class="res-section-title">Projects</div>${renderProjects(d.projects)}</div>` : '',
    show.skills && d.skills.length         ? `<div class="res-section"><div class="res-section-title">Skills</div>${renderSkills(d.skills, '#f5f5f5', '#444')}</div>` : '',
    show.certifications && d.certifications.length ? `<div class="res-section"><div class="res-section-title">Certifications</div>${renderCerts(d.certifications)}</div>` : '',
    show.languages && d.languages.length   ? `<div class="res-section"><div class="res-section-title">Languages</div>${renderLanguages(d.languages)}</div>` : '',
  ].join('');

  return `
    <div class="tpl-minimal" style="padding:${margin}">
      <div class="res-header" style="display:flex;justify-content:space-between;align-items:flex-end;">
        <div>
          <div class="res-name">${esc(name)}</div>
          ${p.jobTitle ? `<div class="res-jobtitle">${esc(p.jobTitle)}</div>` : ''}
          <div class="res-contact">${contacts.join('  ·  ')}</div>
        </div>
        ${p.photo ? `<img src="${p.photo}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;">` : ''}
      </div>
      <div class="res-accent-bar" style="background:${accent}"></div>
      <div style="color:#333">${body}</div>
    </div>
  `;
}

function tplExecutive(d, show, accent, margin) {
  const p = d.personal;
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';

  const sidebarContent = `
    <div class="res-sidebar-section">
      <div class="res-sidebar-title">Contact</div>
      ${p.email    ? `<div class="res-contact-item">${esc(p.email)}</div>` : ''}
      ${p.phone    ? `<div class="res-contact-item">${esc(p.phone)}</div>` : ''}
      ${p.location ? `<div class="res-contact-item">${esc(p.location)}</div>` : ''}
      ${p.website  ? `<div class="res-contact-item">${esc(p.website.replace(/^https?:\/\//, ''))}</div>` : ''}
      ${p.linkedin ? `<div class="res-contact-item">${esc(p.linkedin.replace(/^https?:\/\//, ''))}</div>` : ''}
      ${p.github   ? `<div class="res-contact-item">${esc(p.github.replace(/^https?:\/\//, ''))}</div>` : ''}
    </div>
    ${show.skills && d.skills.length ? `
      <div class="res-sidebar-section">
        <div class="res-sidebar-title">Skills</div>
        ${d.skills.map(s => `<div class="res-contact-item">${esc(s.name)}</div>`).join('')}
      </div>` : ''}
    ${show.languages && d.languages.length ? `
      <div class="res-sidebar-section">
        <div class="res-sidebar-title">Languages</div>
        ${d.languages.map(l => `<div class="res-contact-item">${esc(l.name)}${l.level ? ` (${l.level})` : ''}</div>`).join('')}
      </div>` : ''}
  `;

  const mainContent = [
    show.summary && d.summary ? `<div class="res-section"><div class="res-section-title" style="border-color:${accent};color:${accent}">Profile</div><p style="color:#444;font-size:0.9em">${esc(d.summary)}</p></div>` : '',
    show.experience && d.experience.length ? `<div class="res-section"><div class="res-section-title" style="border-color:${accent};color:${accent}">Experience</div>${renderExperience(d.experience)}</div>` : '',
    show.education && d.education.length   ? `<div class="res-section"><div class="res-section-title" style="border-color:${accent};color:${accent}">Education</div>${renderEducation(d.education)}</div>` : '',
    show.projects && d.projects.length     ? `<div class="res-section"><div class="res-section-title" style="border-color:${accent};color:${accent}">Projects</div>${renderProjects(d.projects)}</div>` : '',
    show.certifications && d.certifications.length ? `<div class="res-section"><div class="res-section-title" style="border-color:${accent};color:${accent}">Certifications</div>${renderCerts(d.certifications)}</div>` : '',
  ].join('');

  return `
    <div class="tpl-executive">
      <div class="res-sidebar" style="background:${accent};padding:${margin}">
        ${p.photo ? `<img src="${p.photo}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;margin-bottom:20px;border:3px solid rgba(255,255,255,0.2);">` : ''}
        <div class="res-name">${esc(name)}</div>
        ${p.jobTitle ? `<div class="res-jobtitle">${esc(p.jobTitle)}</div>` : ''}
        ${sidebarContent}
      </div>
      <div class="res-main" style="padding:${margin};">${mainContent}</div>
    </div>
  `;
}

function tplCreative(d, show, accent, margin) {
  const p = d.personal;
  const contacts = contactItems(p);
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';
  const initials = [p.firstName?.[0], p.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'RG';

  const body = [
    show.summary && d.summary ? `<div class="res-section" style="color:${accent}"><div class="res-section-title">About</div><p style="color:#444;font-size:0.9em">${esc(d.summary)}</p></div>` : '',
    show.experience && d.experience.length ? `<div class="res-section" style="color:${accent}"><div class="res-section-title">Experience</div>${renderExperience(d.experience)}</div>` : '',
    show.education && d.education.length   ? `<div class="res-section" style="color:${accent}"><div class="res-section-title">Education</div>${renderEducation(d.education)}</div>` : '',
    show.projects && d.projects.length     ? `<div class="res-section" style="color:${accent}"><div class="res-section-title">Projects</div>${renderProjects(d.projects)}</div>` : '',
    show.skills && d.skills.length         ? `<div class="res-section" style="color:${accent}"><div class="res-section-title">Skills</div>${renderSkills(d.skills, accent, '#fff')}</div>` : '',
    show.certifications && d.certifications.length ? `<div class="res-section" style="color:${accent}"><div class="res-section-title">Certifications</div>${renderCerts(d.certifications)}</div>` : '',
    show.languages && d.languages.length   ? `<div class="res-section" style="color:${accent}"><div class="res-section-title">Languages</div>${renderLanguages(d.languages)}</div>` : '',
  ].join('');

  return `
    <div class="tpl-creative" style="padding:${margin}">
      <div class="res-header">
        ${p.photo 
          ? `<img src="${p.photo}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;flex-shrink:0;">` 
          : `<div class="res-avatar">${initials}</div>`
        }
        <div>
          <div class="res-name" style="color:#111">${esc(name)}</div>
          ${p.jobTitle ? `<div class="res-jobtitle">${esc(p.jobTitle)}</div>` : ''}
          <div class="res-contact">${contacts.join(' · ')}</div>
        </div>
      </div>
      ${body}
    </div>
  `;
}
