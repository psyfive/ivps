let pdfjsReady = false;

async function ensurePdfJs() {
  if (pdfjsReady && window.pdfjsLib) return true;

  return new Promise((resolve) => {
    if (document.getElementById('pdfjs-script')) {
      const check = setInterval(() => {
        if (window.pdfjsLib) {
          clearInterval(check);
          resolve(true);
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'pdfjs-script';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib = window['pdfjs-dist/build/pdf'];
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      pdfjsReady = true;
      resolve(true);
    };
    document.head.appendChild(script);
  });
}

export async function fileToPageData(file, onProgress) {
  const name = file.name.replace(/\.[^.]+$/, '');
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(file.name);
  const isPDF = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

  if (isImage) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return { name, pages: [{ dataUrl, sessions: [] }] };
  }

  if (isPDF) {
    await ensurePdfJs();
    if (!window.pdfjsLib) throw new Error('pdf.js 로드 실패');

    const arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    const pdf = await window.pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
    const pages = [];

    for (let i = 1; i <= pdf.numPages; i += 1) {
      onProgress?.(i, pdf.numPages);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      pages.push({ dataUrl: canvas.toDataURL('image/png'), sessions: [] });
    }

    return { name, pages };
  }

  throw new Error('이미지 또는 PDF 파일만 지원합니다.');
}
