import type { ConversionItem } from '@/types/mathwrite';

function sanitizeFilename(name: string, fallback = 'opentex-document'): string {
  const cleaned = (name || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || fallback;
}

export function showExportNotice(message: string, tone: 'ok' | 'err' = 'ok'): void {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.setAttribute?.('role', 'status');
  el.textContent = message;
  el.style.position = 'fixed';
  el.style.bottom = '20px';
  el.style.left = '50%';
  el.style.transform = 'translateX(-50%)';
  el.style.zIndex = '80';
  el.style.maxWidth = 'min(92vw, 440px)';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '10px';
  el.style.fontSize = '13px';
  el.style.lineHeight = '1.4';
  el.style.fontFamily = 'system-ui, sans-serif';
  el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
  el.style.background = tone === 'err' ? '#7c2d12' : '#14532d';
  el.style.color = '#ffffff';
  document.body.appendChild(el);
  setTimeout(() => {
    el.remove?.();
  }, 3200);
}

export function openInOverleaf(latex: string, title = 'OpenTEX Document'): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;
  // Open the tab during the click, then POST into it. A form target of _blank
  // is blocked as a popup and leaves the page with no error.
  const popup = window.open('', '_blank');
  if (!popup) {
    showExportNotice('Pop-up blocked. Allow pop-ups for this site to open Overleaf.', 'err');
    return false;
  }
  const targetName = `overleaf_${Date.now()}`;
  try {
    popup.name = targetName;
  } catch {
    showExportNotice('Pop-up blocked. Allow pop-ups for this site to open Overleaf.', 'err');
    return false;
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://www.overleaf.com/docs';
  form.target = targetName;
  form.style.display = 'none';

  const fields: Record<string, string> = {
    snip: latex,
    snip_name: `${sanitizeFilename(title)}.tex`,
  };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
  try {
    popup.opener = null;
  } catch {
    // The new tab may already be navigating cross-origin.
  }
  showExportNotice('Opening in Overleaf…');
  return true;
}

export function downloadFile(content: string | Blob, filename: string, mimeType: string): boolean {
  if (typeof document === 'undefined') return false;
  // text/markdown is opened in the tab instead of saved, which leaves the convert
  // button spinning. text/plain downloads the same way .typ already does.
  const type = /markdown/i.test(mimeType) ? 'text/plain;charset=utf-8' : mimeType;
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return true;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof document !== 'undefined') {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'true');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(ta);
      if (copied) return true;
    } catch {
      // Fall through to the async clipboard API.
    }
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('clipboard-timeout')), 1000);
        }),
      ]);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function escapeXmlHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface ParsedExportBlock {
  kind: 'h1' | 'h2' | 'h3' | 'p';
  text: string;
}

function parseDocumentBlocks(content: string): ParsedExportBlock[] {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const cleaned = block
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2');
      if (cleaned.startsWith('# ')) {
        return { kind: 'h1', text: cleaned.slice(2).trim() };
      }
      if (cleaned.startsWith('## ')) {
        return { kind: 'h2', text: cleaned.slice(3).trim() };
      }
      if (cleaned.startsWith('### ')) {
        return { kind: 'h3', text: cleaned.slice(4).trim() };
      }
      return { kind: 'p', text: cleaned };
    });
}

function buildDocxEntries(content: string, title: string): Array<{ name: string; data: Uint8Array }> {
  const enc = new TextEncoder();
  const blocks = parseDocumentBlocks(content);
  const paragraphsXml = blocks
    .map((b) => {
      const lines = b.text.split('\n');
      const style =
        b.kind === 'h1'
          ? '<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>'
          : b.kind === 'h2'
            ? '<w:pPr><w:pStyle w:val="Heading2"/></w:pPr>'
            : b.kind === 'h3'
              ? '<w:pPr><w:pStyle w:val="Heading3"/></w:pPr>'
              : '';
      const boldWrap = b.kind !== 'p' ? '<w:rPr><w:b/></w:rPr>' : '';
      const runs = lines
        .map((line, i) => `${i > 0 ? '<w:br/>' : ''}<w:t xml:space="preserve">${escapeXmlHtml(line)}</w:t>`)
        .join('');
      return `<w:p>${style}<w:r>${boldWrap}${runs}</w:r></w:p>`;
    })
    .join('');

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
</w:styles>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphsXml || `<w:p><w:r><w:t>${escapeXmlHtml(title)}</w:t></w:r></w:p>`}
    <w:sectPr/>
  </w:body>
