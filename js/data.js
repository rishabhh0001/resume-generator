// data.js — resume state + schema

const defaultResume = {
  personal: {
    firstName: '', lastName: '', jobTitle: '',
    email: '', phone: '', location: '',
    website: '', linkedin: '', github: '',
    photo: '' // base64 string
  },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: []
};

// the actual live state
let resumeData = JSON.parse(JSON.stringify(defaultResume));

// visual settings
let settings = {
  template: 'modern',
  accent: '#6366f1',
  fontFamily: 'Inter',
  fontSize: 11,
  lineSpacing: 1.5,
  pageMargin: 40,
  paperSize: 'a4',
  visibleSections: {
    summary: true, experience: true, education: true,
    skills: true, projects: true, certifications: true, languages: true
  }
};

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyExperience() {
  return { id: makeId(), company: '', title: '', location: '', start: '', end: '', current: false, description: '', url: '' };
}

function emptyEducation() {
  return { id: makeId(), institution: '', degree: '', field: '', start: '', end: '', gpa: '', description: '' };
}

function emptyProject() {
  return { id: makeId(), name: '', description: '', url: '', tech: '' };
}

function emptyCert() {
  return { id: makeId(), name: '', issuer: '', date: '', url: '' };
}

function getFullName() {
  const { firstName, lastName } = resumeData.personal;
  return [firstName, lastName].filter(Boolean).join(' ') || 'Your Name';
}
