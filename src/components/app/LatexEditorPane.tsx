'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Code2,
  Columns2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileImage,
  FileText,
  Loader2,
  Wand2,
  X,
} from 'lucide-react';
import {
  copyTextToClipboard,
  downloadCompiledPdf,
  downloadFile,
  openInOverleaf,
  showExportNotice,
} from '@/lib/exporters';
import { renderLatexDocument } from '@/lib/latex-renderer';
import { suggestEdit } from '@/lib/publik';
import { getAppPreferences } from '@/lib/storage';
import { EDITOR_PALETTES, EditorPalette, LatexThemeStyle, PaletteStyle } from '@/types/mathwrite';

type ViewMode = 'split' | 'code' | 'preview';
type PreviewTab = 'compiled' | 'source';

export interface LatexToken {
  text: string;
  kind: 'comment' | 'math' | 'command' | 'braces' | 'plain';
}

export function tokenizeLatexLine(line: string): LatexToken[] {
  const tokens: LatexToken[] = [];
  let i = 0;

  while (i < line.length) {
    // Unescaped comment runs to end of line
    if (line[i] === '%' && (i === 0 || line[i - 1] !== '\\')) {
      tokens.push({ text: line.slice(i), kind: 'comment' });
      break;
    }

    // Inline math $...$
    if (line[i] === '$' && (i === 0 || line[i - 1] !== '\\')) {
      const isDouble = line[i + 1] === '$';
      const delimLen = isDouble ? 2 : 1;
      let j = i + delimLen;
      let found = -1;
      while (j < line.length) {
        if (line[j] === '\\') {
          j += 2;
          continue;
        }
        if (isDouble && line[j] === '$' && line[j + 1] === '$') {
          found = j + 2;
          break;
        }
        if (!isDouble && line[j] === '$') {
          found = j + 1;
          break;
        }
        j++;
      }
      if (found !== -1) {
        tokens.push({ text: line.slice(i, found), kind: 'math' });
        i = found;
        continue;
      }
    }

    // LaTeX commands (\section, \begin, \[...\], etc.)
    if (line[i] === '\\') {
      const m = /^\\(?:[a-zA-Z@]+\*?|[^a-zA-Z\s])/.exec(line.slice(i));
      if (m) {
        tokens.push({ text: m[0], kind: 'command' });
        i += m[0].length;
        continue;
      }
    }

    // Braces and brackets
    if (line[i] === '{' || line[i] === '}' || line[i] === '[' || line[i] === ']') {
      tokens.push({ text: line[i], kind: 'braces' });
      i++;
      continue;
    }

    // Plain text run
    let end = i + 1;
    while (end < line.length) {
      const ch = line[end];
      if (ch === '%' || ch === '$' || ch === '\\' || ch === '{' || ch === '}' || ch === '[' || ch === ']') {
        break;
      }
      end++;
    }
    tokens.push({ text: line.slice(i, end), kind: 'plain' });
    i = end;
  }

  return tokens;
}

function tokenColor(kind: LatexToken['kind'], palette: PaletteStyle): string {
  switch (kind) {
    case 'comment':
      return palette.comment;
    case 'math':
      return palette.math;
    case 'command':
      return palette.command;
    case 'braces':
      return palette.braces;
    default:
      return palette.text;
  }
}

interface LatexEditorPaneProps {
  latex: string;
  onChange: (nextLatex: string) => void;
  title?: string;
  latexStyle?: LatexThemeStyle;
  sourcePreviewUrl?: string;
  sourceFileName?: string;
  sourceMimeType?: string;
  readOnly?: boolean;
  hideSuggest?: boolean;
  headerSlot?: React.ReactNode;
  extraActions?: React.ReactNode;
  metaLabel?: string;
  onSelectionChange?: (selectedSnippet: string) => void;
  className?: string;
}