</w:document>`;

  return [
    { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
    { name: '_rels/.rels', data: enc.encode(rootRels) },
    { name: 'word/_rels/document.xml.rels', data: enc.encode(docRels) },
    { name: 'word/styles.xml', data: enc.encode(stylesXml) },
    { name: 'word/document.xml', data: enc.encode(documentXml) },
  ];
}

function buildOdtEntries(content: string): Array<{ name: string; data: Uint8Array }> {
  const enc = new TextEncoder();
  const blocks = parseDocumentBlocks(content);
  const bodyXml = blocks
    .map((b) => {
      const text = escapeXmlHtml(b.text).replace(/\n/g, '<text:line-break/>');
      if (b.kind === 'h1') return `<text:h text:outline-level="1">${text}</text:h>`;
      if (b.kind === 'h2') return `<text:h text:outline-level="2">${text}</text:h>`;
      if (b.kind === 'h3') return `<text:h text:outline-level="3">${text}</text:h>`;
      return `<text:p>${text}</text:p>`;
    })
    .join('\n      ');

  const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;

  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2">
  <office:body>
    <office:text>
      ${bodyXml}
    </office:text>
  </office:body>
</office:document-content>`;

  return [
    { name: 'mimetype', data: enc.encode('application/vnd.oasis.opendocument.text') },
    { name: 'META-INF/manifest.xml', data: enc.encode(manifestXml) },
    { name: 'content.xml', data: enc.encode(contentXml) },
  ];
}

export function downloadConvertedDocument(
  content: string,
  format: 'docx' | 'odt' | 'typst' | 'markdown' | 'tex',
  baseName: string
): void {
  const stem = sanitizeFilename(baseName.replace(/\.(tex|docx|odt|typ|md)$/i, ''));
  if (format === 'docx') {
    const zip = buildZipBlob(
      buildDocxEntries(content, stem),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    downloadFile(zip, `${stem}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    return;
  }
  if (format === 'odt') {
    const zip = buildZipBlob(buildOdtEntries(content), 'application/vnd.oasis.opendocument.text');
    downloadFile(zip, `${stem}.odt`, 'application/vnd.oasis.opendocument.text');
    return;
  }
  if (format === 'typst') {
    downloadFile(content, `${stem}.typ`, 'text/plain;charset=utf-8');
    return;
  }
  if (format === 'markdown') {
    downloadFile(content, `${stem}.md`, 'text/markdown;charset=utf-8');
    return;
  }
  downloadFile(content, `${stem}.tex`, 'application/x-tex;charset=utf-8');
}

// Pure JS IEEE 802.3 CRC32 lookup table
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipBlob(
  entries: Array<{ name: string; data: Uint8Array }>,
  mimeType = 'application/zip'
): Blob {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((Math.max(1980, now.getFullYear()) - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  entries.forEach((entry) => {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = entry.data;
    const crc = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localChunks.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralChunks.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  });

  const centralSize = centralChunks.reduce((acc, c) => acc + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const blobParts: BlobPart[] = [...localChunks, ...centralChunks, eocd].map(
    (u8) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
  );
  return new Blob(blobParts, { type: mimeType });
}

export function downloadLatexZip(conversions: ConversionItem[]): void {
  const encoder = new TextEncoder();
  const usedNames = new Set<string>();
  const items = conversions.length > 0 ? conversions : [];

  const entries = items.map((item, index) => {
    let base = sanitizeFilename(item.title || item.fileName || `conversion_${index + 1}`);
    base = base.replace(/\.tex$/i, '');
    let fileName = `${base}.tex`;
    let suffix = 2;
    while (usedNames.has(fileName)) {
      fileName = `${base}_${suffix++}.tex`;
    }
    usedNames.add(fileName);
    return { name: fileName, data: encoder.encode(item.latex || '') };
  });

  downloadFile(buildZipBlob(entries), 'opentex-conversions.zip', 'application/zip');
}

const PDF_CONTENT_WIDTH = 700;
/** CSS pixels of preview content that fit on one US Letter page with margins. */
const PDF_PAGE_BUDGET = 960;

function collectPdfBlocks(sheet: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  for (const child of Array.from(sheet.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.tagName === 'ARTICLE') {
      const inner = Array.from(child.children).filter((node): node is HTMLElement => node instanceof HTMLElement);
      blocks.push(...(inner.length ? inner : [child]));
    } else {
      blocks.push(child);
    }
  }
  return blocks;
}

function packPdfPages(blocks: HTMLElement[]): HTMLElement[][] {
  const pages: HTMLElement[][] = [];
  let current: HTMLElement[] = [];
  let used = 0;
  for (const block of blocks) {
    const height = Math.max(24, Math.ceil(block.getBoundingClientRect().height || block.scrollHeight));
    if (current.length > 0 && used + height > PDF_PAGE_BUDGET) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(block);
    used += height;
  }
  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

async function paintElement(element: HTMLElement): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas-pro')).default;
  return html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
    width: PDF_CONTENT_WIDTH,
    windowWidth: PDF_CONTENT_WIDTH,
  });
}

function addCanvasToPdf(
  pdf: import('jspdf').jsPDF,
  canvas: HTMLCanvasElement,
  placeOnNewPage: boolean
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 36;
  const drawWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const scale = drawWidth / canvas.width;
  const sliceHeight = Math.max(1, Math.floor(usableHeight / scale));
  let offset = 0;
  let first = !placeOnNewPage;
  while (offset < canvas.height) {
    const height = Math.min(sliceHeight, canvas.height - offset);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = height;
    const ctx = slice.getContext('2d');
    if (!ctx) break;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, offset, canvas.width, height, 0, 0, canvas.width, height);
    if (!first) pdf.addPage();
    first = false;
    pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, margin, drawWidth, height * scale);
    offset += height;
  }
}

/** Snapshot the KaTeX preview into a multi-page PDF. Runs in the browser only. */
export async function buildTypesetPdfBlob(renderedHtml: string, title: string): Promise<Blob> {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = [
    'position:fixed',
    `width:${PDF_CONTENT_WIDTH}px`,
    'left:0',
    'top:0',
    'background:#ffffff',
    'color:#111827',
    'z-index:-1',
    'pointer-events:none',
  ].join(';');
  const safeTitle = escapeXmlHtml(title || 'OpenTEX Document');
  host.innerHTML = `<div class="pdf-sheet" style="box-sizing:border-box;width:${PDF_CONTENT_WIDTH}px;background:#ffffff;color:#111827;font-family:Georgia,'Times New Roman',serif;line-height:1.6;">
    <h1 style="margin:0 0 18px;padding-bottom:10px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:22px;line-height:1.3;font-weight:700;color:#0f172a;">${safeTitle}</h1>
    ${renderedHtml}
  </div>`;
  document.body.appendChild(host);
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const sheet = host.querySelector('.pdf-sheet');
    if (!(sheet instanceof HTMLElement)) throw new Error('Could not prepare the PDF preview.');
    const pages = packPdfPages(collectPdfBlocks(sheet));
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
    for (let index = 0; index < pages.length; index++) {
      const pageHost = document.createElement('div');
      pageHost.style.cssText = `box-sizing:border-box;width:${PDF_CONTENT_WIDTH}px;background:#ffffff;color:#111827;padding:4px 8px 12px;`;
      for (const block of pages[index]) pageHost.appendChild(block);
      host.appendChild(pageHost);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const canvas = await paintElement(pageHost);
      addCanvasToPdf(pdf, canvas, index > 0);
      pageHost.remove();
    }
    return pdf.output('blob');
  } finally {
    host.remove();
  }
}

export async function downloadCompiledPdf(renderedHtml: string, title: string): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  try {
    const blob = await buildTypesetPdfBlob(renderedHtml, title);
    if (blob.size < 1500) throw new Error('PDF render was empty.');
    const ok = downloadFile(blob, `${sanitizeFilename(title)}.pdf`, 'application/pdf');
    showExportNotice(ok ? 'PDF downloaded.' : 'Could not create the PDF.', ok ? 'ok' : 'err');
    return ok;
  } catch {
    showExportNotice('Could not create the PDF.', 'err');
    return false;
  }
}

