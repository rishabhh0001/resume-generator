// renderer.js — builds the resume HTML from data + settings

function renderResume() {
  const el = document.getElementById('resumePreview');
  const s = settings;
  const d = resumeData;

  // paper size - base class only, actual pages handle dimensions
  el.className = 'resume-paper-container' + (s.paperSize === 'letter' ? ' letter' : '');
  el.style.fontFamily = `'${s.fontFamily}', sans-serif`;
  el.style.fontSize = s.fontSize + 'pt';
  el.style.lineHeight = s.lineSpacing;
  el.style.setProperty('--accent', s.accent);

  const show = s.visibleSections;
  const m = s.pageMargin + 'px';

  let rawHtml = '';
  switch (s.template) {
    case 'modern':   rawHtml = tplModern(d, show, s.accent, m);    break;
    case 'classic':  rawHtml = tplClassic(d, show, s.accent, m);   break;
    case 'minimal':  rawHtml = tplMinimal(d, show, s.accent, m);   break;
    case 'executive':rawHtml = tplExecutive(d, show, s.accent, m); break;
    case 'creative': rawHtml = tplCreative(d, show, s.accent, m);  break;
    case 'atspro':   rawHtml = tplAtsPro(d, show, s.accent, m);    break;
    case 'tech':     rawHtml = tplTech(d, show, s.accent, m);      break;
    case 'bold':     rawHtml = tplBold(d, show, s.accent, m);      break;
    case 'compact':  rawHtml = tplCompact(d, show, s.accent, m);   break;
    case 'serif':    rawHtml = tplSerif(d, show, s.accent, m);     break;
    default:         rawHtml = tplModern(d, show, s.accent, m);
  }

  // Paginate the raw HTML
  const paginatedHtml = paginate(rawHtml, s.paperSize);
  el.innerHTML = paginatedHtml;

  if (typeof window.saveToCache === 'function') {
    window.saveToCache();
  }
}

