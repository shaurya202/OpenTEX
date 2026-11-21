import katex from 'katex';
import type { LatexThemeStyle } from '@/types/mathwrite';

export interface BeamerSlide {
  index: number;
  title: string;
  subtitle?: string;
  isTitleSlide?: boolean;
  bodyHtml: string;
  rawLatex: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderKatex(math: string, displayMode: boolean): string {
  const cleaned = math
    .replace(/\\label\{[^}]*\}/g, '')
    .replace(/\\tag\{[^}]*\}/g, '')
    .trim();
  try {
    return katex.renderToString(cleaned, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
    });
  } catch {
    return `<code class="font-mono text-xs text-rose-600">${escapeHtml(math)}</code>`;
  }
}

/**
 * Extracts a balanced `{...}` group starting at `openBraceIndex`.
 * Returns `{ content, endIndex }` where `endIndex` is the index of the closing `}`.
 */
function readBraceGroup(
  src: string,
  openBraceIndex: number
): { content: string; endIndex: number } | null {
  if (src[openBraceIndex] !== '{') return null;
  let depth = 0;
  for (let i = openBraceIndex; i < src.length; i++) {
    const ch = src[i];
    if (ch === '\\') {
      i++; // skip escaped char
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return {
          content: src.slice(openBraceIndex + 1, i),
          endIndex: i,
        };
      }
    }
  }
  return null;
}

/**
 * Extracts optional `[...]` argument starting at `openBracketIndex`.
 */
function readBracketGroup(
  src: string,
  openBracketIndex: number
): { content: string; endIndex: number } | null {
  if (src[openBracketIndex] !== '[') return null;
  let depth = 0;
  for (let i = openBracketIndex; i < src.length; i++) {
    const ch = src[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        return {
          content: src.slice(openBracketIndex + 1, i),
          endIndex: i,
        };
      }
    }
  }
  return null;
}

function extractCommandArg(src: string, command: string): string | undefined {
  const regex = new RegExp(`\\\\${command}\\s*\\{`);
  const match = regex.exec(src);
  if (!match) return undefined;
  const openIdx = match.index + match[0].length - 1;
  const group = readBraceGroup(src, openIdx);
  return group ? group.content.trim() : undefined;
}

function stripComments(latex: string): string {
  return latex
    .split('\n')
    .map((line) => {
      let inEscape = false;
      for (let i = 0; i < line.length; i++) {
        if (inEscape) {
          inEscape = false;
          continue;
        }
        if (line[i] === '\\') {
          inEscape = true;
          continue;
        }
        if (line[i] === '%') {
          return line.slice(0, i);
        }
      }
      return line;
    })
    .join('\n');
}

let tikzGridCounter = 0;

