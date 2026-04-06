/**
 * Same pipeline as TripVisualizerPage "Generate PDF": render styled HTML in a hidden iframe,
 * wait for images, then rasterize each .ft-page with html2canvas and build a PDF with jsPDF.
 */
export async function buildPdfBlobFromStyledPreviewHtml(previewHtml) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '1240px';
  iframe.style.height = '1754px';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('Failed to initialize hidden render frame');
    iframeDoc.open();
    iframeDoc.write(previewHtml);
    iframeDoc.close();

    await new Promise((resolve) => setTimeout(resolve, 900));
    await Promise.all(
      Array.from(iframeDoc.images || []).map((img) => (
        img.complete
          ? Promise.resolve()
          : new Promise((resolveImg) => {
              img.onload = resolveImg;
              img.onerror = resolveImg;
            })
      ))
    );

    let html2canvas, jsPDF;
    try {
      [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
    } catch (importErr) {
      if (!sessionStorage.getItem('_pdf_reload')) {
        sessionStorage.setItem('_pdf_reload', '1');
        window.location.reload();
        return new Promise(() => {});
      }
      sessionStorage.removeItem('_pdf_reload');
      throw new Error('Failed to load PDF libraries after reload. Please clear your browser cache and try again.');
    }
    sessionStorage.removeItem('_pdf_reload');

    const pageNodes = Array.from(iframeDoc.querySelectorAll('.ft-page'));
    const nodesToRender = pageNodes.length > 0 ? pageNodes : [iframeDoc.body];
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    let isFirstPdfPage = true;

    for (let i = 0; i < nodesToRender.length; i += 1) {
      const node = nodesToRender[i];
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#FCFBF9',
        windowWidth: Math.max(node.scrollWidth || 1240, 1240),
        windowHeight: Math.max(node.scrollHeight || 1754, 1754)
      });
      const pageW = 210;
      const pageH = 297;
      let imgW = pageW;
      let imgH = (canvas.height * imgW) / canvas.width;
      if (imgH > pageH) {
        imgH = pageH;
        imgW = (canvas.width * imgH) / canvas.height;
      }
      const x = (pageW - imgW) / 2;
      const y = (pageH - imgH) / 2;
      const imageData = canvas.toDataURL('image/jpeg', 0.98);
      if (!isFirstPdfPage) pdf.addPage();
      pdf.setFillColor(252, 251, 249);
      pdf.rect(0, 0, pageW, pageH, 'F');
      pdf.addImage(imageData, 'JPEG', x, y, imgW, imgH, undefined, 'FAST');
      isFirstPdfPage = false;
    }

    return pdf.output('blob');
  } finally {
    if (iframe?.parentNode) iframe.parentNode.removeChild(iframe);
  }
}
