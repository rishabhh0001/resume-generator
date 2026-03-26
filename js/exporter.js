// exporter.js — PDF and JSON export

// ---- JSON ----

function exportJson() {
  const blob = new Blob([JSON.stringify(resumeData, null, 2)], { type: 'application/json' });
  const name = getFullName().replace(/\s+/g, '_') || 'resume';
  triggerDownload(blob, `${name}_resume.json`);
}

// ---- PDF ----

async function exportPdf() {
  const paper = document.getElementById('resumePreview');
  const wrapper = document.getElementById('previewScaleWrapper');

  // temporarily reset scale so the capture is full-res
  const prevTransform = wrapper.style.transform;
  wrapper.style.transform = 'scale(1)';

  try {
    const canvas = await html2canvas(paper, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false
    });

    wrapper.style.transform = prevTransform;

    const paperRect = paper.getBoundingClientRect();
    const links = Array.from(paper.querySelectorAll('a[data-pdf-url], .res-contact a')).map(el => {
      const rect = el.getBoundingClientRect();
      return {
        url: el.getAttribute('data-pdf-url') || el.getAttribute('href'),
        x: rect.left - paperRect.left,
        y: rect.top - paperRect.top,
        w: rect.width,
        h: rect.height
      };
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.97);
    const isLetter = settings.paperSize === 'letter';

    // jsPDF units are mm. A4 = 210×297, Letter = 215.9×279.4
    const { jsPDF } = window.jspdf;
    const fw = isLetter ? 215.9 : 210;
    const fh = isLetter ? 279.4 : 297;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: isLetter ? 'letter' : 'a4' });

    const imgW = canvas.width;
    const imgH = canvas.height;
    const ratio = imgH / imgW;
    const pdfImgH = fw * ratio;
    
    // Pixel-to-mm conversion factor (based on paper width)
    const pxToMm = fw / paperRect.width;

    // if content goes beyond one page, split it
    if (pdfImgH <= fh) {
      pdf.addImage(imgData, 'JPEG', 0, 0, fw, pdfImgH);
      // Add links for single page
      links.forEach(l => {
        pdf.link(l.x * pxToMm, l.y * pxToMm, l.w * pxToMm, l.h * pxToMm, { url: l.url });
      });
    } else {
      // multi-page: slice the image
      let yOffset = 0;
      let page = 0;
      const pxPerPage = paperRect.height / (pdfImgH / fh); 
      
      while (yOffset < imgH) {
        if (page > 0) pdf.addPage();
        const sliceH = Math.min(imgH - yOffset, Math.floor(imgW * (fh / fw)));
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width  = imgW;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, -yOffset, imgW, imgH);
        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, fw, fh);
        
        // Add links for this page
        const yOffsetPx = (yOffset / imgH) * paperRect.height;
        const pageHeightPx = (sliceH / imgH) * paperRect.height;
        
        links.forEach(l => {
          if (l.y >= yOffsetPx - 1 && l.y < yOffsetPx + pageHeightPx) {
            pdf.link(l.x * pxToMm, (l.y - yOffsetPx) * pxToMm, l.w * pxToMm, l.h * pxToMm, { url: l.url });
          }
        });

        yOffset += sliceH;
        page++;
      }
    }

    const name = getFullName().replace(/\s+/g, '_') || 'resume';
    pdf.save(`${name}_resume.pdf`);
  } catch (err) {
    wrapper.style.transform = prevTransform;
    throw err;
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