function renderTikzPreview(tikzBody: string): string {
  const gridId = `ot-tikz-grid-${++tikzGridCounter}`;
  const polylines: Array<{ points: Array<{ x: number; y: number }>; color: string; dashed: boolean }> = [];
  const circles: Array<{ cx: number; cy: number; r: number; color: string }> = [];
  const labels: Array<{ x: number; y: number; text: string }> = [];
  const allPts: Array<{ x: number; y: number }> = [];

  const drawStmtRegex = /\\draw(\[[^\]]*\])?([^;]*);/g;
  let stmt: RegExpExecArray | null;
  while ((stmt = drawStmtRegex.exec(tikzBody)) !== null) {
    const opts = (stmt[1] || '').toLowerCase();
    const body = stmt[2] || '';
    const color = opts.includes('red')
      ? '#dc2626'
      : opts.includes('green') || opts.includes('emerald')
        ? '#059669'
        : opts.includes('black')
          ? '#0f172a'
          : '#0071E3';
    const dashed = opts.includes('dashed') || opts.includes('dotted');

    const circleMatch = /\(([-\d.]+)\s*,\s*([-\d.]+)\)\s*circle\s*\(\s*([-\d.]+)(?:cm|pt)?\s*\)/.exec(body);
    if (circleMatch) {
      const cx = parseFloat(circleMatch[1]);
      const cy = parseFloat(circleMatch[2]);
      const r = parseFloat(circleMatch[3]);
      if (Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(r)) {
        circles.push({ cx, cy, r, color });
        allPts.push({ x: cx - r, y: cy - r }, { x: cx + r, y: cy + r });
      }
      continue;
    }

    if (body.includes('--')) {
      const segPts: Array<{ x: number; y: number }> = [];
      const ptRegex = /\(([-\d.]+)\s*,\s*([-\d.]+)\)/g;
      let pm: RegExpExecArray | null;
      while ((pm = ptRegex.exec(body)) !== null) {
        const x = parseFloat(pm[1]);
        const y = parseFloat(pm[2]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          segPts.push({ x, y });
          allPts.push({ x, y });
        }
      }
      if (segPts.length >= 2) {
        polylines.push({ points: segPts, color, dashed });
      }
    }
  }

  const nodeRegex = /\\node(?:\[[^\]]*\])?\s*(?:\([^)]*\))?\s*(?:at\s*\(([-\d.]+)\s*,\s*([-\d.]+)\))?[^{]*\{([^}]*)\}/g;
  let nm: RegExpExecArray | null;
  while ((nm = nodeRegex.exec(tikzBody)) !== null) {
    const x = nm[1] ? parseFloat(nm[1]) : 0;
    const y = nm[2] ? parseFloat(nm[2]) : 0;
    const rawLabel = nm[3].replace(/\$/g, '').trim();
    if (rawLabel && Number.isFinite(x) && Number.isFinite(y)) {
      labels.push({ x, y, text: rawLabel });
      allPts.push({ x, y });
    }
  }

  const hasUnsupported = /plot|parabola|tikz-cd|\\foreach|\\matrix/.test(tikzBody);
  if (polylines.length === 0 && circles.length === 0) {
    return `<figure class="my-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-center">
      <div class="mx-auto max-w-md rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 font-sans text-xs text-slate-600">
        TikZ diagram preview is not supported natively in-browser${hasUnsupported ? ' (uses plots/curves)' : ''}. Open in Overleaf or export to PDF to compile full TikZ.
      </div>
      <figcaption class="mt-2 text-xs text-slate-500 font-sans">TikZ Vector Diagram</figcaption>
    </figure>`;
  }

  const xs = allPts.map((p) => p.x);
  const ys = allPts.map((p) => p.y);
  const minX = Math.min(...xs, -1);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, -1);
  const maxY = Math.max(...ys, 1);
  const span = Math.max(maxX - minX, maxY - minY, 2);
  const scale = 190 / span;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const tx = (x: number) => (140 + (x - midX) * scale).toFixed(1);
  const ty = (y: number) => (82 - (y - midY) * scale).toFixed(1);

  const linesSvg = polylines
    .map(
      (pl) =>
        `<polyline points="${pl.points.map((p) => `${tx(p.x)},${ty(p.y)}`).join(' ')}" fill="none" stroke="${pl.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${pl.dashed ? ' stroke-dasharray="5 3"' : ''} />`
    )
    .join('\n');

  const circlesSvg = circles
    .map(
      (c) =>
        `<circle cx="${tx(c.cx)}" cy="${ty(c.cy)}" r="${(c.r * scale).toFixed(1)}" fill="rgba(0,113,227,0.08)" stroke="${c.color}" stroke-width="1.8" />`
    )
    .join('\n');

  const labelsSvg = labels
    .map(
      (l) =>
        `<text x="${tx(l.x)}" y="${(parseFloat(ty(l.y)) - 6).toFixed(1)}" font-size="11" fill="#1e293b" text-anchor="middle" font-family="serif">${escapeHtml(l.text)}</text>`
    )
    .join('\n');

  return `<figure class="my-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-center">
    <svg viewBox="0 0 280 165" class="mx-auto h-40 w-full max-w-xs" role="img" aria-label="TikZ diagram preview">
      <defs>
        <pattern id="${gridId}" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="0.7"/>
        </pattern>
      </defs>
      <rect width="280" height="165" fill="url(#${gridId})" rx="6" />
      ${circlesSvg}
      ${linesSvg}
      ${labelsSvg}
    </svg>
    <figcaption class="mt-2 text-xs text-slate-500 font-sans">TikZ Vector Diagram Preview</figcaption>
  </figure>`;
}

