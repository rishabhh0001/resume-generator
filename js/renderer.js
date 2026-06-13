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

  const getOuterHeight = (el) => {
    const style = window.getComputedStyle(el);
    const marginTop = parseFloat(style.marginTop) || 0;
    const marginBottom = parseFloat(style.marginBottom) || 0;
    let height = el.offsetHeight + marginTop + marginBottom;
    
    const parent = el.parentElement;
    if (parent && (parent.classList.contains('res-section') || parent.classList.contains('resume-section')) && parent.lastElementChild === el) {
      const parentStyle = window.getComputedStyle(parent);
      const parentMarginBottom = parseFloat(parentStyle.marginBottom) || 0;
      height += parentMarginBottom;
    }
    return height;
  };

  // Constants for A4/Letter heights in pixels (approx)
  const pageHeightLimit = paperSize === 'letter' ? 1056 : 1123;
  const padding = settings.pageMargin || 40;
  const maxContentHeight = pageHeightLimit - (padding + 80);

  // We expect the template to return a main container (like .tpl-modern)
  // We want to process its children (Header + Body contents)
  const root = temp.firstElementChild;
  if (!root) {
    document.body.removeChild(temp);
    return html;
  }

  // Ensure the root in the temp measurement container has the exact same width constraint as it will in the padded resume page
  const rootWidth = (paperSize === 'letter' ? 816 : 794) - (2 * padding);
  root.style.width = rootWidth + 'px';
  root.style.boxSizing = 'border-box';

  const header = root.querySelector('.res-header, .resume-header');
  const body = root.querySelector('.res-body, .resume-body, .res-content');
  const templateClass = root.className;
  const rootStyle = root.getAttribute('style') || '';
  const bodyStyle = body ? body.getAttribute('style') || '' : '';
  const bodyClass = body ? body.className : 'res-body';

  const blocks = [];
  if (header) {
    blocks.push({ html: header.outerHTML, height: getOuterHeight(header), type: 'header' });
  }

  let blockIdx = 0;
  if (body) {
    Array.from(body.children).forEach((section, i) => {
      const sId = 'sec-' + i;
      const sClass = section.className;
      const sStyle = section.getAttribute('style') || '';
      
      const children = Array.from(section.children);
      children.forEach((child, idx) => {
        child.setAttribute('data-block-idx', blockIdx);
        blocks.push({
          index: blockIdx,
          html: child.outerHTML,
          height: getOuterHeight(child),
          type: 'body',
          sectionId: sId,
          sectionClass: sClass,
          sectionStyle: sStyle,
          isHeader: child.classList.contains('res-section-title') || child.classList.contains('res-sidebar-title')
        });
        blockIdx++;
      });
    });
  } else {
    // Fallback if no .res-body
    Array.from(root.children).forEach((section, i) => {
      if (section !== header) {
        const sId = 'sec-' + i;
        const sClass = section.className;
        const sStyle = section.getAttribute('style') || '';
        const children = Array.from(section.children);
        children.forEach((child, idx) => {
          child.setAttribute('data-block-idx', blockIdx);
          blocks.push({
            index: blockIdx,
            html: child.outerHTML,
            height: getOuterHeight(child),
            type: 'body',
            sectionId: sId,
            sectionClass: sClass,
            sectionStyle: sStyle,
            isHeader: child.classList.contains('res-section-title') || child.classList.contains('res-sidebar-title')
          });
          blockIdx++;
        });
      }
    });
  }

  const pages = [];
  let currentPageHeight = 0;
  let currentPageBlocks = [];

  blocks.forEach((block, index) => {
    let nextBlockHeight = 0;
    if (block.isHeader && index + 1 < blocks.length) {
      nextBlockHeight = blocks[index + 1].height;
    }

    let force = settings.pageBreaks && settings.pageBreaks[block.index];

    if (force === 'next') {
      if (currentPageBlocks.length > 0) {
        pages.push(currentPageBlocks);
        currentPageBlocks = [];
        currentPageHeight = 0;
      }
      currentPageBlocks.push(block);
      currentPageHeight += block.height;
    } else if (force === 'prev') {
      currentPageBlocks.push(block);
      currentPageHeight += block.height;
    } else if (currentPageHeight + block.height + nextBlockHeight > maxContentHeight && currentPageBlocks.length > 0) {
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
      <div class="resume-page ${paperSize === 'letter' ? 'letter' : ''}" style="padding: ${padding}px ${padding}px 80px ${padding}px">
        <div class="${templateClass}" style="${rootStyle}; background:transparent; box-shadow:none; border:none; margin:0; padding:0; width:100%; height:100%; display:block;">
          <div class="page-content" style="width:100%; height:100%;">
            ${headerHtml}
            ${finalBodyHtml}
          </div>
        </div>
        ${showPageNum ? `<div class="page-footer" style="bottom: 30px">Page ${pageNum} of ${total}</div>` : ''}
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
    items.push(`<a href="${esc(p.website)}" target="_blank" rel="noopener noreferrer" class="res-link">${esc(cleanUrl(p.website))}</a>`);
  }
  if (p.linkedin) {
    const icon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:4px;"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>`;
    const url = p.linkedin.startsWith('http') ? p.linkedin : `https://linkedin.com/in/${p.linkedin}`;
    items.push(`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="res-link">${icon}${esc(cleanUrl(p.linkedin))}</a>`);
  }
  if (p.github) {
    const icon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:4px;"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`;
    const url = p.github.startsWith('http') ? p.github : `https://github.com/in/${p.github}`;
    items.push(`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="res-link">${icon}${esc(cleanUrl(p.github))}</a>`);
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
    <article class="res-entry">
      <header class="res-entry-header">
        <div>
          <h3 class="res-entry-title" style="margin:0;">${esc(e.title || 'Title')}</h3>
          <div class="res-entry-sub">
            <strong>${esc(e.company)}</strong>${e.location ? ` · ${esc(e.location)}` : ''}${e.url ? ` ● <a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer" data-pdf-url="${esc(e.url)}" class="cert-verify-link">Click to verify</a>` : ''}
          </div>
        </div>
        <div class="res-entry-date">${formatDateRange(e.start, e.end, e.current)}</div>
      </header>
      ${e.description ? `<div class="res-entry-desc">${esc(e.description)}</div>` : ''}
    </article>
  `).join('');
}

function renderEducation(list) {
  if (!list.length) return '';
  return list.map(e => `
    <article class="res-entry">
      <header class="res-entry-header">
        <div>
          <h3 class="res-entry-title" style="margin:0;">${esc(e.institution || 'Institution')}</h3>
          <div class="res-entry-sub">${[e.degree, e.field].filter(Boolean).map(esc).join(', ')}${e.gpa ? ` · GPA: ${esc(e.gpa)}` : ''}</div>
        </div>
        <div class="res-entry-date">${formatDateRange(e.start, e.end, false)}</div>
      </header>
      ${e.description ? `<div class="res-entry-desc">${esc(e.description)}</div>` : ''}
    </article>
  `).join('');
}

function renderSkills(list, chipBg, chipColor) {
  if (!list.length) return '';
  const showLevel = settings.visibleSections.skillLevel;
  return `<ul class="res-skills-list" style="margin:0;padding:0;list-style:none;">${
    list.map(s => {
      const name = typeof s === 'string' ? s : s.name;
      const levelHtml = (typeof s === 'object' && showLevel && s.level) ? `<span style="opacity:0.8;font-size:0.9em"> · ${esc(s.level)}</span>` : '';
      return `<li class="res-skill-chip" style="background:${chipBg};color:${chipColor}">${esc(name)}${levelHtml}</li>`;
    }).join('')
  }</ul>`;
}

function renderProjects(list) {
  if (!list.length) return '';
  return list.map(p => `
    <article class="res-entry">
      <header class="res-entry-header">
        <div>
          <h3 class="res-entry-title" style="margin:0;">${esc(p.name || 'Project')}</h3>
          <div class="res-entry-sub">
            ${esc(p.tech || '')}${p.url ? ` ● <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" data-pdf-url="${esc(p.url)}" class="cert-verify-link">Click for deployment</a>` : ''}
          </div>
        </div>
        <div class="res-entry-date">${formatDateRange(p.start, p.end, p.current)}</div>
      </header>
      ${p.description ? `<div class="res-entry-desc">${esc(p.description)}</div>` : ''}
    </article>
  `).join('');
}

function renderCerts(list) {
  if (!list.length) return '';
  return list.map(c => `
    <article class="res-entry">
      <header class="res-entry-header">
        <div>
          <h3 class="res-entry-title" style="margin:0;">${esc(c.name || 'Certification')}</h3>
          <div class="res-entry-sub">
            ${esc(c.issuer || '')}${c.url ? ` ● <a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer" data-pdf-url="${esc(c.url)}" class="cert-verify-link">Click to verify</a>` : ''}
          </div>
        </div>
        ${c.date ? `<div class="res-entry-date">${esc(c.date)}</div>` : ''}
      </header>
    </article>
  `).join('');
}

function renderLanguages(list) {
  if (!list.length) return '';
  const showLevel = settings.visibleSections.languageLevel;
  return `<ul class="res-skills-list" style="margin:0;padding:0;list-style:none;">${
    list.map(l => {
      const levelHtml = (showLevel && l.level) ? `<span style="opacity:0.8;font-size:0.9em"> · ${esc(l.level)}</span>` : '';
      return `<li class="res-skill-chip" style="background:#f0f0f0;color:#333">${esc(l.name)}${levelHtml}</li>`;
    }).join('')
  }</ul>`;
}

// ---- section block helper ----
function section(label, content, accentColor) {
  if (!content || !content.trim()) return '';
  return `
    <section class="res-section" style="color:${accentColor}">
      <h2 class="res-section-title" style="margin:0;margin-bottom:8px;">${label}</h2>
      ${content}
    </section>
  `;
}

// ================================================================
// SECTION ORDERING HELPER
// ================================================================
function getOrderedBody(d, show, accent, customSectionRenderer) {
  const order = settings.sectionOrder || ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages'];
  return order.map(s => {
    if (!show[s]) return '';
    switch(s) {
      case 'summary': return d.summary ? (customSectionRenderer ? customSectionRenderer('Summary', `<p style="font-size:0.92em;line-height:1.6">${esc(d.summary)}</p>`) : section('Summary', `<p style="font-size:0.92em;line-height:1.6">${esc(d.summary)}</p>`, accent)) : '';
      case 'experience': return d.experience.length ? (customSectionRenderer ? customSectionRenderer('Experience', renderExperience(d.experience)) : section('Experience', renderExperience(d.experience), accent)) : '';
      case 'education': return d.education.length ? (customSectionRenderer ? customSectionRenderer('Education', renderEducation(d.education)) : section('Education', renderEducation(d.education), accent)) : '';
      case 'projects': return d.projects.length ? (customSectionRenderer ? customSectionRenderer('Projects', renderProjects(d.projects)) : section('Projects', renderProjects(d.projects), accent)) : '';
      case 'skills': return d.skills.length ? (customSectionRenderer ? customSectionRenderer('Skills', renderSkills(d.skills, 'rgba(0,0,0,0.06)', '#333')) : section('Skills', renderSkills(d.skills, 'rgba(0,0,0,0.06)', '#333'), accent)) : '';
      case 'certifications': return d.certifications.length ? (customSectionRenderer ? customSectionRenderer('Certifications', renderCerts(d.certifications)) : section('Certifications', renderCerts(d.certifications), accent)) : '';
      case 'languages': return d.languages.length ? (customSectionRenderer ? customSectionRenderer('Languages', renderLanguages(d.languages)) : section('Languages', renderLanguages(d.languages), accent)) : '';
      default: return '';
    }
  }).join('');
}

// ================================================================
// TEMPLATES
// ================================================================

function tplModern(d, show, accent, margin) {
  const p = d.personal;
  const contacts = contactItems(p);
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';

  const body = getOrderedBody(d, show, accent);

  return `
    <div class="tpl-modern" style="--accent:${accent}">
      <header class="res-header" style="background:${accent};padding:${margin}">
        <div style="display:flex; gap: 20px; align-items: center;">
          ${p.photo ? `<img src="${p.photo}" alt="Profile Photo" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.5)">` : ''}
          <div>
            <h1 class="res-name" style="margin:0;">${esc(name)}</h1>
            ${p.jobTitle ? `<div class="res-jobtitle">${esc(p.jobTitle)}</div>` : ''}
            <address class="res-contact" style="font-style:normal;">${contacts.map(c => `<span>${c}</span>`).join('')}</address>
          </div>
        </div>
      </header>
      <main class="res-body" style="padding:${margin};padding-top:24px;color:#333">${body}</main>
    </div>
  `;
}

function tplClassic(d, show, accent, margin) {
  const p = d.personal;
  const contacts = contactItems(p);
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';

  const body = getOrderedBody(d, show, accent, (lbl, content) => {
    return `<section class="res-section"><h2 class="res-section-title" style="color:${accent};margin:0;margin-bottom:8px;">${lbl}</h2>${content}</section>`;
  });

  return `
    <div class="tpl-classic" style="padding:${margin}">
      <header class="res-header">
        ${p.photo ? `<img src="${p.photo}" alt="Profile Photo" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:12px;">` : ''}
        <h1 class="res-name" style="color:${accent};margin:0;">${esc(name)}</h1>
        ${p.jobTitle ? `<div class="res-jobtitle">${esc(p.jobTitle)}</div>` : ''}
        <address class="res-contact" style="font-style:normal;">${contacts.map(c => `<span>${c}</span>`).join(' · ')}</address>
      </header>
      <main class="res-body">${body}</main>
    </div>
  `;
}

function tplMinimal(d, show, accent, margin) {
  const p = d.personal;
  const contacts = contactItems(p);
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';

  const body = getOrderedBody(d, show, accent, (lbl, content) => {
    return `<section class="res-section"><h2 class="res-section-title" style="margin:0;margin-bottom:8px;">${lbl}</h2>${content}</section>`;
  });

  return `
    <div class="tpl-minimal" style="padding:${margin}">
      <header class="res-header" style="display:flex;justify-content:space-between;align-items:flex-end;">
        <div>
          <h1 class="res-name" style="margin:0;">${esc(name)}</h1>
          ${p.jobTitle ? `<div class="res-jobtitle">${esc(p.jobTitle)}</div>` : ''}
          <address class="res-contact" style="font-style:normal;">${contacts.join('  ·  ')}</address>
        </div>
        ${p.photo ? `<img src="${p.photo}" alt="Profile Photo" style="width:72px;height:72px;border-radius:50%;object-fit:cover;">` : ''}
      </header>
      <div class="res-accent-bar" style="background:${accent}"></div>
      <main class="res-body" style="color:#333">${body}</main>
    </div>
  `;
}

function tplExecutive(d, show, accent, margin) {
  const p = d.personal;
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';

  const sidebarContent = `
    <section class="res-sidebar-section">
      <h2 class="res-sidebar-title" style="margin:0;margin-bottom:8px;">Contact</h2>
      ${p.email    ? `<div class="res-contact-item"><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></div>` : ''}
      ${p.phone    ? `<div class="res-contact-item">${esc(p.phone)}</div>` : ''}
      ${p.location ? `<div class="res-contact-item">${esc(p.location)}</div>` : ''}
      ${p.website  ? `<div class="res-contact-item"><a href="${esc(p.website)}" target="_blank">${esc(cleanUrl(p.website))}</a></div>` : ''}
      ${p.linkedin ? `<div class="res-contact-item"><a href="${p.linkedin.startsWith('http') ? esc(p.linkedin) : `https://linkedin.com/in/${esc(p.linkedin)}`}" target="_blank">${esc(cleanUrl(p.linkedin))}</a></div>` : ''}
      ${p.github   ? `<div class="res-contact-item"><a href="${p.github.startsWith('http') ? esc(p.github) : `https://github.com/${esc(p.github)}`}" target="_blank">${esc(cleanUrl(p.github))}</a></div>` : ''}
    </section>
    ${show.skills && d.skills.length ? `
      <section class="res-sidebar-section">
        <h2 class="res-sidebar-title" style="margin:0;margin-bottom:8px;">Skills</h2>
        ${d.skills.map(s => `<div class="res-contact-item">${esc(s.name)}</div>`).join('')}
      </section>` : ''}
    ${show.languages && d.languages.length ? `
      <section class="res-sidebar-section">
        <h2 class="res-sidebar-title" style="margin:0;margin-bottom:8px;">Languages</h2>
        ${d.languages.map(l => `<div class="res-contact-item">${esc(l.name)}${l.level ? ` (${l.level})` : ''}</div>`).join('')}
      </section>` : ''}
  `;

  const mainContent = getOrderedBody(d, show, accent, (lbl, content) => {
    // Executive has a specific title style
    if (['skills', 'languages'].includes(lbl.toLowerCase())) return ''; // Handled in sidebar
    return `<section class="res-section"><h2 class="res-section-title" style="border-color:${accent};color:${accent};margin:0;margin-bottom:8px;">${lbl}</h2>${content}</section>`;
  });

  return `
    <div class="tpl-executive">
      <aside class="res-sidebar" style="background:${accent};padding:${margin}">
        ${p.photo ? `<img src="${p.photo}" alt="Profile Photo" style="width:100px;height:100px;border-radius:50%;object-fit:cover;margin-bottom:20px;border:3px solid rgba(255,255,255,0.2);">` : ''}
        <h1 class="res-name" style="margin:0;margin-bottom:8px;">${esc(name)}</h1>
        ${p.jobTitle ? `<div class="res-jobtitle">${esc(p.jobTitle)}</div>` : ''}
        ${sidebarContent}
      </aside>
      <main class="res-main" style="padding:${margin};">${mainContent}</main>
    </div>
  `;
}

function tplCreative(d, show, accent, margin) {
  const p = d.personal;
  const contacts = contactItems(p);
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';
  const initials = [p.firstName?.[0], p.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'RG';

  const body = getOrderedBody(d, show, accent, (lbl, content) => {
    if (lbl === 'Skills') content = renderSkills(d.skills, accent, '#fff');
    if (lbl === 'Summary') return `<section class="res-section" style="color:${accent}"><h2 class="res-section-title" style="margin:0;margin-bottom:8px;">About</h2><p style="color:#444;font-size:0.9em">${esc(d.summary)}</p></section>`;
    return `<section class="res-section" style="color:${accent}"><h2 class="res-section-title" style="margin:0;margin-bottom:8px;">${lbl}</h2>${content}</section>`;
  });

  return `
    <div class="tpl-creative" style="padding:${margin}">
      <header class="res-header">
        ${p.photo 
          ? `<img src="${p.photo}" alt="Profile Photo" style="width:64px;height:64px;border-radius:50%;object-fit:cover;flex-shrink:0;">` 
          : `<div class="res-avatar">${initials}</div>`
        }
        <div>
          <h1 class="res-name" style="color:#111;margin:0;">${esc(name)}</h1>
          ${p.jobTitle ? `<div class="res-jobtitle">${esc(p.jobTitle)}</div>` : ''}
          <address class="res-contact" style="font-style:normal;">${contacts.join(' · ')}</address>
        </div>
      </header>
      <main>${body}</main>
    </div>
  `;
}

function tplAtsPro(d, show, accent, margin) {
  const p = d.personal;
  const contacts = contactItems(p);
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';
  
  const body = getOrderedBody(d, show, accent, (lbl, content) => {
    return `<section class="res-section"><h2 class="res-section-title" style="color:${accent};margin:0;margin-bottom:8px;">${lbl}</h2>${content}</section>`;
  });

  return `
    <div class="resume-body tpl-atspro" style="padding:${margin}">
      <header style="text-align:center; margin-bottom:24pt; border-bottom: 2pt solid #333; padding-bottom:12pt;">
        <h1 style="font-size:24pt; font-weight:700; text-transform:uppercase; letter-spacing:2pt; margin:0;">${esc(name)}</h1>
        <address style="font-size:10pt; margin-top:8pt; word-spacing:4pt; font-style:normal;">${contacts.join('  |  ')}</address>
      </header>
      <main class="res-body">${body}</main>
    </div>
  `;
}

function tplTech(d, show, accent, margin) {
  const p = d.personal;
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';
  const contacts = contactItems(p);

  const body = getOrderedBody(d, show, accent, (lbl, content) => {
    return `<section class="res-section"><h2 class="res-section-title" style="margin:0;margin-bottom:8px;">${lbl.toUpperCase()}</h2>${content}</section>`;
  });

  return `
    <div class="resume-body tpl-tech" style="padding:${margin}">
      <header style="border-bottom: 2pt solid var(--accent); padding-bottom:12pt; margin-bottom:24pt;">
        <h1 style="font-size:24pt; font-weight:700; color:var(--accent); letter-spacing:-1pt; margin:0;">SYSTEM: ${esc(name.toUpperCase())}</h1>
        <address style="font-size:9pt; font-family:monospace; opacity:0.7; font-style:normal; margin-top:8px;">> REF: ${contacts.join(' // ')}</address>
      </header>
      <main class="res-body">${body}</main>
    </div>
  `;
}

function tplBold(d, show, accent, margin) {
  const p = d.personal;
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';
  const contacts = contactItems(p);

  const body = getOrderedBody(d, show, accent, (lbl, content) => {
    if (lbl === 'Skills') content = renderSkills(d.skills, accent, '#fff');
    return `<section class="res-section"><h2 class="res-section-title" style="margin:0;margin-bottom:8px;">${lbl}</h2>${content}</section>`;
  });

  return `
    <div class="resume-body tpl-bold">
      <header class="resume-header" style="background:${accent}; padding:40pt ${margin}">
        <h1 style="font-size:32pt; font-weight:900; line-height:1; letter-spacing:-1.5pt; color:white; margin:0;">${esc(name)}</h1>
        ${p.jobTitle ? `<div style="font-size:14pt; margin-top:10pt; opacity:0.9; color:white; font-weight:600">${esc(p.jobTitle)}</div>` : ''}
        <address style="margin-top:20pt; font-size:10pt; color:white; opacity:0.8; font-style:normal;">${contacts.join('  ·  ')}</address>
      </header>
      <main style="padding:${margin}; padding-top:20pt;">
        ${body}
      </main>
    </div>
  `;
}

function tplCompact(d, show, accent, margin) {
  const p = d.personal;
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';
  const contacts = contactItems(p);

  const body = getOrderedBody(d, show, accent, (lbl, content) => {
    if (lbl === 'Summary') return `<section class="res-section"><p style="font-size:9pt; margin-bottom:10pt">${esc(d.summary)}</p></section>`;
    if (lbl === 'Skills') content = renderSkills(d.skills, '#f0f0f0', '#333');
    return `<section class="res-section"><h2 class="res-section-title" style="color:${accent};margin:0;margin-bottom:8px;">${lbl}</h2>${content}</section>`;
  });

  return `
    <div class="resume-body tpl-compact" style="padding:15mm ${margin}">
      <header style="display:flex; justify-content:space-between; align-items:baseline; border-bottom:1pt solid #333; padding-bottom:6pt; margin-bottom:12pt;">
        <h1 style="font-size:18pt; font-weight:800; letter-spacing:-0.5pt; margin:0;">${esc(name)}</h1>
        <address style="font-size:8.5pt; font-weight:500; font-style:normal;">${contacts.join('  |  ')}</address>
      </header>
      <main class="res-body">
        ${body}
      </main>
    </div>
  `;
}

function tplSerif(d, show, accent, margin) {
  const p = d.personal;
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your Name';
  const contacts = contactItems(p);

  const body = getOrderedBody(d, show, accent, (lbl, content) => {
    if (lbl === 'Summary') return `<section class="res-section"><h2 class="res-section-title" style="margin:0;margin-bottom:8px;">Summary</h2><p style="font-style:italic; font-family:serif; color:#444">${esc(d.summary)}</p></section>`;
    if (lbl === 'Skills') content = renderSkills(d.skills, 'transparent', '#444');
    return `<section class="res-section"><h2 class="res-section-title" style="margin:0;margin-bottom:8px;">${lbl}</h2>${content}</section>`;
  });

  return `
    <div class="resume-body tpl-serif" style="padding:${margin}">
      <header style="text-align:center; padding-bottom:40pt; border-bottom: 1pt solid #ddd; margin-bottom:24pt;">
        <h1 style="font-size:32pt; font-family:'Playfair Display', serif; color:#111; margin:0;">${esc(name)}</h1>
        <address style="font-size:10.5pt; font-style:italic; margin-top:12pt; color:#666; letter-spacing:0.5pt; font-style:normal;">${contacts.join('  ·  ')}</address>
      </header>
      <main class="res-body">${body}</main>
    </div>
  `;
}