export function printCompiledPdf(renderedHtml: string, title: string): boolean {
  if (typeof window === 'undefined') return false;
  const win = window.open('', '_blank', 'width=900,height=720');
  if (!win) return false;

  const safeTitle = escapeXmlHtml(title || 'OpenTEX Document');
  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css" />
  <style>
    @page { margin: 2cm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Computer Modern Serif", "Latin Modern Roman", Georgia, Cambria, "Times New Roman", serif;
      color: #111827;
      background: #ffffff;
      line-height: 1.65;
      max-width: 740px;
      margin: 0 auto;
      padding: 24px;
    }
    header { margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0; text-align: center; }
    h1, h2, h3, h4 { color: #020617; page-break-after: avoid; margin-top: 1.25rem; margin-bottom: 0.5rem; }
    h2 { border-bottom: 1px solid #f1f5f9; padding-bottom: 0.25rem; }
    p { margin: 0.65rem 0; }
    ul, ol { margin: 0.75rem 0; padding-left: 1.5rem; }
    li { margin: 0.25rem 0; }
    .katex-display { margin: 1rem 0; overflow-x: auto; }
    .flex { display: flex; }
    .flex-1 { flex: 1; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .gap-4 { gap: 1rem; }
    .text-center { text-align: center; }
    .shrink-0 { flex-shrink: 0; }
    figure { margin: 1rem 0; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; text-align: center; page-break-inside: avoid; }
    figure svg { max-width: 320px; height: auto; margin: 0 auto; display: block; }
    figcaption { margin-top: 0.5rem; font-size: 12px; color: #64748b; font-family: system-ui, sans-serif; }
    nav { margin: 1rem 0; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
    .mw-thm-box { margin: 1rem 0; padding: 0.75rem 1rem; border-left: 3px solid #cbd5e1; page-break-inside: avoid; }
    .mw-thm-box.mw-thm-boxed { border: 2px solid #cbd5e1; border-radius: 8px; }
    .mw-thm-box.mw-thm-tagged { border-left: 4px solid #2563eb; background: #eff6ff; border-radius: 0 8px 8px 0; }
    .mw-thm-badge { font-weight: 700; margin-right: 0.4rem; }
    .mw-qed { display: block; text-align: right; color: #64748b; margin-top: 0.25rem; }
    section { margin: 1rem 0; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 10px; page-break-inside: avoid; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; border-top: 2px solid #94a3b8; border-bottom: 2px solid #94a3b8; }
    th, td { border-bottom: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; border-bottom: 2px solid #cbd5e1; }
    @media print {
      body { padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  ${renderedHtml}
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 300);
    });
  </script>
</body>
</html>`);
  win.document.close();
  return true;
}