function renderTabular(spec: string, body: string): string {
  const colChars = spec.replace(/[^lcr]/g, '').split('');
  const alignClass = (idx: number) => {
    const ch = colChars[idx] || 'l';
    if (ch === 'c') return 'text-center';
    if (ch === 'r') return 'text-right';
    return 'text-left';
  };

  const segments = body
    .split(/\\\\/)
    .map((r) => r.trim())
    .filter(Boolean);

  const hasHeaderRule = segments.length > 1 && /\\(?:hline|midrule)/.test(segments[1]);
  const rawRows = segments
    .map((r) => r.replace(/\\hline|\\toprule|\\midrule|\\bottomrule/g, '').trim())
    .filter(Boolean);

  if (rawRows.length === 0) return '';

  const rowsHtml = rawRows
    .map((row, rIdx) => {
      const cells = row.split('&').map((cell) => renderInlineText(cell.trim()));
      const isHeader = hasHeaderRule && rIdx === 0;
      const tag = isHeader ? 'th' : 'td';
      const cellClass = isHeader
        ? 'border-b-2 border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-900'
        : 'border-b border-slate-200 px-3 py-2 text-slate-700';
      return `<tr>${cells
        .map((c, cIdx) => `<${tag} class="${cellClass} ${alignClass(cIdx)}">${c}</${tag}>`)
        .join('')}</tr>`;
    })
    .join('');

  return `<div class="my-4 overflow-x-auto"><table class="min-w-full border-collapse border-t-2 border-b-2 border-slate-400 text-sm">${rowsHtml}</table></div>`;
}

function renderList(itemsRaw: string, ordered: boolean): string {
  const parts = itemsRaw
    .split(/\\item(?:\[[^\]]*\])?\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const tag = ordered ? 'ol' : 'ul';
  const cls = ordered
    ? 'my-3 list-decimal space-y-1.5 pl-6 text-slate-800'
    : 'my-3 list-disc space-y-1.5 pl-6 text-slate-800';
  return `<${tag} class="${cls}">${parts
    .map((item) => `<li>${renderInlineText(item)}</li>`)
    .join('')}</${tag}>`;
}

function theoremBoxClasses(
  kind: string,
  latexStyle: LatexThemeStyle
): { wrapper: string; header: string; badge: string } {
  const isProof = kind === 'proof';
  if (latexStyle === 'boxed') {
    return {
      wrapper: isProof
        ? 'mw-thm-box my-4 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-slate-800'
        : 'mw-thm-box mw-thm-boxed my-4 rounded-lg border-2 border-slate-300 bg-white px-4 py-3 shadow-xs',
      header: 'font-bold text-slate-900',
      badge: 'mw-thm-badge inline-block rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white mr-2 font-sans',
    };
  }
  if (latexStyle === 'tagged') {
    const accent =
      kind === 'theorem' || kind === 'lemma' || kind === 'proposition'
        ? 'border-blue-500 bg-blue-50/40'
        : kind === 'definition'
          ? 'border-emerald-500 bg-emerald-50/40'
          : 'border-slate-400 bg-slate-50/60';
    const badgeColor =
      kind === 'theorem' || kind === 'lemma' || kind === 'proposition'
        ? 'bg-blue-600 text-white'
        : kind === 'definition'
          ? 'bg-emerald-600 text-white'
          : 'bg-slate-600 text-white';
    return {
      wrapper: `mw-thm-box mw-thm-tagged my-4 rounded-r-lg border-l-4 ${accent} px-4 py-3`,
      header: 'font-semibold text-slate-900',
      badge: `mw-thm-badge inline-block rounded-md px-2.5 py-0.5 text-xs font-semibold mr-2 font-sans ${badgeColor}`,
    };
  }
  // standard
  return {
    wrapper: isProof
      ? 'mw-thm-box my-4 pl-3 border-l-2 border-slate-200 text-slate-800'
      : 'mw-thm-box my-4 pl-3 border-l-2 border-slate-300 text-slate-900',
    header: isProof ? 'italic font-semibold text-slate-800' : 'font-bold text-slate-900',
    badge: 'mw-thm-badge font-bold text-slate-900 mr-1',
  };
}

/**
 * Renders inline text containing math ($...$, \(...\)) and LaTeX formatting commands.
 * Escapes raw HTML outside KaTeX tokens for XSS safety.
 */