function paginate(html, paperSize) {
  // Create a hidden measurement div
  const temp = document.createElement('div');
  temp.style.position = 'absolute';
  temp.style.width = paperSize === 'letter' ? '816px' : '794px'; // Approx width for A4/Letter
  temp.style.visibility = 'hidden';
  temp.style.left = '-9999px';
  temp.style.fontFamily = document.getElementById('resumePreview').style.fontFamily;
  temp.style.fontSize = document.getElementById('resumePreview').style.fontSize;
  temp.style.lineHeight = document.getElementById('resumePreview').style.lineHeight;
  temp.innerHTML = html;
  document.body.appendChild(temp);

  // Constants for A4/Letter heights in pixels (approx)
  const pageHeightLimit = paperSize === 'letter' ? 1056 : 1123;
  const padding = settings.pageMargin || 40;
  const maxContentHeight = pageHeightLimit - (padding * 2);

  // We expect the template to return a main container (like .tpl-modern)
  // We want to process its children (Header + Body contents)
  const root = temp.firstElementChild;
  if (!root) {
    document.body.removeChild(temp);
    return html;
  }

  const templateClass = root.className;
  const rootStyle = root.getAttribute('style') || '';
  const bodyStyle = body ? body.getAttribute('style') || '' : '';
  const bodyClass = body ? body.className : 'res-body';

  const blocks = [];
  if (header) {
    blocks.push({ html: header.outerHTML, height: header.offsetHeight, type: 'header' });
  }

  if (body) {
    Array.from(body.children).forEach((section, i) => {
      const sId = 'sec-' + i;
      const sClass = section.className;
      const sStyle = section.getAttribute('style') || '';
      
      Array.from(section.children).forEach(child => {
        blocks.push({
          html: child.outerHTML,
          height: child.offsetHeight,
          type: 'body',
          sectionId: sId,
          sectionClass: sClass,
          sectionStyle: sStyle
        });
      });
    });
  } else {
    // Fallback if no .res-body
    Array.from(root.children).forEach((section, i) => {
      if (section !== header) {
        const sId = 'sec-' + i;
        const sClass = section.className;
        const sStyle = section.getAttribute('style') || '';
        Array.from(section.children).forEach(child => {
          blocks.push({
            html: child.outerHTML,
            height: child.offsetHeight,
            type: 'body',
            sectionId: sId,
            sectionClass: sClass,
            sectionStyle: sStyle
          });
        });
      }
    });
  }

  const pages = [];
  let currentPageHeight = 0;
  let currentPageBlocks = [];

  blocks.forEach((block) => {
    if (currentPageHeight + block.height > maxContentHeight && currentPageBlocks.length > 0) {
      pages.push(currentPageBlocks);
      currentPageBlocks = [block];
      currentPageHeight = block.height;
    } else {
      currentPageBlocks.push(block);
      currentPageHeight += block.height;
    }
  });

  if (currentPageBlocks.length) {
    pages.push(currentPageBlocks);
  }

  document.body.removeChild(temp);

  const showPageNum = settings.visibleSections.pageNumber;
  const createPageHtml = (pageBlocks, pageNum, total) => {
    let headerHtml = '';
    let bodyBlocksHtml = '';
    let currentSectionId = null;
    let currentSectionContent = [];
    let currentSectionMeta = null;

    pageBlocks.forEach(b => {
      if (b.type === 'header') {
        headerHtml = b.html;
      } else {
        if (b.sectionId !== currentSectionId) {
          if (currentSectionMeta) {
            bodyBlocksHtml += `<div class="${currentSectionMeta.class}" style="${currentSectionMeta.style}">${currentSectionContent.join('')}</div>`;
          }
          currentSectionId = b.sectionId;
          currentSectionContent = [b.html];
          currentSectionMeta = { class: b.sectionClass, style: b.sectionStyle };
        } else {
          currentSectionContent.push(b.html);
        }
      }
    });

    if (currentSectionMeta) {
      bodyBlocksHtml += `<div class="${currentSectionMeta.class}" style="${currentSectionMeta.style}">${currentSectionContent.join('')}</div>`;
    }

    const finalBodyHtml = bodyBlocksHtml ? `<div class="${bodyClass}" style="${bodyStyle}">${bodyBlocksHtml}</div>` : '';

    return `
      <div class="resume-page ${paperSize === 'letter' ? 'letter' : ''}" style="padding: ${padding}px">
        <div class="${templateClass}" style="${rootStyle}; background:transparent; box-shadow:none; border:none; margin:0; padding:0; width:100%; height:100%; display:block;">
          <div class="page-content" style="width:100%; height:100%;">
            ${headerHtml}
            ${finalBodyHtml}
          </div>
        </div>
        ${showPageNum ? `<div class="page-footer">Page ${pageNum} of ${total}</div>` : ''}
      </div>
    `;
  };

  return pages.map((p, i) => createPageHtml(p, i + 1, pages.length)).join('');
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

function cleanUrl(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
}

function contactItems(p) {
  const items = [];
  
  if (p.email) {
    items.push(`<a href="mailto:${esc(p.email)}" class="res-link">${esc(p.email)}</a>`);
  }
  if (p.phone) {
    items.push(esc(p.phone));
  }
  if (p.location) {
    items.push(esc(p.location));
  }
  if (p.website) {
    items.push(`<a href="${esc(p.website)}" target="_blank" class="res-link">${esc(cleanUrl(p.website))}</a>`);
  }
  if (p.linkedin) {
    const icon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:4px;"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>`;
    const url = p.linkedin.startsWith('http') ? p.linkedin : `https://linkedin.com/in/${p.linkedin}`;
    items.push(`<a href="${esc(url)}" target="_blank" class="res-link">${icon}${esc(cleanUrl(p.linkedin))}</a>`);
  }
  if (p.github) {
    const icon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:4px;"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`;
    const url = p.github.startsWith('http') ? p.github : `https://github.com/in/${p.github}`;
    items.push(`<a href="${esc(url)}" target="_blank" class="res-link">${icon}${esc(cleanUrl(p.github))}</a>`);
  }
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
          <div class="res-entry-sub">
            ${esc(e.company)}${e.location ? ` · ${esc(e.location)}` : ''}${e.url ? ` ● <a href="${esc(e.url)}" target="_blank" data-pdf-url="${esc(e.url)}" class="cert-verify-link">Click to verify</a>` : ''}
          </div>
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
  const showLevel = settings.visibleSections.skillLevel;
  return `<div class="res-skills-list">${
    list.map(s => {
      const name = typeof s === 'string' ? s : s.name;
      const levelHtml = (typeof s === 'object' && showLevel && s.level) ? `<span style="opacity:0.8;font-size:0.9em"> · ${esc(s.level)}</span>` : '';
      return `<span class="res-skill-chip" style="background:${chipBg};color:${chipColor}">${esc(name)}${levelHtml}</span>`;
    }).join('')
  }</div>`;
}

function renderProjects(list) {
  if (!list.length) return '';
  return list.map(p => `
    <div class="res-entry">
      <div class="res-entry-header">
        <div>
          <div class="res-entry-title">${esc(p.name || 'Project')}</div>
          <div class="res-entry-sub">
            ${esc(p.tech || '')}${p.url ? ` ● <a href="${esc(p.url)}" target="_blank" data-pdf-url="${esc(p.url)}" class="cert-verify-link">Click for deployment</a>` : ''}
          </div>
        </div>
        <div class="res-entry-date">${formatDateRange(p.start, p.end, p.current)}</div>
      </div>
      ${p.description ? `<div class="res-entry-desc">${esc(p.description)}</div>` : ''}
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
          <div class="res-entry-sub">
            ${esc(c.issuer || '')}${c.url ? ` ● <a href="${esc(c.url)}" target="_blank" data-pdf-url="${esc(c.url)}" class="cert-verify-link">Click to verify</a>` : ''}
          </div>
        </div>
        ${c.date ? `<div class="res-entry-date">${esc(c.date)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function renderLanguages(list) {
  if (!list.length) return '';
  const showLevel = settings.visibleSections.languageLevel;
  return `<div class="res-skills-list">${
    list.map(l => {
      const levelHtml = (showLevel && l.level) ? `<span style="opacity:0.8;font-size:0.9em"> · ${esc(l.level)}</span>` : '';
      return `<span class="res-skill-chip" style="background:#f0f0f0;color:#333">${esc(l.name)}${levelHtml}</span>`;
    }).join('')
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
      ${p.email    ? `<div class="res-contact-item"><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></div>` : ''}
      ${p.phone    ? `<div class="res-contact-item">${esc(p.phone)}</div>` : ''}
      ${p.location ? `<div class="res-contact-item">${esc(p.location)}</div>` : ''}
      ${p.website  ? `<div class="res-contact-item"><a href="${esc(p.website)}" target="_blank">${esc(cleanUrl(p.website))}</a></div>` : ''}
      ${p.linkedin ? `<div class="res-contact-item"><a href="${p.linkedin.startsWith('http') ? esc(p.linkedin) : `https://linkedin.com/in/${esc(p.linkedin)}`}" target="_blank">${esc(cleanUrl(p.linkedin))}</a></div>` : ''}
      ${p.github   ? `<div class="res-contact-item"><a href="${p.github.startsWith('http') ? esc(p.github) : `https://github.com/${esc(p.github)}`}" target="_blank">${esc(cleanUrl(p.github))}</a></div>` : ''}
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

function tplAtsPro(d, show, accent, margin) {
  const p = d.personal;
  const contacts = contactItems(p);
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';
  
  const body = [
    show.summary && d.summary ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Summary</div><p style="color:#333;font-size:0.95em">${esc(d.summary)}</p></div>` : '',
    show.experience && d.experience.length ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Experience</div>${renderExperience(d.experience)}</div>` : '',
    show.education && d.education.length   ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Education</div>${renderEducation(d.education)}</div>` : '',
    show.projects && d.projects.length     ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Projects</div>${renderProjects(d.projects)}</div>` : '',
    show.skills && d.skills.length         ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Skills</div>${renderSkills(d.skills, '#f5f5f5', '#333')}</div>` : '',
    show.certifications && d.certifications.length ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Certifications</div>${renderCerts(d.certifications)}</div>` : '',
  ].filter(Boolean).join('');

  return `
    <div class="resume-body tpl-atspro" style="padding:${margin}">
      <div style="text-align:center; margin-bottom:24pt; border-bottom: 2pt solid #333; padding-bottom:12pt;">
        <div style="font-size:24pt; font-weight:700; text-transform:uppercase; letter-spacing:2pt">${esc(name)}</div>
        <div style="font-size:10pt; margin-top:8pt; word-spacing:4pt">${contacts.join('  |  ')}</div>
      </div>
      ${body}
    </div>
  `;
}

function tplTech(d, show, accent, margin) {
  const p = d.personal;
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';
  const contacts = contactItems(p);

  const body = [
    show.summary && d.summary ? `<div class="res-section"><div class="res-section-title">01_SUMMARY</div><p>${esc(d.summary)}</p></div>` : '',
    show.experience && d.experience.length ? `<div class="res-section"><div class="res-section-title">02_EXPERIENCE</div>${renderExperience(d.experience)}</div>` : '',
    show.skills && d.skills.length ? `<div class="res-section"><div class="res-section-title">03_STACK</div>${renderSkills(d.skills, 'rgba(0,0,0,0.05)', '#444')}</div>` : '',
    show.projects && d.projects.length ? `<div class="res-section"><div class="res-section-title">04_PROJECTS</div>${renderProjects(d.projects)}</div>` : '',
  ].filter(Boolean).join('');

  return `
    <div class="resume-body tpl-tech" style="padding:${margin}">
      <div style="border-bottom: 2pt solid var(--accent); padding-bottom:12pt; margin-bottom:24pt;">
        <div style="font-size:24pt; font-weight:700; color:var(--accent); letter-spacing:-1pt">SYSTEM: ${esc(name.toUpperCase())}</div>
        <div style="font-size:9pt; font-family:monospace; opacity:0.7;">> REF: ${contacts.join(' // ')}</div>
      </div>
      ${body}
    </div>
  `;
}

function tplBold(d, show, accent, margin) {
  const p = d.personal;
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';
  const contacts = contactItems(p);

  const body = [
    show.summary && d.summary ? `<div class="res-section"><div class="res-section-title">Profile</div><p>${esc(d.summary)}</p></div>` : '',
    show.experience && d.experience.length ? `<div class="res-section"><div class="res-section-title">Experience</div>${renderExperience(d.experience)}</div>` : '',
    show.skills && d.skills.length ? `<div class="res-section"><div class="res-section-title">Expertise</div>${renderSkills(d.skills, accent, '#fff')}</div>` : '',
  ].join('');

  return `
    <div class="resume-body tpl-bold">
      <div class="resume-header" style="background:${accent}; padding:40pt ${margin}">
        <div style="font-size:32pt; font-weight:900; line-height:1; letter-spacing:-1.5pt; color:white">${esc(name)}</div>
        ${p.jobTitle ? `<div style="font-size:14pt; margin-top:10pt; opacity:0.9; color:white; font-weight:600">${esc(p.jobTitle)}</div>` : ''}
        <div style="margin-top:20pt; font-size:10pt; color:white; opacity:0.8">${contacts.join('  ·  ')}</div>
      </div>
      <div style="padding:${margin}; padding-top:20pt;">
        ${body}
      </div>
    </div>
  `;
}

function tplCompact(d, show, accent, margin) {
  const p = d.personal;
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';
  const contacts = contactItems(p);

  return `
    <div class="resume-body tpl-compact" style="padding:15mm ${margin}">
      <div style="display:flex; justify-content:space-between; align-items:baseline; border-bottom:1pt solid #333; padding-bottom:6pt; margin-bottom:12pt;">
        <div style="font-size:18pt; font-weight:800; letter-spacing:-0.5pt">${esc(name)}</div>
        <div style="font-size:8.5pt; font-weight:500;">${contacts.join('  |  ')}</div>
      </div>
      ${show.summary && d.summary ? `<div class="res-section"><p style="font-size:9pt; margin-bottom:10pt">${esc(d.summary)}</p></div>` : ''}
      ${show.experience && d.experience.length ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Experience</div>${renderExperience(d.experience)}</div>` : ''}
      ${show.education && d.education.length   ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Education</div>${renderEducation(d.education)}</div>` : ''}
      ${show.skills && d.skills.length ? `<div class="res-section"><div class="res-section-title" style="color:${accent}">Skills</div>${renderSkills(d.skills, '#f0f0f0', '#333')}</div>` : ''}
    </div>
  `;
}

function tplSerif(d, show, accent, margin) {
  const p = d.personal;
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';
  const contacts = contactItems(p);

  const body = [
    show.summary && d.summary ? `<div class="res-section"><div class="res-section-title">Summary</div><p style="font-style:italic; font-family:serif; color:#444">${esc(d.summary)}</p></div>` : '',
    show.experience && d.experience.length ? `<div class="res-section"><div class="res-section-title">Experience</div>${renderExperience(d.experience)}</div>` : '',
    show.skills && d.skills.length ? `<div class="res-section"><div class="res-section-title">Skills</div>${renderSkills(d.skills, 'transparent', '#444')}</div>` : '',
  ].join('');

  return `
    <div class="resume-body tpl-serif" style="padding:${margin}">
      <div style="text-align:center; padding-bottom:40pt; border-bottom: 1pt solid #ddd; margin-bottom:24pt;">
        <div style="font-size:32pt; font-family:'Playfair Display', serif; color:#111">${esc(name)}</div>
        <div style="font-size:10.5pt; font-style:italic; margin-top:12pt; color:#666; letter-spacing:0.5pt">${contacts.join('  ·  ')}</div>
      </div>
      ${body}
    </div>
  `;
}
