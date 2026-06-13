function exportJson() {
  const blob = new Blob([JSON.stringify(resumeData, null, 2)], { type: 'application/json' });
  const name = getFullName().replace(/\s+/g, '_') || 'resume';
  triggerDownload(blob, `${name}_resume.json`);
}

async function exportPdf(customSettings = {}) {
  const originalSettings = {
    fontSize: settings.fontSize,
    lineSpacing: settings.lineSpacing,
    pageMargin: settings.pageMargin
  };

  if (customSettings.fontSize !== undefined) settings.fontSize = customSettings.fontSize;
  if (customSettings.lineSpacing !== undefined) settings.lineSpacing = customSettings.lineSpacing;
  if (customSettings.pageMargin !== undefined) settings.pageMargin = customSettings.pageMargin;

  renderResume();

  window.print();

  const restore = () => {
    settings.fontSize = originalSettings.fontSize;
    settings.lineSpacing = originalSettings.lineSpacing;
    settings.pageMargin = originalSettings.pageMargin;
    renderResume();
  };

  window.addEventListener('afterprint', restore, { once: true });
  setTimeout(restore, 1000);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}