function renderInlineText(raw: string): string {
  const placeholders: string[] = [];
  const hold = (html: string): string => {
    const idx = placeholders.length;
    placeholders.push(html);
    return `\u0000MWHOLD${idx}\u0000`;
  };

  let text = raw;

  // 1. Extract display math inside inline paragraphs if any (\[...\], $$...$$)
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) =>
    hold(`<div class="my-3 text-center">${renderKatex(math, true)}</div>`)
  );
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, math) =>
    hold(`<div class="my-3 text-center">${renderKatex(math, true)}</div>`)
  );

  // 2. Extract inline math \(...\) and $...$
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, math) => hold(renderKatex(math, false)));

  // Careful single $...$ scanner ignoring \$
  let out = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\' && text[i + 1] === '$') {
      out += '\\$';
      i++;
      continue;
    }
    if (text[i] === '$') {
      let j = i + 1;
      let found = -1;
      while (j < text.length) {
        if (text[j] === '\\') {
          j += 2;
          continue;
        }
        if (text[j] === '$') {
          found = j;
          break;
        }
        j++;
      }
      if (found !== -1) {
        const math = text.slice(i + 1, found);
        out += hold(renderKatex(math, false));
        i = found;
        continue;
      }
    }
    out += text[i];
  }
  text = out;

  // 3. Process nested LaTeX formatting commands recursively before escaping plain text
  const processFormatting = (input: string): string => {
    let result = '';
    let i = 0;
    while (i < input.length) {
      if (input[i] === '\\') {
        const rest = input.slice(i);
        const cmdMatch = /^\\(textbf|textit|emph|underline|texttt|sout|text|mbox|textsc|textrm|textsf)\s*\{/.exec(
          rest
        );
        if (cmdMatch) {
          const cmd = cmdMatch[1];
          const openIdx = i + cmdMatch[0].length - 1;
          const grp = readBraceGroup(input, openIdx);
          if (grp) {
            const innerHtml = processFormatting(grp.content);
            if (cmd === 'textbf') result += hold(`<strong>${innerHtml}</strong>`);
            else if (cmd === 'textit' || cmd === 'emph') result += hold(`<em>${innerHtml}</em>`);
            else if (cmd === 'underline') result += hold(`<span class="underline">${innerHtml}</span>`);
            else if (cmd === 'texttt')
              result += hold(`<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.88em]">${innerHtml}</code>`);
            else if (cmd === 'sout') result += hold(`<del class="text-slate-400">${innerHtml}</del>`);
            else if (cmd === 'textsc') result += hold(`<span class="uppercase tracking-wider text-[0.88em]">${innerHtml}</span>`);
            else result += innerHtml;
            i = grp.endIndex + 1;
            continue;
          }
        }

        const colorMatch = /^\\textcolor\s*\{([^}]+)\}\s*\{/.exec(rest);
        if (colorMatch) {
          const safeColor = /^[a-zA-Z0-9#,.\s()-]+$/.test(colorMatch[1]) ? colorMatch[1] : 'inherit';
          const openIdx = i + colorMatch[0].length - 1;
          const grp = readBraceGroup(input, openIdx);
          if (grp) {
            const innerHtml = processFormatting(grp.content);
            result += hold(`<span style="color:${escapeHtml(safeColor)}">${innerHtml}</span>`);
            i = grp.endIndex + 1;
            continue;
          }
        }

        if (rest.startsWith('\\\\')) {
          result += hold('<br />');
          i += 2;
          continue;
        }
        if (rest.startsWith('\\quad')) {
          result += hold('<span class="inline-block w-4"></span>');
          i += 5;
          continue;
        }
        if (rest.startsWith('\\qquad')) {
          result += hold('<span class="inline-block w-8"></span>');
          i += 6;
          continue;
        }
        const escMatch = /^\\([%&$#_ {}])/.exec(rest);
        if (escMatch) {
          result += escMatch[1];
          i += 2;
          continue;
        }
        // Unknown inline command with optional {arg} -> strip command name or keep content
        const unknownWithArg = /^\\([a-zA-Z]+)\*?\s*\{/.exec(rest);
        if (unknownWithArg) {
          const openIdx = i + unknownWithArg[0].length - 1;
          const grp = readBraceGroup(input, openIdx);
          if (grp) {
            result += processFormatting(grp.content);
            i = grp.endIndex + 1;
            continue;
          }
        }
        const bareCmd = /^\\([a-zA-Z]+)\*?/.exec(rest);
        if (bareCmd) {
          if (bareCmd[1] === 'noindent' || bareCmd[1] === 'par' || bareCmd[1] === 'newline') {
            if (bareCmd[1] !== 'noindent') result += hold('<br />');
          } else if (bareCmd[1] === 'LaTeX') {
            result += 'LaTeX';
          } else if (bareCmd[1] === 'TeX') {
            result += 'TeX';
          } else if (bareCmd[1] === 'ldots' || bareCmd[1] === 'dots') {
            result += '…';
          } else if (bareCmd[1] === 'checkmark') {
            result += '&#10003;';
          }
          i += bareCmd[0].length;
          continue;
        }
      }
      result += input[i];
      i++;
    }

    // Escape remaining raw HTML in plain text segments
    let escaped = escapeHtml(result);
    escaped = escaped
      .replace(/---/g, '—')
      .replace(/--/g, '–')
      .replace(/``/g, '“')
      .replace(/''/g, '”')
      .replace(/~/g, '&nbsp;');
    return escaped;
  };

  let html = processFormatting(text);

  // Restore placeholders (may be nested, so loop until none remain)
  for (let pass = 0; pass < 6; pass++) {
    if (!html.includes('\u0000MWHOLD')) break;
    html = html.replace(/\u0000MWHOLD(\d+)\u0000/g, (_, idx) => placeholders[Number(idx)] ?? '');
  }

  return html;
}

function renderDocumentBody(
  bodyRaw: string,
  latexStyle: LatexThemeStyle,
  docMeta: { title?: string; author?: string; date?: string }
): string {
  const blocks: string[] = [];
  const holdBlock = (html: string): string => {
    const idx = blocks.length;
    blocks.push(html);
    return `\n\n\u0000MWBLK${idx}\u0000\n\n`;
  };

  let src = bodyRaw;

  // Render Beamer \begin{frame} blocks cleanly when Beamer .tex is viewed in document preview
  let frameCounter = 0;
  src = src.replace(
    /\\begin\{frame\}(?:\[[^\]]*\])?(?:\{([^}]*)\})?([\s\S]*?)\\end\{frame\}/g,
    (_, explicitTitle: string | undefined, inner: string) => {
      frameCounter++;
      const ftMatch = /\\frametitle\{([^}]*)\}/.exec(inner);
      const titleText = (explicitTitle || ftMatch?.[1] || '').trim();
      const cleanedInner = inner
        .replace(/\\frametitle\{[^}]*\}/g, '')
        .replace(/\\framesubtitle\{[^}]*\}/g, '')
        .trim();

      if (/\\titlepage/.test(cleanedInner)) {
        return holdBlock(
          `<section class="my-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-700 to-slate-900 p-6 text-center text-white shadow-xs">
             <p class="text-[11px] uppercase tracking-wider text-blue-200 font-sans">Slide ${frameCounter} · Title</p>
             <h2 class="mt-2 text-xl font-bold">${renderInlineText(docMeta.title || 'Presentation')}</h2>
             ${docMeta.author ? `<p class="mt-1.5 text-sm text-blue-100">${renderInlineText(docMeta.author)}</p>` : ''}
           </section>`
        );
      }

      const innerRendered = renderDocumentBody(cleanedInner, latexStyle, docMeta);
      return holdBlock(
        `<section class="my-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
           <div class="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2">
             <h3 class="text-base font-bold text-slate-900">${titleText ? renderInlineText(titleText) : `Slide ${frameCounter}`}</h3>
             <span class="text-[11px] font-medium text-slate-400 font-sans">Slide ${frameCounter}</span>
           </div>
           <div>${innerRendered}</div>
         </section>`
      );
    }
  );

  // Handle \maketitle
  if (/\\maketitle/.test(src)) {
    const titleHtml = docMeta.title
      ? `<header class="mb-6 border-b border-slate-200 pb-4 text-center">
           <h1 class="text-2xl font-bold text-slate-950">${renderInlineText(docMeta.title)}</h1>
           ${docMeta.author ? `<p class="mt-1.5 text-sm text-slate-600">${renderInlineText(docMeta.author)}</p>` : ''}
           ${docMeta.date ? `<p class="mt-0.5 text-xs text-slate-400">${renderInlineText(docMeta.date)}</p>` : ''}
         </header>`
      : '';
    src = src.replace(/\\maketitle/g, holdBlock(titleHtml));
  }

  // Handle \tableofcontents
  if (/\\tableofcontents/.test(src)) {
    const headings: Array<{ level: number; text: string }> = [];
    const secMatches = src.matchAll(/\\(section|subsection|subsubsection)\*?\s*\{([^}]+)\}/g);
    for (const sm of secMatches) {
      const level = sm[1] === 'section' ? 1 : sm[1] === 'subsection' ? 2 : 3;
      headings.push({ level, text: sm[2] });
    }
    const tocHtml =
      headings.length > 0
        ? `<nav class="my-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
             <p class="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 font-sans">Contents</p>
             <ul class="space-y-1 text-sm text-slate-700">
               ${headings
                 .map(
                   (h) =>
                     `<li style="padding-left:${(h.level - 1) * 14}px">${renderInlineText(h.text)}</li>`
                 )
                 .join('')}
             </ul>
           </nav>`
        : '';
    src = src.replace(/\\tableofcontents/g, holdBlock(tocHtml));
  }

  // Extract TikZ environments
  src = src.replace(/\\begin\{tikzpicture\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{tikzpicture\}/g, (_, inner) =>
    holdBlock(renderTikzPreview(inner))
  );

  // Extract display math environments
  let eqCounter = 0;
  src = src.replace(
    /\\begin\{(equation\*?|align\*?|gather\*?|multline\*?)\}([\s\S]*?)\\end\{\1\}/g,
    (_, env: string, inner: string) => {
      const numbered = !env.endsWith('*');
      let math = inner.trim();
      if (env.startsWith('align')) {
        math = `\\begin{aligned}\n${math}\n\\end{aligned}`;
      } else if (env.startsWith('gather') || env.startsWith('multline')) {
        math = `\\begin{gathered}\n${math}\n\\end{gathered}`;
      }
      const rendered = renderKatex(math, true);
      if (numbered) {
        eqCounter++;
        return holdBlock(
          `<div class="my-3 flex items-center justify-between gap-4"><div class="flex-1 overflow-x-auto text-center">${rendered}</div><span class="shrink-0 text-sm text-slate-500">(${eqCounter})</span></div>`
        );
      }
      return holdBlock(`<div class="my-3 overflow-x-auto text-center">${rendered}</div>`);
    }
  );

  src = src.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) =>
    holdBlock(`<div class="my-3 overflow-x-auto text-center">${renderKatex(math, true)}</div>`)
  );
  src = src.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) =>
    holdBlock(`<div class="my-3 overflow-x-auto text-center">${renderKatex(math, true)}</div>`)
  );

  // Extract tabular & figure/table wrappers
  src = src.replace(
    /\\begin\{tabular\}\{([^}]*)\}([\s\S]*?)\\end\{tabular\}/g,
    (_, spec, inner) => holdBlock(renderTabular(spec, inner))
  );

  src = src.replace(/\\begin\{figure\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{figure\}/g, (_, inner: string) => {
    const caption = extractCommandArg(inner, 'caption');
    const cleanInner = inner
      .replace(/\\centering/g, '')
      .replace(/\\caption\{[^}]*\}/g, '')
      .replace(/\\label\{[^}]*\}/g, '')
      .replace(/\\includegraphics(?:\[[^\]]*\])?\{([^}]*)\}/g, (__, imgName: string) =>
        `<div class="mx-auto my-2 flex h-24 max-w-xs items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500 font-sans">Figure: ${escapeHtml(imgName)}</div>`
      );
    return holdBlock(
      `<figure class="my-4 text-center">${cleanInner}${
        caption ? `<figcaption class="mt-1.5 text-xs text-slate-500">${renderInlineText(caption)}</figcaption>` : ''
      }</figure>`
    );
  });

  // Extract itemize / enumerate
  src = src.replace(/\\begin\{(itemize|enumerate)\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{\1\}/g, (_, env, inner) =>
    holdBlock(renderList(inner, env === 'enumerate'))
  );

  // Extract theorem-like & proof environments
  const envCounters: Record<string, number> = {};
  src = src.replace(
    /\\begin\{(theorem|lemma|definition|proposition|corollary|remark|example|proof|block|alertblock|exampleblock)\}(?:\[([^\]]*)\]|\{([^}]*)\})?([\s\S]*?)\\end\{\1\}/g,
    (_, env: string, optTitle?: string, braceTitle?: string, inner = '') => {
      const labelTitle = optTitle || braceTitle;
      const styles = theoremBoxClasses(env, latexStyle);
      let heading = env.charAt(0).toUpperCase() + env.slice(1);
      if (env === 'block' || env === 'alertblock' || env === 'exampleblock') {
        heading = labelTitle ? renderInlineText(labelTitle) : 'Note';
      } else if (env !== 'proof') {
        envCounters[env] = (envCounters[env] || 0) + 1;
        heading = `${heading} ${envCounters[env]}`;
      }
      const qed = env === 'proof' ? '<div class="mw-qed mt-1 text-right text-slate-500">□</div>' : '';
      const innerRendered = renderDocumentBody(inner.trim(), latexStyle, {});
      return holdBlock(
        `<div class="${styles.wrapper} flow-root">
           <div class="mb-1 ${styles.header}">
             <span class="${styles.badge}">${heading}</span>${
               labelTitle && !env.endsWith('block')
                 ? `<span class="font-normal text-slate-700">(${renderInlineText(labelTitle)})</span>`
                 : ''
             }
           </div>
           <div class="text-[0.96em]">${innerRendered}${qed}</div>
         </div>`
      );
    }
  );

  // Sections
  let secNum = 0;
  let subSecNum = 0;
  let subSubSecNum = 0;
  src = src.replace(/\\(section|subsection|subsubsection)(\*)?\s*\{/g, (full, level: string, star: string | undefined, offset: number) => {
    const openIdx = offset + full.length - 1;
    const grp = readBraceGroup(src, openIdx);
    if (!grp) return full;
    // We can't mutate indices mid-replace cleanly with readBraceGroup unless we do a manual scan;
    // keep simple fallback here and handle brace groups with manual scan below.
    void level;
    void star;
    return full;
  });

  // Manual scan for \section / \subsection / \subsubsection so nested braces/math work
  const sectionReplace = (input: string): string => {
    let res = '';
    let i = 0;
    while (i < input.length) {
      if (input[i] === '\\') {
        const m = /^\\(section|subsection|subsubsection)(\*)?\s*\{/.exec(input.slice(i));
        if (m) {
          const level = m[1];
          const starred = Boolean(m[2]);
          const openIdx = i + m[0].length - 1;
          const grp = readBraceGroup(input, openIdx);
          if (grp) {
            let prefix = '';
            if (!starred) {
              if (level === 'section') {
                secNum++;
                subSecNum = 0;
                subSubSecNum = 0;
                prefix = `${secNum}. `;
              } else if (level === 'subsection') {
                subSecNum++;
                subSubSecNum = 0;
                prefix = `${secNum || 1}.${subSecNum} `;
              } else {
                subSubSecNum++;
                prefix = `${secNum || 1}.${subSecNum || 1}.${subSubSecNum} `;
              }
            }
            const titleHtml = renderInlineText(grp.content);
            const tag = level === 'section' ? 'h2' : level === 'subsection' ? 'h3' : 'h4';
            const cls =
              level === 'section'
                ? 'mt-6 mb-2.5 text-xl font-bold text-slate-950 border-b border-slate-100 pb-1'
                : level === 'subsection'
                  ? 'mt-5 mb-2 text-lg font-semibold text-slate-900'
                  : 'mt-4 mb-1.5 text-base font-semibold text-slate-800';
            res += holdBlock(`<${tag} class="${cls}">${prefix}${titleHtml}</${tag}>`);
            i = grp.endIndex + 1;
            continue;
          }
        }
      }
      res += input[i];
      i++;
    }
    return res;
  };
  src = sectionReplace(src);

  // Strip alignment/layout declarations that have no visual inline content
  src = src
    .replace(/\\(centering|raggedright|raggedleft|singlespacing|onehalfspacing|doublespacing|newpage|clearpage|pagebreak|maketitle|titlepage)\b/g, '')
    .replace(/\\pagestyle\{[^}]*\}/g, '')
    .replace(/\\vspace\*?\{[^}]*\}/g, '')
    .replace(/\\hspace\*?\{[^}]*\}/g, ' ')
    .replace(/\\begin\{(center|flushleft|flushright|abstract)\}/g, '')
    .replace(/\\end\{(center|flushleft|flushright|abstract)\}/g, '');

  // Split into paragraphs
  const paragraphs = src
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const renderedParagraphs = paragraphs.map((p) => {
    if (/^\u0000MWBLK\d+\u0000$/.test(p)) {
      return p;
    }
    // Check if paragraph contains block placeholders mixed with text
    const parts = p.split(/(\u0000MWBLK\d+\u0000)/g).filter((s) => s.trim().length > 0);
    return parts
      .map((part) => {
        if (/^\u0000MWBLK\d+\u0000$/.test(part)) return part;
        return `<p class="my-2.5 leading-relaxed text-slate-800">${renderInlineText(part.trim())}</p>`;
      })
      .join('\n');
  });

  let html = renderedParagraphs.join('\n');
  for (let pass = 0; pass < 6; pass++) {
    if (!html.includes('\u0000MWBLK')) break;
    html = html.replace(/\u0000MWBLK(\d+)\u0000/g, (_, idx) => blocks[Number(idx)] ?? '');
  }

  return html;
}

