'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Loader2,
  Presentation,
  Upload,
} from 'lucide-react';
import ConversionPickerModal from '@/components/app/ConversionPickerModal';
import LatexEditorPane from '@/components/app/LatexEditorPane';
import { downloadFile, openInOverleaf, printCompiledPdf } from '@/lib/exporters';
import { parseBeamerSlides } from '@/lib/latex-renderer';
import { generateSlides } from '@/lib/publik';
import { getAppPreferences, getConversions, saveConversion } from '@/lib/storage';
import { ConversionItem } from '@/types/mathwrite';

type BeamerTheme = 'Madrid' | 'Goettingen' | 'Warsaw' | 'Singapore' | 'Berlin' | 'Berkeley';
type SlidePalette = 'Blue' | 'Emerald' | 'Crimson' | 'Teal' | 'Slate';
type SlideLength = 'brief' | 'normal' | 'extended';

const BEAMER_THEMES: Array<{ id: BeamerTheme; desc: string }> = [
  { id: 'Madrid', desc: 'Classic footer bar & framed title box' },
  { id: 'Goettingen', desc: 'Clean right-hand navigation sidebar' },
  { id: 'Warsaw', desc: 'Bold split top header & shadow blocks' },
  { id: 'Singapore', desc: 'Minimalist top gradient header' },
  { id: 'Berlin', desc: 'Top section bar with slide progress' },
  { id: 'Berkeley', desc: 'Structured left-hand outline sidebar' },
];

const PALETTE_STYLES: Record<
  SlidePalette,
  {
    swatch: string;
    primaryBg: string;
    secondaryBg: string;
    accentText: string;
    border: string;
    softBg: string;
  }
> = {
  Blue: {
    swatch: '#2563eb',
    primaryBg: 'bg-blue-700',
    secondaryBg: 'bg-blue-900',
    accentText: 'text-blue-700',
    border: 'border-blue-600',
    softBg: 'bg-blue-50',
  },
  Emerald: {
    swatch: '#059669',
    primaryBg: 'bg-emerald-700',
    secondaryBg: 'bg-emerald-900',
    accentText: 'text-emerald-700',
    border: 'border-emerald-600',
    softBg: 'bg-emerald-50',
  },
  Crimson: {
    swatch: '#dc2626',
    primaryBg: 'bg-red-700',
    secondaryBg: 'bg-rose-950',
    accentText: 'text-red-700',
    border: 'border-red-600',
    softBg: 'bg-red-50',
  },
  Teal: {
    swatch: '#0f766e',
    primaryBg: 'bg-teal-700',
    secondaryBg: 'bg-teal-900',
    accentText: 'text-teal-700',
    border: 'border-teal-600',
    softBg: 'bg-teal-50',
  },
  Slate: {
    swatch: '#334155',
    primaryBg: 'bg-slate-800',
    secondaryBg: 'bg-slate-950',
    accentText: 'text-slate-800',
    border: 'border-slate-700',
    softBg: 'bg-slate-100',
  },
};

const LENGTH_OPTIONS: Array<{ id: SlideLength; label: string; range: string }> = [
  { id: 'brief', label: 'Brief', range: '3–6 slides' },
  { id: 'normal', label: 'Normal', range: '6–10 slides' },
  { id: 'extended', label: 'Extended', range: '10–15 slides' },
];

const BEAMER_COLOR_MAP: Record<SlidePalette, string> = {
  Blue: 'default',
  Emerald: 'spruce',
  Crimson: 'beaver',
  Teal: 'seahorse',
  Slate: 'dove',
};

