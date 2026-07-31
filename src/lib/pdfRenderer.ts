import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker dynamically on client
if (typeof window !== 'undefined') {
  const version = pdfjsLib.version || '4.10.38';
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}

export async function convertPdfToImageDataUrl(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    if (pdf.numPages === 0) {
      throw new Error('PDF document has no pages.');
    }

    // Render page 1 at 2.0x scale for crisp OCR extraction
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not create canvas context for PDF rendering.');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    return canvas.toDataURL('image/png');
  } catch (err: any) {
    console.error('Error rendering PDF to image:', err);
    throw new Error(`PDF rendering failed: ${err.message || String(err)}`);
  }
}
