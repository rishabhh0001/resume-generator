// importer.js — handles JSON, LinkedIn, PDF, and paste imports

// ---- JSON / LinkedIn ----

function importFromJson(json) {
  try {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;

    // check if it's our own format or LinkedIn's
    if (parsed.personal !== undefined) {
      // our own schema
      loadResumeData(parsed);
    } else if (parsed.firstName !== undefined || parsed.lastName !== undefined) {
      // flat personal object (some exports)
      loadResumeData({ personal: parsed });
    } else if (Array.isArray(parsed)) {
      // LinkedIn profile export is sometimes an array
      importLinkedIn(parsed[0] || parsed);
    } else {
      importLinkedIn(parsed);
    }
    return true;
  } catch (e) {
    console.error('JSON import failed:', e);
    return false;
  }
}

function importLinkedIn(raw) {
  // LinkedIn data export structure varies but commonly has these keys
  const p = resumeData.personal;

  if (raw.firstName)  p.firstName = raw.firstName;
  if (raw.lastName)   p.lastName  = raw.lastName;
  if (raw.headline)   resumeData.personal.jobTitle = raw.headline;
  if (raw.summary)    resumeData.summary = raw.summary;

  // location
  if (raw.geoLocationName) p.location = raw.geoLocationName;
  else if (raw.address)    p.location = raw.address;

  // contact info (often in a separate section in the zip)
  if (raw.emailAddress) p.email = raw.emailAddress;

  // experience
  const positions = raw.positions?.values || raw.Experience || [];
  resumeData.experience = positions.slice(0, 10).map(pos => ({
    id: makeId(),
    company:     pos.companyName || pos.Company || '',
    title:       pos.title || pos.Title || '',
    location:    pos.location?.name || pos.Location || '',
    start:       formatLIDate(pos.startDate || pos.StartDate),
    end:         formatLIDate(pos.endDate || pos.EndDate),
    current:     !pos.endDate && !pos.EndDate,
    description: pos.description || pos.Description || ''
  }));

  // education
  const edu = raw.educations?.values || raw.Education || [];
  resumeData.education = edu.slice(0, 5).map(e => ({
    id:          makeId(),
    institution: e.schoolName || e.School || '',
    degree:      e.degree || e.DegreeName || '',
    field:       e.fieldOfStudy || e.FieldOfStudy || '',
    start:       e.startDate?.year ? String(e.startDate.year) : (e.StartDate || ''),
    end:         e.endDate?.year   ? String(e.endDate.year)   : (e.EndDate   || ''),
    description: e.description || e.Activities || ''
  }));

  // skills
  const skills = raw.skills?.values || raw.Skills || [];
  resumeData.skills = skills.slice(0, 20).map(s => ({
    id:    makeId(),
    name:  s.skill?.name || s.Name || (typeof s === 'string' ? s : ''),
    level: 'intermediate'
  }));
}

function formatLIDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  if (d.year && d.month) return `${String(d.month).padStart(2,'0')}/${d.year}`;
  if (d.year) return String(d.year);
  return '';
}

function loadResumeData(parsed) {
  if (!parsed) return;

  // 1. Personal Info - Normalize fields
  const p = parsed.personal || {};
  const targetP = resumeData.personal;
  
  // Map common variations
  targetP.firstName = p.firstName || p.first_name || p.name?.split(' ')[0] || '';
  targetP.lastName  = p.lastName  || p.last_name  || p.name?.split(' ').slice(1).join(' ') || '';
  targetP.jobTitle  = p.jobTitle  || p.title || p.headline || '';
  targetP.email     = p.email     || p.emailAddress || '';
  targetP.phone     = p.phone     || p.phoneNumber || '';
  targetP.location  = p.location  || p.address || p.geoLocationName || '';
  targetP.website   = p.website   || p.url || '';
  targetP.linkedin  = p.linkedin  || '';
  targetP.github    = p.github    || '';
  targetP.photo     = p.photo     || '';

  // 2. Summary
  resumeData.summary = parsed.summary || parsed.objective || '';

  // 3. Helper to ensure IDs in arrays
  const ensureIds = (arr, emptyFn) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => ({
      ...emptyFn(), // gets default structure + new ID
      ...item,      // overwrites with imported data
      id: item.id || makeId() // forces an ID if missing
    }));
  };

  // 4. Update Arrays
  resumeData.experience   = ensureIds(parsed.experience, emptyExperience);
  resumeData.education    = ensureIds(parsed.education, emptyEducation);
  resumeData.skills       = ensureIds(parsed.skills || parsed.Skills, () => ({ name: '', level: 'intermediate' }));
  resumeData.projects     = ensureIds(parsed.projects, emptyProject);
  resumeData.certifications = ensureIds(parsed.certifications, emptyCert);
  resumeData.languages    = ensureIds(parsed.languages, () => ({ name: '', level: 'Professional' }));

  // 5. Explicitly notify the app to sync UI
  if (typeof syncFormToData === 'function') syncFormToData();
  if (typeof renderAllEditors === 'function') renderAllEditors();
  if (typeof renderResume === 'function') renderResume();
}

// ---- PDF import ----

async function importFromPdf(file, onProgress) {
  if (typeof pdfjsLib === 'undefined') {
    console.warn('pdf.js not loaded');
    return false;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const arrayBuf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + '\n';
    if (onProgress) onProgress(i / pdf.numPages * 100);
  }



  parseRawText(fullText);
  return true;
}

// ---- text paste parser ----

function parseRawText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return;

  // first non-empty line is usually the name
  const nameParts = lines[0].split(/\s+/);
  if (nameParts.length >= 2) {
    resumeData.personal.firstName = nameParts[0];
    resumeData.personal.lastName  = nameParts.slice(1).join(' ');
  }

  // scan for email + phone anywhere in the first 10 lines
  const header = lines.slice(0, 10).join(' ');
  const emailMatch = header.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) resumeData.personal.email = emailMatch[0];

  const phoneMatch = header.match(/[\+\d][\d\s\-().]{7,}/);
  if (phoneMatch) resumeData.personal.phone = phoneMatch[0].trim();

  // look for linkedin / github
  const urlMatch = header.match(/linkedin\.com\/in\/[^\s]+/i);
  if (urlMatch) resumeData.personal.linkedin = urlMatch[0];

  const ghMatch = header.match(/github\.com\/[^\s]+/i);
  if (ghMatch) resumeData.personal.github = ghMatch[0];

  // find a "summary" block
  const summaryIdx = lines.findIndex(l =>
    /^(summary|profile|about|objective)/i.test(l)
  );
  if (summaryIdx !== -1 && lines[summaryIdx + 1]) {
    resumeData.summary = lines.slice(summaryIdx + 1, summaryIdx + 4).join(' ');
  }

  // job title is often the 2nd line if it isn't contact info
  if (lines[1] && !lines[1].includes('@') && !/^\d/.test(lines[1])) {
    resumeData.personal.jobTitle = lines[1];
  }
}
