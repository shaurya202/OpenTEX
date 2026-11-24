import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const moduleCache = new Map();

function loadTsModule(relPath) {
  const absPath = relPath.startsWith('@/')
    ? resolveTsFile(path.join(SRC, relPath.slice(2)))
    : resolveTsFile(path.resolve(ROOT, relPath));

  if (moduleCache.has(absPath)) {
    return moduleCache.get(absPath).exports;
  }

  const source = fs
    .readFileSync(absPath, 'utf8')
    .replace(/\bimport\.meta\.url\b/g, 'require("node:url").pathToFileURL(__filename).href');
  const transpiled = ts.transpileModule(source, {
    fileName: absPath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });

  const mod = new Module(absPath);
  mod.filename = absPath;
  mod.paths = Module._nodeModulePaths(path.dirname(absPath));
  moduleCache.set(absPath, mod);

  const localRequire = (spec) => {
    if (spec.startsWith('@/')) {
      return loadTsModule(spec);
    }
    if (spec.startsWith('.')) {
      const target = path.resolve(path.dirname(absPath), spec);
      return loadTsModule(target);
    }
    return require(spec);
  };

  const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', transpiled.outputText);
  fn(mod.exports, localRequire, mod, absPath, path.dirname(absPath));
  return mod.exports;
}

function resolveTsFile(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  throw new Error(`Cannot resolve TypeScript module: ${base}`);
}