export default function LatexEditorPane({
  latex,
  onChange,
  title = 'OpenTEX Document',
  latexStyle = 'standard',
  sourcePreviewUrl,
  sourceFileName,
  sourceMimeType,
  readOnly = false,
  hideSuggest = false,
  headerSlot,
  extraActions,
  metaLabel,
  onSelectionChange,
  className = '',
}: LatexEditorPaneProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [previewTab, setPreviewTab] = useState<PreviewTab>('compiled');
  const [paletteId, setPaletteId] = useState<EditorPalette>('mathwrite');
  const [splitPercent, setSplitPercent] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Selection & inline AI suggestions state
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const [selectedText, setSelectedText] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const syncPrefs = () => {
      const prefs = getAppPreferences();
      setPaletteId(prefs.editorPalette || 'mathwrite');
    };
    syncPrefs();
    window.addEventListener('mw-preferences-updated', syncPrefs);
    window.addEventListener('storage', syncPrefs);
    return () => {
      window.removeEventListener('mw-preferences-updated', syncPrefs);
      window.removeEventListener('storage', syncPrefs);
    };
  }, []);

  useEffect(() => {
    if (!sourcePreviewUrl && previewTab === 'source') {
      setPreviewTab('compiled');
    }
  }, [sourcePreviewUrl, previewTab]);

  const palette = EDITOR_PALETTES[paletteId] ?? EDITOR_PALETTES.mathwrite;

  const lines = useMemo(() => latex.split('\n'), [latex]);
  const lineCount = Math.max(1, lines.length);

  const highlightedLines = useMemo(
    () => lines.map((line) => tokenizeLatexLine(line)),
    [lines]
  );

  const renderedHtml = useMemo(() => {
    try {
      return renderLatexDocument(latex, { latexStyle });
    } catch {
      return '<p class="text-red-600 text-sm">Unable to render LaTeX preview.</p>';
    }
  }, [latex, latexStyle]);

  const hasContent = latex.trim().length > 0;
  const hasBalancedBraces = useMemo(() => {
    let depth = 0;
    for (let i = 0; i < latex.length; i++) {
      if (latex[i] === '\\') {
        i++;
        continue;
      }
      if (latex[i] === '{') depth++;
      else if (latex[i] === '}') {
        depth--;
        if (depth < 0) return false;
      }
    }
    return depth === 0;
  }, [latex]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(75, Math.max(25, pct)));
    };

    const handleUp = () => setIsDragging(false);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isDragging]);

  const syncScroll = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (gutterRef.current) {
      gutterRef.current.scrollTop = ta.scrollTop;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = ta.scrollTop;
      highlightRef.current.scrollLeft = ta.scrollLeft;
    }
  };

  // Track text selection silently without popping open the AI Suggest drawer
  const captureSelection = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const snippet = latex.slice(start, end);
    setSelectionRange({ start, end });
    setSelectedText(snippet);
    onSelectionChange?.(snippet);
  }, [latex, onSelectionChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && !readOnly) {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = latex.slice(0, start) + '  ' + latex.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(latex);
    if (ok) {
      setCopied(true);
      setActionNotice('Copied to clipboard.');
      showExportNotice('Copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopied(false);
      setActionNotice('Could not copy to the clipboard.');
      showExportNotice('Could not copy to the clipboard.', 'err');
    }
  };

  const handleDownloadPdf = () => {
    const ok = downloadCompiledPdf(renderedHtml, title);
    setActionNotice(ok ? 'PDF downloaded.' : 'Could not create the PDF.');
  };

  const handleOpenOverleaf = () => {
    const ok = openInOverleaf(latex, title);
    setActionNotice(
      ok
        ? 'Opening in Overleaf…'
        : 'Pop-up blocked. Allow pop-ups for this site to open Overleaf.'
    );
  };

  const safeSlug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'opentex_document';

  const handleSendSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim()) return;
    setSuggestLoading(true);
    setSuggestError(null);
    try {
      const targetText = selectedText.trim() || latex;
      const res = await suggestEdit({
        latex,
        selectedText: targetText,
        instruction: instruction.trim(),
      });
      setProposal(res.result);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : 'Failed to generate suggestion.');
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleAcceptProposal = () => {
    if (!proposal) return;
    const isFullDoc =
      proposal.includes('\\documentclass') ||
      proposal.includes('\\begin{document}') ||
      (selectedText.trim().length > 0 &&
        proposal.length > selectedText.trim().length * 2 &&
        proposal.includes(latex.slice(0, Math.min(24, latex.length))));
    const hasSelection =
      selectedText.trim().length > 0 && selectionRange.end > selectionRange.start;

    if (hasSelection && !isFullDoc) {
      const next =
        latex.slice(0, selectionRange.start) + proposal + latex.slice(selectionRange.end);
      onChange(next);
    } else {
      onChange(proposal);
    }
    setProposal(null);
    setInstruction('');
    setSuggestOpen(false);
  };

  const isPdfSource =
    Boolean(sourceMimeType?.includes('pdf')) ||
    Boolean(sourcePreviewUrl?.startsWith('data:application/pdf'));

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-[#D2D2D7]/80 bg-white text-[#1D1D1F] shadow-xs dark:border-[#2C2C2E] dark:bg-[#1C1C1E] dark:text-[#F5F5F7] ${className}`}
    >
      {/* Optional header slot (for title/folder/metadata in Library or Tools) */}
      {headerSlot}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E5EA] bg-[#FAFAFC] px-3 py-2.5 dark:border-[#2C2C2E] dark:bg-[#161618]">
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode switcher */}
          <div className="inline-flex rounded-xl border border-[#D2D2D7] bg-white p-0.5 dark:border-[#2C2C2E] dark:bg-[#1C1C1E]">
            {(
              [
                { id: 'split', label: 'Split', icon: Columns2 },
                { id: 'code', label: 'Code', icon: Code2 },
                { id: 'preview', label: 'Preview', icon: Eye },
              ] as const
            ).map((mode) => {
              const Icon = mode.icon;
              const active = viewMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setViewMode(mode.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[#0071E3] text-white shadow-xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F] dark:text-[#A1A1A6] dark:hover:text-[#F5F5F7]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Preview status pill */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
              !hasContent
                ? 'bg-black/5 text-[#6E6E73] dark:bg-white/10 dark:text-[#A1A1A6]'
                : hasBalancedBraces
                  ? 'bg-[#34C759]/12 text-[#1D8F3E] dark:text-[#30D158]'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-sm ${
                !hasContent
                  ? 'bg-[#86868B]'
                  : hasBalancedBraces
                    ? 'bg-[#34C759]'
                    : 'bg-amber-500'
              }`}
            />
            {!hasContent
              ? 'Waiting for LaTeX'
              : hasBalancedBraces
                ? 'Preview ready'
                : 'Unbalanced braces'}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {!readOnly && !hideSuggest && viewMode !== 'preview' && (
            <button
              type="button"
              onClick={() => {
                setSuggestOpen((v) => !v);
                setSuggestError(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                suggestOpen
                  ? 'border-[#0071E3] bg-[#0071E3]/10 text-[#0071E3]'
                  : 'border-[#D2D2D7] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] dark:border-[#3A3A3C] dark:bg-[#2C2C2E] dark:text-[#F5F5F7] dark:hover:bg-[#3A3A3C]'
              }`}
            >
              <Wand2 className="h-3.5 w-3.5 text-[#0071E3]" />
              <span>{selectedText.trim() ? 'AI Suggest (Selection)' : 'AI Suggest'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            disabled={!hasContent}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] disabled:opacity-50 dark:border-[#3A3A3C] dark:bg-[#2C2C2E] dark:text-[#F5F5F7] dark:hover:bg-[#3A3A3C]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              downloadFile(latex, `${safeSlug}.tex`, 'application/x-tex;charset=utf-8')
            }
            disabled={!hasContent}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] disabled:opacity-50 dark:border-[#3A3A3C] dark:bg-[#2C2C2E] dark:text-[#F5F5F7] dark:hover:bg-[#3A3A3C]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download .tex</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!hasContent}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] disabled:opacity-50 dark:border-[#3A3A3C] dark:bg-[#2C2C2E] dark:text-[#F5F5F7] dark:hover:bg-[#3A3A3C]"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={handleOpenOverleaf}
            disabled={!hasContent}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#138A36] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#10742D] disabled:opacity-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open in Overleaf</span>
          </button>

          {extraActions}
        </div>
      </div>

      {actionNotice && (
        <div
          role="status"
          className={`border-b px-4 py-2 text-xs ${
            /blocked|could not/i.test(actionNotice)
              ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200'
          }`}
        >
          {actionNotice}
        </div>
      )}

      {/* Main Split / Single Area */}
      <div
        ref={containerRef}
        className={`relative flex min-h-[480px] flex-1 flex-col lg:flex-row ${
          isDragging ? 'select-none' : ''
        }`}
      >
        {/* Code Editor Pane */}
        {viewMode !== 'preview' && (
          <div
            style={
              viewMode === 'split'
                ? ({ '--editor-basis': `${splitPercent}%` } as React.CSSProperties)
                : undefined
            }
            className={`flex min-h-[320px] flex-col overflow-hidden ${
              viewMode === 'split' ? 'w-full lg:w-[var(--editor-basis)] lg:shrink-0' : 'w-full flex-1'
            }`}
          >
            {/* Editor sub-header */}
            <div
              className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5 text-[11px]"
              style={{ backgroundColor: palette.bg, color: palette.gutter }}
            >
              <span className="truncate font-mono">
                {sourceFileName || 'main.tex'} · {palette.name} theme
              </span>
              <span className="shrink-0 whitespace-nowrap">
                {metaLabel ? `${metaLabel} · ` : ''}
                {lineCount} {lineCount === 1 ? 'line' : 'lines'}
              </span>
            </div>

            {/* Line-numbered syntax-highlighted editor */}
            <div
              className="relative flex flex-1 overflow-hidden"
              style={{ backgroundColor: palette.bg }}
            >
              <div
                ref={gutterRef}
                aria-hidden="true"
                className="font-mono w-11 shrink-0 overflow-hidden border-r border-white/10 py-3 pr-2 text-right text-xs leading-6 select-none"
                style={{ color: palette.gutter }}
              >
                {Array.from({ length: lineCount }, (_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>

              <div className="relative flex-1 overflow-hidden">
                <pre
                  ref={highlightRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 m-0 overflow-hidden p-3 font-mono text-[13px] leading-6 whitespace-pre select-none"
                >
                  {highlightedLines.map((lineTokens, lIdx) => (
                    <React.Fragment key={lIdx}>
                      {lineTokens.length === 0 ? ' ' : null}
                      {lineTokens.map((tok, tIdx) => (
                        <span key={tIdx} style={{ color: tokenColor(tok.kind, palette) }}>
                          {tok.text}
                        </span>
                      ))}
                      {lIdx < highlightedLines.length - 1 ? '\n' : '\n'}
                    </React.Fragment>
                  ))}
                </pre>

                <textarea
                  ref={textareaRef}
                  value={latex}
                  onChange={(e) => onChange(e.target.value)}
                  onScroll={syncScroll}
                  onMouseUp={captureSelection}
                  onKeyUp={captureSelection}
                  onSelect={captureSelection}
                  onKeyDown={handleKeyDown}
                  readOnly={readOnly}
                  spellCheck={false}
                  placeholder="% Your LaTeX source code appears here..."
                  wrap="off"
                  aria-label="LaTeX source editor"
                  className="relative z-10 h-full w-full resize-none overflow-auto whitespace-pre border-0 bg-transparent p-3 font-mono text-[13px] leading-6 text-transparent outline-none selection:bg-[#0071E3]/30"
                  style={{ caretColor: palette.command }}
                />
              </div>
            </div>

            {/* Inline AI Code Suggestions Panel */}
            {suggestOpen && !readOnly && !hideSuggest && (
              <div className="border-t border-[#E5E5EA] bg-[#FAFAFC] p-3.5 dark:border-[#2C2C2E] dark:bg-[#161618]">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    <Wand2 className="h-3.5 w-3.5 text-[#0071E3]" />
                    <span>Code Suggestions</span>
                    <span className="rounded-md bg-[#0071E3]/10 px-2 py-0.5 text-[10px] font-medium text-[#0071E3]">
                      Publik AI
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSuggestOpen(false);
                      setProposal(null);
                    }}
                    className="rounded p-1 text-[#6E6E73] hover:bg-[#E5E5EA] hover:text-[#1D1D1F] dark:text-[#A1A1A6] dark:hover:bg-[#2C2C2E]"
                    aria-label="Close suggestions"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mb-2">
                  <div className="mb-1 text-[11px] font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                    Target Scope
                  </div>
                  <div className="font-mono max-h-20 overflow-y-auto rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-1.5 text-xs text-[#1D1D1F] dark:border-[#2C2C2E] dark:bg-[#1C1C1E] dark:text-[#E5E5EA]">
                    {selectedText.trim()
                      ? selectedText
                      : 'Entire document (highlight lines above to target a specific snippet)'}
                  </div>
                </div>

                <form onSubmit={handleSendSuggestion} className="flex gap-2">
                  <input
                    type="text"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="For example: rewrite the proof in more detail"
                    className="min-w-0 flex-1 rounded-lg border border-[#D2D2D7] bg-white px-3 py-1.5 text-xs outline-none focus:border-[#0071E3] dark:border-[#3A3A3C] dark:bg-[#1C1C1E]"
                  />
                  <button
                    type="submit"
                    disabled={suggestLoading || !instruction.trim()}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0071E3] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0077ED] disabled:opacity-50"
                  >
                    {suggestLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5" />
                    )}
                    <span>Send Suggestion</span>
                  </button>
                </form>

                {suggestError && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">{suggestError}</p>
                )}

                {proposal !== null && (
                  <div className="mt-3 rounded-xl border border-[#0071E3]/30 bg-[#0071E3]/5 p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#0071E3]">
                        Proposed Edit
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setProposal(null)}
                          className="rounded-md border border-[#D2D2D7] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] dark:border-[#3A3A3C] dark:bg-[#2C2C2E] dark:text-[#F5F5F7]"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={handleAcceptProposal}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                        >
                          <Check className="h-3 w-3" />
                          Accept
                        </button>
                      </div>
                    </div>
                    <pre className="font-mono max-h-40 overflow-auto rounded-lg bg-[#0B0B0D] p-2.5 text-xs whitespace-pre-wrap text-[#F5F5F7]">
                      {proposal}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ResizableSplit Divider */}
        {viewMode === 'split' && (
          <div
            role="separator"
            aria-orientation="vertical"
            onPointerDown={() => setIsDragging(true)}
            title="Drag to resize editor and preview"
            className={`hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center transition-colors lg:flex ${
              isDragging
                ? 'bg-[#0071E3]'
                : 'bg-[#E5E5EA] hover:bg-[#0071E3]/60 dark:bg-[#2C2C2E] dark:hover:bg-[#0071E3]'
            }`}
          >
            <div className="h-8 w-0.5 rounded-sm bg-white/70" />
          </div>
        )}

        {/* Compiled Preview / Source Pane */}
        {viewMode !== 'code' && (
          <div className="flex min-h-[360px] flex-1 flex-col overflow-hidden bg-[#F5F5F7] dark:bg-[#141416]">
            {/* Optional Source tab header when sourcePreviewUrl exists */}
            {sourcePreviewUrl && (
              <div className="flex items-center justify-between gap-3 border-b border-[#E5E5EA] bg-white px-3 py-1.5 dark:border-[#2C2C2E] dark:bg-[#1C1C1E]">
                <div className="inline-flex shrink-0 rounded-lg bg-[#F5F5F7] p-0.5 dark:bg-[#2C2C2E]">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('compiled')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                      previewTab === 'compiled'
                        ? 'bg-white text-[#1D1D1F] shadow-xs dark:bg-[#3A3A3C] dark:text-[#F5F5F7]'
                        : 'text-[#6E6E73] hover:text-[#1D1D1F] dark:text-[#A1A1A6]'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Compiled
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('source')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                      previewTab === 'source'
                        ? 'bg-white text-[#1D1D1F] shadow-xs dark:bg-[#3A3A3C] dark:text-[#F5F5F7]'
                        : 'text-[#6E6E73] hover:text-[#1D1D1F] dark:text-[#A1A1A6]'
                    }`}
                  >
                    <FileImage className="h-3.5 w-3.5" />
                    Source
                  </button>
                </div>
                {sourceFileName && (
                  <span className="truncate text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                    {sourceFileName}
                  </span>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {previewTab === 'source' && sourcePreviewUrl ? (
                <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center rounded-xl border border-[#D2D2D7] bg-white p-4 shadow-xs dark:border-[#2C2C2E] dark:bg-[#1C1C1E]">
                  {isPdfSource ? (
                    <iframe
                      src={sourcePreviewUrl}
                      title={sourceFileName || 'Uploaded PDF'}
                      className="h-[520px] w-full rounded-lg border border-[#D2D2D7]"
                    />
                  ) : (
                    <img
                      src={sourcePreviewUrl}
                      alt={sourceFileName || 'Uploaded source notes'}
                      className="max-h-[540px] w-auto rounded-lg object-contain"
                    />
                  )}
                </div>
              ) : (
                <div className="mx-auto min-h-full max-w-3xl rounded-xl border border-[#D2D2D7] bg-white px-7 py-8 shadow-xs sm:px-10 sm:py-10 dark:border-white/10">
                  {hasContent ? (
                    <div
                      className="latex-compiled-doc prose prose-slate max-w-none text-[15px]"
                      dangerouslySetInnerHTML={{ __html: renderedHtml }}
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-[#6E6E73]">
                      Compiled KaTeX document preview will appear here.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