function stripCommandWithBraceArg(src: string, command: string): string {
  const regex = new RegExp(`\\\\${command}\\s*\\{`);
  let out = src;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(out)) !== null) {
    const openIdx = match.index + match[0].length - 1;
    const grp = readBraceGroup(out, openIdx);
    if (!grp) break;
    out = out.slice(0, match.index) + out.slice(grp.endIndex + 1);
  }
  return out;
}

export function renderLatexDocument(
  latex: string,
  options?: { latexStyle?: LatexThemeStyle }
): string {
  const latexStyle: LatexThemeStyle = options?.latexStyle ?? 'standard';
  const stripped = stripComments(latex || '');
  if (!stripped.trim()) {
    return '<p class="text-sm italic text-slate-400">No LaTeX content to preview yet.</p>';
  }

  const title = extractCommandArg(stripped, 'title');
  const author = extractCommandArg(stripped, 'author');
  const date = extractCommandArg(stripped, 'date');

  // Extract body inside \begin{document}...\end{document} if present
  const docMatch = /\\begin\{document\}([\s\S]*?)\\end\{document\}/.exec(stripped);
  let body = docMatch ? docMatch[1] : stripped;

  // Strip preamble commands when no \begin{document} was supplied
  if (!docMatch) {
    body = body
      .replace(/\\documentclass(?:\[[^\]]*\])?\{[^}]*\}/g, '')
      .replace(/\\usepackage(?:\[[^\]]*\])?\{[^}]*\}/g, '')
      .replace(/\\usetheme(?:\[[^\]]*\])?\{[^}]*\}/g, '')
      .replace(/\\usecolortheme(?:\[[^\]]*\])?\{[^}]*\}/g, '')
      .replace(/\\newtheorem\*?\{[^}]*\}(?:\[[^\]]*\])?\{[^}]*\}(?:\[[^\]]*\])?/g, '');
    body = stripCommandWithBraceArg(body, 'title');
    body = stripCommandWithBraceArg(body, 'subtitle');
    body = stripCommandWithBraceArg(body, 'author');
    body = stripCommandWithBraceArg(body, 'date');
  }

  const renderedBody = renderDocumentBody(body, latexStyle, { title, author, date });
  return `<article class="latex-compiled-doc">${renderedBody}</article>`;
}

