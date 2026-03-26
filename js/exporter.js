// exporter.js — PDF and JSON export

// ---- JSON ----

function exportJson() {
  const blob = new Blob([JSON.stringify(resumeData, null, 2)], { type: 'application/json' });
  const name = getFullName().replace(/\s+/g, '_') || 'resume';
  triggerDownload(blob, `${name}_resume.json`);
}

// ---- PDF ----

async function exportPdf() {
  const wrapper = document.getElementById('previewScaleWrapper');
  const pages = document.querySelectorAll('.resume-page');
  
  if (!pages.length) {
    toast('No pages to export');
    return;
  }

  // temporarily reset scale so the capture is full-res
  const prevTransform = wrapper.style.transform;
  wrapper.style.transform = 'scale(1)';

  try {
    const isLetter = settings.paperSize === 'letter';
    const { jsPDF } = window.jspdf;
    const fw = isLetter ? 215.9 : 210;
    const fh = isLetter ? 279.4 : 297;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: isLetter ? 'letter' : 'a4' });

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];
      if (i > 0) pdf.addPage();

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, fw, fh);

      // Extract and add links for this specific page
      const pageRect = pageEl.getBoundingClientRect();
      const pxToMm = fw / pageRect.width;
      
      const pageLinks = Array.from(pageEl.querySelectorAll('a[data-pdf-url], .res-contact a'));
      pageLinks.forEach(el => {
        const rect = el.getBoundingClientRect();
        const url = el.getAttribute('data-pdf-url') || el.getAttribute('href');
        if (url) {
          pdf.link(
            (rect.left - pageRect.left) * pxToMm,
            (rect.top - pageRect.top) * pxToMm,
            rect.width * pxToMm,
            rect.height * pxToMm,
            { url }
          );
        }
      });
    }

    wrapper.style.transform = prevTransform;
    const name = getFullName().replace(/\s+/g, '_') || 'resume';
    pdf.save(`${name}_resume.pdf`);
  } catch (err) {
    wrapper.style.transform = prevTransform;
    console.error('PDF Export Error:', err);
    toast('Export failed. Check console.');
  }
}

// ---- utility ----

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