async function run() {
  const { renderLatexDocument, parseBeamerSlides } = loadTsModule('@/lib/latex-renderer.ts');
  const { executePublikAction, stripInventedScaffolding } = loadTsModule('@/lib/publik.ts');
  const { credentialPath, readCredential, writeCredential, resolveProvider, withRequestCredential } = loadTsModule('@/lib/publik-sdk.ts');
  const { downloadConvertedDocument, openInOverleaf, printCompiledPdf, renderPdfBytes } = loadTsModule('@/lib/exporters.ts');
  const { tokenizeLatexLine } = loadTsModule('@/components/app/LatexEditorPane.tsx');

  // 1. LaTeX syntax tokenizer
  const tokens = tokenizeLatexLine('\\frac{a}{b} $x^2 + \\$1$ % comment');
  assert.equal(tokens[0].kind, 'command');
  assert.equal(tokens[0].text, '\\frac');
  assert.ok(tokens.some((t) => t.kind === 'math' && t.text === '$x^2 + \\$1$'));
  assert.equal(tokens.at(-1).kind, 'comment');

  // 2. Beamer title slide deduplication & remainder text
  const beamerTex = [
    '\\documentclass{beamer}',
    '\\title{Spectral Notes}',
    '\\subtitle{Linear Algebra}',
    '\\begin{document}',
    '\\begin{frame}',
    '\\titlepage',
    'Extra intro line.',
    '\\end{frame}',
    '\\begin{frame}{Main Result}',
    'Body equation $Ax=\\lambda x$.',
    '\\end{frame}',
    '\\end{document}',
  ].join('\n');
  const slides = parseBeamerSlides(beamerTex);
  assert.equal(slides.length, 2);
  assert.equal(slides[0].isTitleSlide, true);
  assert.equal(slides[0].title, 'Spectral Notes');
  assert.equal(slides[0].subtitle, 'Linear Algebra');
  assert.ok(!slides[0].bodyHtml.includes('Spectral Notes'));
  assert.ok(slides[0].bodyHtml.includes('Extra intro line.'));

  // 3. Tables header detection, Proof QED, and TikZ unique IDs + fallback
  const docHtml = renderLatexDocument(
    [
      '\\begin{tabular}{cc}\\hline A & B \\\\ \\hline 1 & 2 \\\\ \\end{tabular}',
      '\\begin{tabular}{cc} X & Y \\\\ 3 & 4 \\\\ \\end{tabular}',
      '\\begin{proof}Trivial.\\end{proof}',
      '\\begin{tikzpicture}\\draw (0,0) circle (1);\\end{tikzpicture}',
      '\\begin{tikzpicture}\\draw[help lines] (-1,-1) grid (1,1);\\draw (0,0) -- (1,1);\\end{tikzpicture}',
      '\\begin{tikzpicture}\\matrix (m) {a & b\\\\};\\end{tikzpicture}',
    ].join('\n\n')
  );
  assert.match(docHtml, /<th[^>]*>A<\/th>/);
  assert.doesNotMatch(docHtml, /<th[^>]*>X<\/th>/);
  assert.match(docHtml, /<td[^>]*>X<\/td>/);
  assert.ok(docHtml.includes('mw-qed'));
  const gridIds = [...docHtml.matchAll(/id="(ot-tikz-grid-[^"]+)"/g)].map((m) => m[1]);
  assert.ok(gridIds.length >= 2 && new Set(gridIds).size === gridIds.length);
  assert.ok(docHtml.includes('not supported natively in-browser'));

  // 4. Publik fallback safety checks & serverless missing-homedir resilience
  const priorCred = readCredential();
  const prevLocalAppData = process.env.LOCALAPPDATA;
  const prevXdg = process.env.XDG_CONFIG_HOME;
  try {
    const unwritableBase = path.join(fileURLToPath(import.meta.url), 'sbx_user1051', '.config');
    process.env.LOCALAPPDATA = unwritableBase;
    process.env.XDG_CONFIG_HOME = unwritableBase;
    assert.ok(path.isAbsolute(credentialPath()));
    writeCredential({
      key: 'pk_test_serverless_fallback',
      base_url: 'https://publikhq.com/api/v1',
      install_id: '00000000-0000-4000-8000-000000000000',
      claim_url: null,
      choice: 'publik',
    });
    assert.equal(readCredential()?.key, 'pk_test_serverless_fallback');
    writeCredential(priorCred);
  } finally {
    if (prevLocalAppData === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = prevLocalAppData;
    if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = prevXdg;
  }

  const testRes = await executePublikAction({ action: 'test', config: { baseUrl: '', apiKey: '', professionalModel: 'publik-smart', turboModel: 'publik-fast' } });
  assert.equal(testRes.result.ok, false);

  const fmtBeamer = await executePublikAction({
    action: 'formatLatex',
    latex: beamerTex,
    lineSpacing: 'Double',
    fontSize: '12pt',
    margins: 'Normal 2.54cm',
    textAlign: 'Left',
    pageNumbers: true,
    config: { baseUrl: '', apiKey: '', professionalModel: 'publik-smart', turboModel: 'publik-fast' },
  });
  assert.ok(fmtBeamer.result.includes('\\documentclass{beamer}'));

  const suggestRes = await executePublikAction({
    action: 'suggestEdit',
    latex: '\\documentclass{article}\n\\begin{document}\nLet $x > 0$.\n\\end{document}',
    selectedText: 'Let $x > 0$.',
    instruction: 'Expand the inequality step',
    config: { baseUrl: '', apiKey: '', professionalModel: 'publik-smart', turboModel: 'publik-fast' },
  });
  assert.ok(!suggestRes.result.includes('\\documentclass'));

  const slideGen = await executePublikAction({
    action: 'generateSlides',
    latex: '\\section{Intro}\n\\subsection{Setup}\nText $a=b$.\n\\section{Proof}\nDone.',
    theme: 'Madrid',
    colorPalette: 'Blue',
    length: 'extended',
    deckTitle: 'Custom Deck Title',
    config: { baseUrl: '', apiKey: '', professionalModel: 'publik-smart', turboModel: 'publik-fast' },
  });
  assert.ok(slideGen.result.includes('\\title{Custom Deck Title}'));
  assert.ok(slideGen.result.includes('Intro: Setup'));
  assert.ok(!slideGen.result.includes('Worked Example & Intuition'));

  // 5. PDF base64 readable text extraction
  const fakePdfText = '%PDF-1.4\n1 0 obj\n<<>>\nstream\nBT /F1 12 Tf (Spectral Theorem Proof) Tj ET\nendstream\nendobj';
  const pdfDataUrl = `data:application/pdf;base64,${Buffer.from(fakePdfText, 'utf8').toString('base64')}`;
  const pdfConv = await executePublikAction({
    action: 'convertToLatex',
    fileName: 'lecture.pdf',
    mimeType: 'application/pdf',
    fileDataUrl: pdfDataUrl,
    model: 'professional',
    settings: { preset: 'balanced', latexStyle: 'standard', language: 'en', title: true, toc: false, numbering: true, images: false, colours: false, diagrams: 'draw' },
    config: { baseUrl: '', apiKey: '', professionalModel: 'publik-smart', turboModel: 'publik-fast' },
  });
  assert.ok(pdfConv.result.includes('Spectral Theorem Proof'));

  // 6. Exporters: valid OOXML/ODF zip packages & popup-blocked return value
  const captured = [];
  const origDoc = globalThis.document;
  const origUrl = globalThis.URL;
  const origWin = globalThis.window;
  globalThis.document = {
    body: { appendChild() {}, removeChild() {} },
    createElement() {
      return { style: {}, click() {} };
    },
  };
  globalThis.URL = {
    createObjectURL(blob) {
      captured.push(blob);
      return 'blob:test';
    },
    revokeObjectURL() {},
  };
  globalThis.window = { open: () => null };
  try {
    assert.equal(printCompiledPdf('<p>Test</p>', 'Test'), false);
    downloadConvertedDocument('# Heading & <script>\n\nParagraph.', 'docx', 'My Notes');
    downloadConvertedDocument('# Heading & <script>\n\nParagraph.', 'odt', 'My Notes');
    assert.equal(captured.length, 2);
    const docxBytes = Buffer.from(await captured[0].arrayBuffer());
    const odtBytes = Buffer.from(await captured[1].arrayBuffer());
    assert.equal(docxBytes.slice(0, 2).toString('utf8'), 'PK');
    assert.equal(odtBytes.slice(0, 2).toString('utf8'), 'PK');
    assert.ok(docxBytes.toString('utf8').includes('word/document.xml'));
    assert.ok(docxBytes.toString('utf8').includes('&lt;script&gt;'));
    assert.ok(odtBytes.toString('utf8').includes('content.xml'));
    downloadConvertedDocument('# Limits\n\n$x=1$', 'markdown', 'Notes');
    assert.equal(captured.length, 3);
    assert.match(captured[2].type, /^text\/plain/);
    assert.doesNotMatch(captured[2].type, /markdown/);
    assert.equal(openInOverleaf('\\begin{document}x\\end{document}', 'Notes'), false);
    const pdfBytes = Buffer.from(renderPdfBytes('Two equations', '<p>x^2 + y^2 = 1</p>'));
    assert.equal(pdfBytes.slice(0, 5).toString('utf8'), '%PDF-');
    assert.ok(pdfBytes.includes(Buffer.from('Two equations')));
    assert.ok(pdfBytes.includes(Buffer.from('x^2 + y^2 = 1')));
  } finally {
    globalThis.document = origDoc;
    globalThis.URL = origUrl;
    globalThis.window = origWin;
  }

  const prevApiKey = process.env.PUBLIK_API_KEY;
  try {
    process.env.PUBLIK_API_KEY = 'pk_env_should_lose';
    const chosen = resolveProvider({ baseURL: 'https://example.com/api/v1', apiKey: 'pk_user_settings_key' });
    assert.equal(chosen.kind, 'own');
    assert.equal(chosen.apiKey, 'pk_user_settings_key');
    const envFallback = resolveProvider({ baseURL: 'https://example.com/api/v1', apiKey: '   ' });
    assert.equal(envFallback.kind, 'publik');
    assert.equal(envFallback.apiKey, 'pk_env_should_lose');
  } finally {
    if (prevApiKey === undefined) delete process.env.PUBLIK_API_KEY;
    else process.env.PUBLIK_API_KEY = prevApiKey;
  }

  writeCredential({
    key: 'pk_user_a_shared',
    base_url: 'https://publikhq.com/api/v1',
    install_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    claim_url: null,
  });
  withRequestCredential(
    {
      key: 'pk_user_b',
      base_url: 'https://publikhq.com/api/v1',
      install_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      claim_url: null,
    },
    () => {
      assert.equal(readCredential()?.key, 'pk_user_b');
      writeCredential({
        key: 'pk_user_b2',
        base_url: 'https://publikhq.com/api/v1',
        install_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        claim_url: null,
        choice: 'publik',
      });
      assert.equal(readCredential()?.key, 'pk_user_b2');
    }
  );
  assert.equal(readCredential()?.key, 'pk_user_a_shared');
  withRequestCredential(null, () => {
    assert.equal(readCredential(), null);
  });
  writeCredential(null);

  const invented = stripInventedScaffolding(
    '\\documentclass{article}\n\\title{Mathematical Expressions}\n\\author{OpenTEX · Publik AI}\n\\begin{document}\n\\maketitle\n\\[x^2+y^2=1\\]\n\\[a+b=c\\]\n\\end{document}',
    ''
  );
  assert.ok(!invented.includes('\\title'));
  assert.ok(!invented.includes('\\maketitle'));
  assert.ok(!invented.includes('Mathematical Expressions'));
  assert.ok(invented.includes('x^2+y^2=1'));
  assert.ok(invented.includes('a+b=c'));

  const imageConv = await executePublikAction({
    action: 'convertToLatex',
    fileName: 'two-equations.png',
    mimeType: 'image/png',
    fileDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    model: 'professional',
    settings: { preset: 'balanced', latexStyle: 'standard', title: true },
    config: { baseUrl: '', apiKey: '', professionalModel: 'publik-smart', turboModel: 'publik-fast' },
  });
  assert.equal(typeof imageConv.result, 'string');
  assert.ok(!imageConv.result.includes('\\title'));
  assert.ok(!imageConv.result.includes('\\maketitle'));
  assert.ok(!imageConv.result.includes('Mathematical Expressions'));
  assert.ok(!imageConv.result.includes('\\varepsilon'));

  const mdConv = await Promise.race([
    executePublikAction({
      action: 'convertFormat',
      latex: '\\documentclass{article}\n\\title{Limits}\n\\begin{document}\n\\maketitle\n$x^2+y^2=1$\n\\end{document}',
      format: 'markdown',
      config: { baseUrl: '', apiKey: '', professionalModel: 'publik-smart', turboModel: 'publik-fast' },
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('markdown conversion hung')), 2000)),
  ]);
  assert.equal(typeof mdConv.result, 'string');
  assert.ok(mdConv.result.includes('x^2+y^2=1'));
  assert.ok(mdConv.result.startsWith('# Limits') || mdConv.result.includes('Limits'));

  const stripped = await executePublikAction({
    action: 'convertToLatex',
    fileName: 'lecture.pdf',
    mimeType: 'application/pdf',
    fileDataUrl: pdfDataUrl,
    model: 'professional',
    settings: { preset: 'balanced', title: true },
    config: { baseUrl: '', apiKey: '', professionalModel: 'publik-smart', turboModel: 'publik-fast' },
  });
  assert.ok(!stripped.result.includes('\\title{'));
  assert.ok(!stripped.result.includes('\\maketitle'));

  console.log('ALL SELF-CHECKS PASSED');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