export function parseBeamerSlides(latex: string): BeamerSlide[] {
  const stripped = stripComments(latex || '');
  const docTitle = extractCommandArg(stripped, 'title') || 'Presentation';
  const docSubtitle = extractCommandArg(stripped, 'subtitle');
  const docAuthor = extractCommandArg(stripped, 'author');

  const slides: BeamerSlide[] = [];
  const frameRegex = /\\begin\{frame\}([\s\S]*?)\\end\{frame\}/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = frameRegex.exec(stripped)) !== null) {
    const rawLatex = match[0];
    let inner = match[1].trimStart();

    // Skip optional [options]
    if (inner.startsWith('[')) {
      const opt = readBracketGroup(inner, 0);
      if (opt) inner = inner.slice(opt.endIndex + 1).trimStart();
    }

    // Optional {Frame Title} {Frame Subtitle} directly after \begin{frame}
    let frameTitle: string | undefined;
    let frameSubtitle: string | undefined;
    if (inner.startsWith('{')) {
      const grp = readBraceGroup(inner, 0);
      if (grp) {
        frameTitle = grp.content.trim();
        inner = inner.slice(grp.endIndex + 1).trimStart();
        if (inner.startsWith('{')) {
          const subGrp = readBraceGroup(inner, 0);
          if (subGrp) {
            frameSubtitle = subGrp.content.trim();
            inner = inner.slice(subGrp.endIndex + 1).trimStart();
          }
        }
      }
    }

    const explicitTitle = extractCommandArg(inner, 'frametitle');
    const explicitSubtitle = extractCommandArg(inner, 'framesubtitle');
    if (explicitTitle) {
      frameTitle = explicitTitle;
      inner = inner.replace(/\\frametitle\s*\{[^}]*\}/g, '');
    }
    if (explicitSubtitle) {
      frameSubtitle = explicitSubtitle;
      inner = inner.replace(/\\framesubtitle\s*\{[^}]*\}/g, '');
    }

    const isTitleSlide = /\\(titlepage|maketitle)/.test(inner);
    if (isTitleSlide) {
      const remaining = inner.replace(/\\(titlepage|maketitle)/g, '').trim();
      const extraHtml = remaining ? renderDocumentBody(remaining, 'tagged', {}) : '';
      slides.push({
        index: idx++,
        title: docTitle,
        subtitle: docSubtitle || docAuthor,
        isTitleSlide: true,
        bodyHtml: extraHtml,
        rawLatex,
      });
      continue;
    }

    const bodyHtml = renderDocumentBody(inner, 'tagged', {});
    slides.push({
      index: idx++,
      title: frameTitle || `Slide ${idx}`,
      subtitle: frameSubtitle,
      isTitleSlide: false,
      bodyHtml,
      rawLatex,
    });
  }

  if (slides.length === 0 && stripped.trim()) {
    slides.push({
      index: 0,
      title: docTitle,
      subtitle: docSubtitle || docAuthor,
      isTitleSlide: false,
      bodyHtml: renderLatexDocument(stripped),
      rawLatex: stripped,
    });
  }

  return slides;
}