const DEFAULT_SOURCE_LATEX = `\\documentclass{article}
\\usepackage{amsmath, amssymb, amsthm}

\\title{The Spectral Theorem & Quadratic Forms}
\\author{OpenTEX Lecture Notes}

\\begin{document}
\\maketitle

\\section{Symmetric Matrices}
Let $A \\in \\mathbb{R}^{n \\times n}$ satisfy $A = A^T$. Every eigenvalue of $A$ is real, and eigenvectors corresponding to distinct eigenvalues are orthogonal:
\\[
\\lambda_1 \\neq \\lambda_2 \\implies \\mathbf{v}_1 \\cdot \\mathbf{v}_2 = 0.
\\]

\\section{Orthogonal Diagonalization}
There exists an orthogonal matrix $Q$ ($Q^T Q = I$) and diagonal matrix $\\Lambda$ such that:
\\begin{equation}
A = Q \\Lambda Q^T = \\sum_{i=1}^{n} \\lambda_i \\mathbf{q}_i \\mathbf{q}_i^T.
\\end{equation}

\\end{document}`;

export default function SlidesPage() {
  const [sourceLatex, setSourceLatex] = useState(DEFAULT_SOURCE_LATEX);
  const [deckTitle, setDeckTitle] = useState('Spectral Theorem Presentation');
  const [theme, setTheme] = useState<BeamerTheme>('Madrid');
  const [colorPalette, setColorPalette] = useState<SlidePalette>('Blue');
  const [length, setLength] = useState<SlideLength>('normal');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [beamerLatex, setBeamerLatex] = useState<string>('');
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [outputMode, setOutputMode] = useState<'deck' | 'code'>('deck');
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    const found = getConversions().find((c) => c.id === id);
    if (found) {
      setSourceLatex(found.latex);
      setDeckTitle(`${found.title} Slides`);
    }
  }, []);

  const slides = useMemo(() => {
    if (!beamerLatex.trim()) return [];
    return parseBeamerSlides(beamerLatex);
  }, [beamerLatex]);

  useEffect(() => {
    if (activeSlideIdx >= slides.length && slides.length > 0) {
      setActiveSlideIdx(slides.length - 1);
    }
  }, [slides.length, activeSlideIdx]);

  // Keyboard navigation in deck view
  useEffect(() => {
    if (outputMode !== 'deck' || slides.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      if (e.key === 'ArrowRight') {
        setActiveSlideIdx((i) => Math.min(slides.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        setActiveSlideIdx((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [outputMode, slides.length]);

  const handleFileUpload = (file: File) => {
    setErrorMsg(null);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      setErrorMsg('PDFs must be converted to LaTeX in Convert Notes first, then loaded here via Pick Conversion.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSourceLatex(reader.result);
        setDeckTitle(file.name.replace(/\.[^.]+$/, ''));
      }
    };
    reader.onerror = () => {
      setErrorMsg('Could not read the selected file. Please try again.');
    };
    reader.readAsText(file);
  };

  const handleThemeChange = (nextTheme: BeamerTheme) => {
    setTheme(nextTheme);
    if (beamerLatex) {
      setBeamerLatex((prev) =>
        /\\usetheme\{[^}]*\}/.test(prev)
          ? prev.replace(/\\usetheme\{[^}]*\}/, `\\usetheme{${nextTheme}}`)
          : prev
      );
    }
  };

  const handlePaletteChange = (nextPalette: SlidePalette) => {
    setColorPalette(nextPalette);
    if (beamerLatex) {
      const beamerColor = BEAMER_COLOR_MAP[nextPalette] || 'default';
      setBeamerLatex((prev) =>
        /\\usecolortheme\{[^}]*\}/.test(prev)
          ? prev.replace(/\\usecolortheme\{[^}]*\}/, `\\usecolortheme{${beamerColor}}`)
          : prev
      );
    }
  };

  const handlePickConversion = (item: ConversionItem) => {
    setSourceLatex(item.latex);
    setDeckTitle(`${item.title} Slides`);
  };

  const handleGenerate = async () => {
    if (!sourceLatex.trim()) {
      setErrorMsg('Please paste LaTeX, upload a file, or pick a saved conversion first.');
      return;
    }
    setErrorMsg(null);
    setGenerating(true);
    try {
      const res = await generateSlides({
        latex: sourceLatex,
        theme,
        colorPalette,
        length,
        deckTitle: deckTitle.trim() || undefined,
      });
      setBeamerLatex(res.result);
      setActiveSlideIdx(0);
      setOutputMode('deck');
      setTimeout(() => {
        deckRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);

      if (getAppPreferences().saveHistory) {
        const parsed = parseBeamerSlides(res.result);
        saveConversion({
          id: `slides-${Date.now()}`,
          title: deckTitle.trim() || `${theme} Beamer Presentation`,
          fileName: `${(deckTitle || 'presentation').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.tex`,
          fileType: 'SLIDES',
          model: 'professional',
          pages: Math.max(1, parsed.length),
          latex: res.result,
          createdAt: new Date().toISOString(),
          folderId: 'general',
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate slides.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!beamerLatex) return;
    try {
      await navigator.clipboard.writeText(beamerLatex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handlePrintDeck = () => {
    if (slides.length === 0) return;
    const html = slides
      .map(
        (s) =>
          `<section style="page-break-after: always; padding: 2rem; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 1.5rem;">
            <h2 style="margin-top:0;">${s.title || `Slide ${s.index + 1}`}</h2>
            ${s.subtitle ? `<p style="color:#475569; margin-top:-0.5rem;">${s.subtitle}</p>` : ''}
            <div>${s.bodyHtml}</div>
          </section>`
      )
      .join('\n');
    if (!printCompiledPdf(html, deckTitle)) {
      setErrorMsg('Pop-up blocked. Please allow pop-ups in your browser to save or print the PDF.');
    }
  };

  const paletteStyle = PALETTE_STYLES[colorPalette];
  const currentSlide = slides[activeSlideIdx];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#0071E3]/10 px-3 py-1 text-xs font-medium text-[#0071E3]">
            <Presentation className="h-3.5 w-3.5" />
            <span>Beamer Presentation Generator · Free Unlimited</span>
          </div>
          <h1 className="mt-2 font-serif text-3xl font-normal tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
            Turn LaTeX Notes into Beamer Slides
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Customize theme, color palette, and deck length, then preview or export straight to Overleaf.
          </p>
        </div>
      </div>

      {/* Top Setup Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Source Input */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xs lg:col-span-6 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-semibold">Source LaTeX or Notes</label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <FolderOpen className="h-3.5 w-3.5 text-blue-500" />
                Pick Conversion
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload .tex / .txt
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".tex,.txt,text/plain"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
              />
            </div>
          </div>

          <input
            type="text"
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
            placeholder="Presentation title"
            className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-950"
          />

          <textarea
            value={sourceLatex}
            onChange={(e) => setSourceLatex(e.target.value)}
            spellCheck={false}
            placeholder="Paste your LaTeX document or lecture notes here..."
            className="font-mono min-h-[250px] flex-1 resize-y rounded-xl border border-slate-200 bg-slate-950 p-3.5 text-xs leading-relaxed text-slate-100 outline-none focus:border-blue-500 dark:border-slate-800"
          />
        </div>

        {/* Customization Controls */}
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xs lg:col-span-6 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
          {/* 6 Beamer Themes */}
          <div>
            <label className="mb-2 block text-sm font-semibold">Beamer Theme (6)</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {BEAMER_THEMES.map((t) => {
                const selected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleThemeChange(t.id)}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      selected
                        ? 'border-[#0071E3] bg-[#0071E3]/10 ring-1 ring-[#0071E3]'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">{t.id}</div>
                    <div className="mt-0.5 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                      {t.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5 Color Palettes */}
          <div>
            <label className="mb-2 block text-sm font-semibold">Color Palette (5)</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PALETTE_STYLES) as SlidePalette[]).map((pal) => {
                const selected = colorPalette === pal;
                return (
                  <button
                    key={pal}
                    type="button"
                    onClick={() => handlePaletteChange(pal)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                      selected
                        ? 'border-[#0071E3] bg-[#0071E3]/10 ring-1 ring-[#0071E3]'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-md"
                      style={{ backgroundColor: PALETTE_STYLES[pal].swatch }}
                    />
                    <span>{pal}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Lengths */}
          <div>
            <label className="mb-2 block text-sm font-semibold">Presentation Length</label>
            <div className="grid grid-cols-3 gap-2">
              {LENGTH_OPTIONS.map((len) => {
                const selected = length === len.id;
                return (
                  <button
                    key={len.id}
                    type="button"
                    onClick={() => setLength(len.id)}
                    className={`rounded-xl border p-2.5 text-center transition-all ${
                      selected
                        ? 'border-[#0071E3] bg-[#0071E3]/10 ring-1 ring-[#0071E3]'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">{len.label}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {len.range}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-600 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0071E3] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0077ED] disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating Beamer Deck…</span>
              </>
            ) : (
              <>
                <Presentation className="h-4 w-4" />
                <span>Generate presentation · Free · Publik AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Slide Deck Viewer / Code */}
      {beamerLatex && (
        <div
          ref={deckRef}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        >
          {/* Viewer Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setOutputMode('deck')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    outputMode === 'deck'
                      ? 'bg-[#0071E3] text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  <Presentation className="h-3.5 w-3.5" />
                  Slide Deck ({slides.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOutputMode('code')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    outputMode === 'code'
                      ? 'bg-[#0071E3] text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  Beamer Code
                </button>
              </div>
              <span className="hidden rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex dark:bg-slate-800 dark:text-slate-300">
                {theme} · {colorPalette}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadFile(
                    beamerLatex,
                    `${(deckTitle || 'slides').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.tex`,
                    'application/x-tex;charset=utf-8'
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download .tex</span>
              </button>
              <button
                type="button"
                onClick={handlePrintDeck}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Download PDF</span>
              </button>
              <button
                type="button"
                onClick={() => openInOverleaf(beamerLatex, deckTitle)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open in Overleaf</span>
              </button>
            </div>
          </div>

          {outputMode === 'code' ? (
            <LatexEditorPane
              latex={beamerLatex}
              onChange={setBeamerLatex}
              title={deckTitle}
              className="min-h-[520px]"
            />
          ) : currentSlide ? (
            <div className="space-y-4">
              {/* Slide Stage (16:9 desktop, flexible min-height on mobile) */}
              <div className="mx-auto max-w-4xl">
                <div className="relative flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-lg sm:aspect-[16/9] sm:min-h-0">
                  {/* Warsaw / Berlin top bar */}
                  {(theme === 'Warsaw' || theme === 'Berlin') && (
                    <div className={`flex items-center justify-between px-6 py-2 text-[11px] font-medium text-white ${paletteStyle.secondaryBg}`}>
                      <span className="truncate pr-3">{deckTitle}</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {slides.map((s, idx) => (
                          <span
                            key={s.index}
                            className={`h-1.5 w-4 rounded-md ${
                              idx === activeSlideIdx ? 'bg-white' : 'bg-white/30'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Singapore top accent rule */}
                  {theme === 'Singapore' && (
                    <div className={`h-2 w-full ${paletteStyle.primaryBg}`} />
                  )}

                  <div className="flex flex-1 overflow-hidden">
                    {/* Berkeley left sidebar */}
                    {theme === 'Berkeley' && (
                      <div className={`hidden w-40 shrink-0 flex-col justify-between p-4 text-white sm:flex ${paletteStyle.secondaryBg}`}>
                        <div className="flex min-h-0 flex-1 flex-col">
                          <div className="text-xs font-bold leading-snug">{deckTitle}</div>
                          <div className="mt-4 flex-1 space-y-1.5 overflow-y-auto pr-1 text-[10px] text-white/75">
                            {slides.map((s, i) => (
                              <button
                                key={s.index}
                                type="button"
                                onClick={() => setActiveSlideIdx(i)}
                                className={`block w-full truncate text-left ${
                                  i === activeSlideIdx ? 'font-bold text-white underline' : 'hover:text-white'
                                }`}
                              >
                                {i + 1}. {s.title || 'Slide'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="pt-2 text-[10px] text-white/60">Berkeley</div>
                      </div>
                    )}

                    {/* Main Frame Body */}
                    <div className="flex flex-1 flex-col overflow-hidden">
                      {currentSlide.isTitleSlide ? (
                        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center sm:p-8">
                          <div
                            className={`w-full max-w-xl rounded-xl px-6 py-5 text-white shadow-md sm:px-8 sm:py-6 ${paletteStyle.primaryBg}`}
                          >
                            <h2 className="text-xl font-bold tracking-tight sm:text-3xl">
                              {currentSlide.title || deckTitle}
                            </h2>
                            {currentSlide.subtitle && (
                              <p className="mt-2 text-xs text-white/85 sm:text-sm">{currentSlide.subtitle}</p>
                            )}
                          </div>
                          {currentSlide.bodyHtml && (
                            <div
                              className="latex-compiled-doc mt-5 max-w-xl text-sm text-slate-600"
                              dangerouslySetInnerHTML={{ __html: currentSlide.bodyHtml }}
                            />
                          )}
                        </div>
                      ) : (
                        <>
                          <div
                            className={`px-6 py-3.5 sm:px-7 sm:py-4 ${
                              theme === 'Singapore' || theme === 'Goettingen'
                                ? `border-b-2 bg-white ${paletteStyle.border}`
                                : `${paletteStyle.primaryBg} text-white`
                            }`}
                          >
                            <h3
                              className={`text-base font-bold sm:text-xl ${
                                theme === 'Singapore' || theme === 'Goettingen'
                                  ? paletteStyle.accentText
                                  : 'text-white'
                              }`}
                            >
                              {currentSlide.title || `Slide ${activeSlideIdx + 1}`}
                            </h3>
                            {currentSlide.subtitle && (
                              <p className="mt-0.5 text-xs opacity-85">{currentSlide.subtitle}</p>
                            )}
                          </div>

                          <div className="flex-1 overflow-y-auto px-6 py-4 sm:px-9 sm:py-5">
                            <div
                              className="latex-compiled-doc prose prose-slate max-w-none text-sm sm:text-base"
                              dangerouslySetInnerHTML={{ __html: currentSlide.bodyHtml }}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Goettingen right sidebar */}
                    {theme === 'Goettingen' && (
                      <div className={`hidden w-40 shrink-0 flex-col justify-between border-l border-slate-200 p-4 sm:flex ${paletteStyle.softBg}`}>
                        <div className="flex min-h-0 flex-1 flex-col">
                          <div className={`text-xs font-bold ${paletteStyle.accentText}`}>
                            {deckTitle}
                          </div>
                          <div className="mt-4 flex-1 space-y-1.5 overflow-y-auto pr-1 text-[10px] text-slate-600">
                            {slides.map((s, i) => (
                              <button
                                key={s.index}
                                type="button"
                                onClick={() => setActiveSlideIdx(i)}
                                className={`block w-full truncate text-left ${
                                  i === activeSlideIdx ? 'font-bold text-slate-900 underline' : 'hover:text-slate-900'
                                }`}
                              >
                                {i + 1}. {s.title || 'Slide'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="pt-2 text-[10px] text-slate-400">Goettingen</div>
                      </div>
                    )}
                  </div>

                  {/* Madrid / Default Bottom Footer */}
                  <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-1.5 text-[11px] text-slate-500">
                    <span className="truncate font-medium">{deckTitle}</span>
                    <span className="shrink-0 pl-2 tabular-nums">
                      {activeSlideIdx + 1} / {slides.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Arrows & Thumbnails */}
              <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSlideIdx((i) => Math.max(0, i - 1))}
                  disabled={activeSlideIdx === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {slides.map((slide, idx) => (
                    <button
                      key={slide.index}
                      type="button"
                      onClick={() => setActiveSlideIdx(idx)}
                      title={slide.title || `Slide ${idx + 1}`}
                      className={`h-7 min-w-7 rounded-lg border px-2 text-xs font-semibold tabular-nums transition-all ${
                        idx === activeSlideIdx
                          ? 'border-[#0071E3] bg-[#0071E3] text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0071E3] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSlideIdx((i) => Math.min(slides.length - 1, i + 1))}
                  disabled={activeSlideIdx >= slides.length - 1}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-slate-500">
              No slides parsed from the generated Beamer code. Switch to Beamer Code to inspect.
            </div>
          )}
        </div>
      )}

      <ConversionPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickConversion}
      />
    </div>
  );
}
