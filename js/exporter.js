function exportJson() {
  const blob = new Blob([JSON.stringify(resumeData, null, 2)], { type: 'application/json' });
  const name = getFullName().replace(/\s+/g, '_') || 'resume';
  triggerDownload(blob, `${name}_resume.json`);
}

async function exportPdf() {
  window.print();
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}