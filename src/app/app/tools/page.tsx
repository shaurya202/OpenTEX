'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Check,
  Crop,
  Download,
  Eraser,
  FileDown,
  FolderOpen,
  Image as ImageIcon,
  Languages,
  LayoutTemplate,
  Loader2,
  PenTool,
  Plus,
  RotateCcw,
  Save,
  Sliders,
  Undo2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import ConversionPickerModal from '@/components/app/ConversionPickerModal';
import LatexEditorPane from '@/components/app/LatexEditorPane';
import {
  applyTemplate,
  convertFormat,
  formatLatex,
  suggestEdit,
  translateLatex,
  vectorizeSketch,
} from '@/lib/publik';
import { downloadConvertedDocument, downloadFile } from '@/lib/exporters';
import {
  getConversions,
  getSettings,
  saveConversion,
  SEED_CONVERSIONS,
} from '@/lib/storage';
import {
  ConversionItem,
  DEFAULT_CONVERSION_SETTINGS,
  LatexThemeStyle,
} from '@/types/mathwrite';

type ToolId = 'format' | 'translate' | 'templates' | 'convert' | 'suggestions' | 'sketch';

const TOOLS: Array<{ id: ToolId; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'format', label: 'Format', description: 'Spacing, fonts, margins & numbering', icon: Sliders },
  { id: 'translate', label: 'Translate', description: 'Translate prose while keeping math intact', icon: Languages },
  { id: 'templates', label: 'Templates', description: 'Apply academic & column layouts', icon: LayoutTemplate },
  { id: 'convert', label: 'Convert', description: 'Export to Word, ODT, Typst, Markdown', icon: FileDown },
  { id: 'suggestions', label: 'Suggestions', description: 'AI-assisted targeted rewrites', icon: Wand2 },
  { id: 'sketch', label: 'Sketch', description: 'Draw or crop diagrams to SVG & TikZ', icon: PenTool },
];

const LANGUAGES = [
  'English',
  'Spanish',
  'German',
  'French',
  'Italian',
  'Portuguese',
  'Chinese',
  'Japanese',
  'Korean',
  'Arabic',
  'Russian',
  'Hindi',
];

function ToolsWorkspaceInner() {
  const searchParams = useSearchParams();
  const initialToolParam = searchParams.get('tool') as ToolId | null;
  const initialIdParam = searchParams.get('id');

  const [activeTool, setActiveTool] = useState<ToolId>(
    initialToolParam && TOOLS.some((t) => t.id === initialToolParam) ? initialToolParam : 'format'
  );
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [latex, setLatex] = useState<string>(SEED_CONVERSIONS[0].latex);
  const [docTitle, setDocTitle] = useState<string>(SEED_CONVERSIONS[0].title);
  const [conversions, setConversions] = useState<ConversionItem[]>(SEED_CONVERSIONS);
  const [latexStyle, setLatexStyle] = useState<LatexThemeStyle>(DEFAULT_CONVERSION_SETTINGS.latexStyle);

  // Picker modal
  const [pickerOpen, setPickerOpen] = useState(false);

  // Status
  const [busy, setBusy] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ text: string; provider?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<'save' | 'copy' | null>(null);

  // Format & Template options
  const [lineSpacing, setLineSpacing] = useState('One and a half');
  const [fontSize, setFontSize] = useState('11pt');
  const [margins, setMargins] = useState('Normal 2.54cm');
  const [textAlign, setTextAlign] = useState('Justified');
  const [pageNumbers, setPageNumbers] = useState(true);

  // Translate
  const [targetLanguage, setTargetLanguage] = useState('Spanish');

  // Templates
  const [template, setTemplate] = useState<'academic' | 'double-column' | 'classic' | 'minimal'>('academic');

  // Convert
  const [convertTarget, setConvertTarget] = useState<'docx' | 'odt' | 'typst' | 'markdown'>('markdown');
  const [convertedPreview, setConvertedPreview] = useState<string | null>(null);

  // Suggestions
  const editorSelectionRef = useRef('');
  const [selectedText, setSelectedText] = useState('');
  const [instruction, setInstruction] = useState('');
  const [proposal, setProposal] = useState<string | null>(null);

  // Sketch state (transparent canvas over CSS .paper-grid + white bg)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sketchHistoryRef = useRef<ImageData[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawTool, setDrawTool] = useState<'pen' | 'eraser'>('pen');
  const [hasSketchContent, setHasSketchContent] = useState(false);
  const [canUndoSketch, setCanUndoSketch] = useState(false);
  const [sketchMode, setSketchMode] = useState<'enhance' | 'generate'>('enhance');
  const [sketchDescription, setSketchDescription] = useState('');
  const [interactionMode, setInteractionMode] = useState<'draw' | 'crop'>('draw');
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [cropDragStart, setCropDragStart] = useState<{ x: number; y: number } | null>(null);
  const [confirmedCropUrl, setConfirmedCropUrl] = useState<string | null>(null);
  const [vectorResult, setVectorResult] = useState<{ svg: string; tikz: string } | null>(null);

  useEffect(() => {
    const stored = getConversions();
    setConversions(stored);
    const settings = getSettings();
    setLatexStyle(settings.latexStyle);

    if (initialIdParam) {
      const found = stored.find((c) => c.id === initialIdParam);
      if (found) {
        setActiveDocId(found.id);
        setLatex(found.latex);
        setDocTitle(found.title);
      }
    } else if (stored.length > 0) {
      setActiveDocId(stored[0].id);
      setLatex(stored[0].latex);
      setDocTitle(stored[0].title);
    }
  }, [initialIdParam]);

  useEffect(() => {
    if (initialToolParam && TOOLS.some((t) => t.id === initialToolParam)) {
      setActiveTool(initialToolParam);
    }
  }, [initialToolParam]);

  const canvasHasContent = (ctx: CanvasRenderingContext2D, width: number, height: number): boolean => {
    const data = ctx.getImageData(0, 0, width, height).data;
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] > 10) return true;
    }
    return false;
  };

  const compositeWhitePng = (sx = 0, sy = 0, sw?: number, sh?: number): string | undefined => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const width = Math.max(1, Math.round(sw ?? canvas.width));
    const height = Math.max(1, Math.round(sh ?? canvas.height));
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d');
    if (!ctx) return undefined;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(canvas, sx, sy, sw ?? canvas.width, sh ?? canvas.height, 0, 0, width, height);
    return out.toDataURL('image/png');
  };

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    sketchHistoryRef.current = [];
    setHasSketchContent(false);
    setCanUndoSketch(false);
    setUploadedDataUrl(null);
    setCropRect(null);
    setConfirmedCropUrl(null);
    setDrawTool('pen');
    setInteractionMode('draw');
  }, []);

  const handleUndoSketch = () => {
    const canvas = canvasRef.current;
    if (!canvas || sketchHistoryRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const prev = sketchHistoryRef.current.pop();
    if (prev) ctx.putImageData(prev, 0, 0);
    setCanUndoSketch(sketchHistoryRef.current.length > 0);
    setHasSketchContent(canvasHasContent(ctx, canvas.width, canvas.height));
  };

  const handleSaveToLibrary = (asCopy: boolean) => {
    const existing = !asCopy && activeDocId ? conversions.find((c) => c.id === activeDocId) : undefined;
    const id = existing ? existing.id : `conv-tool-${Date.now()}`;
    const item: ConversionItem = {
      id,
      title: docTitle.trim() || 'Tools Workspace Document',
      fileName:
        existing?.fileName ||
        `${(docTitle || 'document').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.tex`,
      fileType: existing?.fileType || 'TOOLS',
      model: existing?.model || 'professional',
      pages: existing?.pages || 1,
      latex,
      createdAt: existing?.createdAt || new Date().toISOString(),
      folderId: existing?.folderId || 'general',
      previewImage: existing?.previewImage,
    };
    const next = saveConversion(item);
    setConversions(next);
    setActiveDocId(id);
    setSavedToast(asCopy ? 'copy' : 'save');
    setTimeout(() => setSavedToast(null), 2000);
  };

  const runAction = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    setErrorMsg(null);
    try {
      await fn();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : `${label} failed`);
    } finally {
      setBusy(false);
    }
  };

  const handleFormat = () =>
    runAction('Format', async () => {
      const res = await formatLatex({
        latex,
        lineSpacing,
        fontSize,
        margins,
        textAlign,
        pageNumbers,
      });
      setLatex(res.result);
      setStatusBanner({ text: 'Formatting applied to LaTeX document.', provider: res.provider });
    });

  const handleTranslate = () =>
    runAction('Translate', async () => {
      const res = await translateLatex({ latex, targetLanguage });
      setLatex(res.result);
      setStatusBanner({ text: `Translated document to ${targetLanguage}.`, provider: res.provider });
    });

  const handleTemplate = () =>
    runAction('Templates', async () => {
      const res = await applyTemplate({
        latex,
        template,
        lineSpacing,
        fontSize,
        margins,
        textAlign,
        pageNumbers,
      });
      setLatex(res.result);
      setStatusBanner({ text: `Applied ${template} template.`, provider: res.provider });
    });

  const handleConvert = () =>
    runAction('Convert', async () => {
      const res = await convertFormat({ latex, format: convertTarget });
      setConvertedPreview(res.result);
      downloadConvertedDocument(res.result, convertTarget, docTitle || 'opentex-export');
      setStatusBanner({ text: `Converted and downloaded .${convertTarget === 'markdown' ? 'md' : convertTarget === 'typst' ? 'typ' : convertTarget}.`, provider: res.provider });
    });

  const handleSuggest = () =>
    runAction('Suggestions', async () => {
      const res = await suggestEdit({
        latex,
        selectedText: selectedText.trim() || latex.slice(0, 400),
        instruction: instruction.trim() || 'Improve clarity and mathematical rigor',
      });
      setProposal(res.result);
      setStatusBanner({ text: 'Generated edit proposal. Review below.', provider: res.provider });
    });

  const acceptProposal = () => {
    if (!proposal) return;
    if (selectedText.trim() && latex.includes(selectedText.trim())) {
      setLatex(latex.replace(selectedText.trim(), proposal));
    } else {
      setLatex(proposal);
    }
    setProposal(null);
    setStatusBanner({ text: 'Proposal applied to document.' });
  };

  const captureSelectionFromEditor = () => {
    const sel = editorSelectionRef.current;
    if (sel.trim()) {
      setSelectedText(sel);
    } else {
      setErrorMsg('Highlight a passage in the LaTeX editor first, or paste a snippet below.');
    }
  };

  // Canvas & Crop handlers
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    canvas?.setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    if (interactionMode === 'crop') {
      setCropDragStart(pt);
      setCropRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
      return;
    }
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    sketchHistoryRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (sketchHistoryRef.current.length > 25) sketchHistoryRef.current.shift();
    setCanUndoSketch(true);
    setIsDrawing(true);
    ctx.save();
    ctx.globalCompositeOperation = drawTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = drawTool === 'eraser' ? 'rgba(0,0,0,1)' : '#0f172a';
    ctx.lineWidth = drawTool === 'eraser' ? 16 : 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x + 0.01, pt.y + 0.01);
    ctx.stroke();
    if (drawTool === 'pen') setHasSketchContent(true);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    if (interactionMode === 'crop' && cropDragStart) {
      setCropRect({
        x: Math.min(cropDragStart.x, pt.x),
        y: Math.min(cropDragStart.y, pt.y),
        w: Math.abs(pt.x - cropDragStart.x),
        h: Math.abs(pt.y - cropDragStart.y),
      });
      return;
    }
    if (!isDrawing || interactionMode !== 'draw') return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    if (drawTool === 'pen') setHasSketchContent(true);
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    canvasRef.current?.releasePointerCapture(e.pointerId);
    if (interactionMode === 'crop') {
      setCropDragStart(null);
      return;
    }
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.restore();
      setHasSketchContent(canvasHasContent(ctx, canvas.width, canvas.height));
    }
  };

  const handleSketchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setUploadedDataUrl(dataUrl);
      const img = new window.Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        sketchHistoryRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        if (sketchHistoryRef.current.length > 25) sketchHistoryRef.current.shift();
        setCanUndoSketch(true);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        setHasSketchContent(true);
        setInteractionMode('crop');
        setCropRect(null);
        setConfirmedCropUrl(null);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmCrop = () => {
    if (!cropRect || cropRect.w < 8 || cropRect.h < 8) {
      const fullUrl = compositeWhitePng();
      if (fullUrl) setConfirmedCropUrl(fullUrl);
      return;
    }
    const cropped = compositeWhitePng(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
    if (cropped) setConfirmedCropUrl(cropped);
  };

  const handleVectorize = () => {
    if (!hasSketchContent && !confirmedCropUrl && !sketchDescription.trim()) {
      setErrorMsg('Draw a diagram, upload/crop an image, or enter a description first.');
      return;
    }
    return runAction('Sketch', async () => {
      const cropUrl = confirmedCropUrl || compositeWhitePng();
      const res = await vectorizeSketch({
        cropDataUrl: cropUrl,
        mode: sketchMode,
        description: sketchDescription.trim() || undefined,
      });
      setVectorResult(res.result);
      setStatusBanner({ text: 'Sketch vectorized to SVG & TikZ.', provider: res.provider });
    });
  };

  const isBeamerDoc = /\\documentclass(?:\[[^\]]*\])?\{beamer\}/.test(latex);

  const includeSketchInDocument = () => {
    if (!vectorResult) return;
    const caption = sketchDescription.trim() || 'Vectorized sketch diagram';
    let nextLatex = latex;
    if (!/\\usepackage(?:\[[^\]]*\])?\{[^}]*\btikz\b[^}]*\}/.test(nextLatex)) {
      if (nextLatex.includes('\\begin{document}')) {
        nextLatex = nextLatex.replace('\\begin{document}', '\\usepackage{tikz}\n\\begin{document}');
      } else {
        nextLatex = `\\usepackage{tikz}\n${nextLatex}`;
      }
    }
    const block = isBeamerDoc
      ? `\n\\begin{frame}{${caption}}\n\\begin{center}\n${vectorResult.tikz}\n\\end{center}\n\\end{frame}\n`
      : `\n\\begin{figure}[h]\n\\centering\n${vectorResult.tikz}\n\\caption{${caption}}\n\\end{figure}\n`;

    if (nextLatex.includes('\\end{document}')) {
      nextLatex = nextLatex.replace('\\end{document}', `${block}\n\\end{document}`);
    } else {
      nextLatex = `${nextLatex}\n${block}`;
    }
    setLatex(nextLatex);
    setStatusBanner({ text: 'Inserted TikZ diagram & ensured \\usepackage{tikz} in preamble.' });
  };

  return (
    <div className="space-y-5">
      {/* Header & Tool Tabs */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-3xl font-normal tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
              LaTeX Tools
            </h1>
            <span className="rounded-md bg-[#0071E3]/10 px-2.5 py-0.5 text-xs font-medium text-[#0071E3]">
              100% Free · Publik AI
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Refine, translate, template, export, and vectorize sketches on your LaTeX documents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FolderOpen className="h-4 w-4 text-[#0071E3]" />
            Load from My Conversions
          </button>
          {activeDocId && conversions.some((c) => c.id === activeDocId) && (
            <button
              type="button"
              onClick={() => handleSaveToLibrary(false)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0071E3] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#0077ED]"
            >
              {savedToast === 'save' ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {savedToast === 'save' ? 'Saved' : 'Save'}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSaveToLibrary(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            {savedToast === 'copy' ? <Check className="h-4 w-4 text-emerald-400" /> : <Save className="h-4 w-4" />}
            {savedToast === 'copy' ? 'Copy Saved' : 'Save Copy'}
          </button>
        </div>
      </div>

      {/* 6 Tool Tabs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const active = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTool(tool.id)}
              className={`flex min-w-0 flex-col items-start rounded-xl border p-3 text-left transition ${
                active
                  ? 'border-[#0071E3] bg-[#0071E3]/10 text-slate-900 ring-1 ring-[#0071E3] dark:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex w-full min-w-0 items-center gap-2">
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#0071E3]' : 'text-slate-500'}`} />
                <span className="truncate text-sm font-semibold">{tool.label}</span>
              </div>
              <span className="mt-1 w-full text-xs leading-snug text-slate-500 dark:text-slate-400">
                {tool.description}
              </span>
            </button>
          );
        })}
      </div>

      {statusBanner && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{statusBanner.text}</span>
            {statusBanner.provider && (
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                {statusBanner.provider === 'publik' ? 'Publik AI' : 'Smart Local Fallback'}
              </span>
            )}
          </div>
          <button type="button" onClick={() => setStatusBanner(null)} className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Tool Controls (left) + Editor & Preview (right) */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Left Tool Controls */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 xl:col-span-4">
          {activeTool === 'format' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Format Document</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update geometry, typography, spacing, and page numbering in your preamble.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Line spacing</span>
                  <select
                    value={lineSpacing}
                    onChange={(e) => setLineSpacing(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option>Single</option>
                    <option>One and a half</option>
                    <option>Double</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Font size</span>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option>10pt</option>
                    <option>11pt</option>
                    <option>12pt</option>
                    <option>14pt</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Margins</span>
                  <select
                    value={margins}
                    onChange={(e) => setMargins(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 pr-6 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="Narrow 1.27cm">Narrow 1.27cm</option>
                    <option value="Moderate 1.91cm">Mod. 1.91cm</option>
                    <option value="Normal 2.54cm">Normal 2.54cm</option>
                    <option value="Wide 3.18cm">Wide 3.18cm</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Text alignment</span>
                  <select
                    value={textAlign}
                    onChange={(e) => setTextAlign(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option>Left</option>
                    <option>Center</option>
                    <option>Right</option>
                    <option>Justified</option>
                  </select>
                </label>
              </div>
              <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
                <span>Include page numbers</span>
                <input
                  type="checkbox"
                  checked={pageNumbers}
                  onChange={(e) => setPageNumbers(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#0071E3]"
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={handleFormat}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0071E3] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0077ED] disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sliders className="h-4 w-4" />}
                Apply Formatting
              </button>
            </div>
          )}

          {activeTool === 'translate' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Translate LaTeX</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Translates explanatory prose and headings while preserving every equation and macro.
                </p>
              </div>
              <label className="block space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>Target language</span>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={handleTranslate}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0071E3] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0077ED] disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                Translate to {targetLanguage}
              </button>
            </div>
          )}

          {activeTool === 'templates' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Apply Template</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Restructure your document into an academic, two-column, classic, or minimal style.
                </p>
              </div>
              {isBeamerDoc && (
                <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  Beamer slide deck detected. Use the <span className="font-semibold">Slides</span> workspace to customize Beamer themes cleanly instead of article templates.
                </div>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    { id: 'academic', label: 'Academic', sub: 'Theorem envs & abstract' },
                    { id: 'double-column', label: 'Two columns', sub: 'IEEE / conference grid' },
                    { id: 'classic', label: 'Classic', sub: 'Clean serif book style' },
                    { id: 'minimal', label: 'Minimal', sub: 'Lightweight notes' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTemplate(item.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      template === item.id
                        ? 'border-[#0071E3] bg-[#0071E3]/10 ring-1 ring-[#0071E3]'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.sub}</div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Line spacing</span>
                  <select
                    value={lineSpacing}
                    onChange={(e) => setLineSpacing(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option>Single</option>
                    <option>One and a half</option>
                    <option>Double</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Font size</span>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option>10pt</option>
                    <option>11pt</option>
                    <option>12pt</option>
                    <option>14pt</option>
                  </select>
                </label>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Uses your current Format margin ({margins}) and alignment ({textAlign}).
              </p>
              <button
                type="button"
                disabled={busy || isBeamerDoc}
                onClick={handleTemplate}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0071E3] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0077ED] disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutTemplate className="h-4 w-4" />}
                Apply Template
              </button>
            </div>
          )}

          {activeTool === 'convert' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Convert Format</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Convert your LaTeX source into Word, OpenDocument, Typst, or Markdown.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    { id: 'docx', label: 'Word .docx' },
                    { id: 'odt', label: 'OpenDocument .odt' },
                    { id: 'typst', label: 'Typst .typ' },
                    { id: 'markdown', label: 'Markdown .md' },
                  ] as const
                ).map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setConvertTarget(fmt.id)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                      convertTarget === fmt.id
                        ? 'border-[#0071E3] bg-[#0071E3]/10 text-slate-900 ring-1 ring-[#0071E3] dark:text-white'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={handleConvert}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0071E3] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0077ED] disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Convert & Download
              </button>
              {convertedPreview && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Converted Output Preview</span>
                    <button
                      type="button"
                      onClick={() =>
                        downloadConvertedDocument(
                          convertedPreview,
                          convertTarget,
                          docTitle || 'opentex-export'
                        )
                      }
                      className="text-[#0071E3] hover:underline"
                    >
                      Download again
                    </button>
                  </div>
                  <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-mono text-xs text-slate-700 dark:text-slate-300">
                    {convertedPreview}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTool === 'suggestions' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">AI Code Suggestions</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Highlight text in the editor on the right or paste a snippet below.
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Selected snippet</span>
                  <div className="flex items-center gap-2">
                    {selectedText && (
                      <button
                        type="button"
                        onClick={() => setSelectedText('')}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={captureSelectionFromEditor}
                      className="text-[#0071E3] hover:underline"
                    >
                      Use editor selection
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={selectedText}
                  onChange={(e) => setSelectedText(e.target.value)}
                  placeholder="Highlight text in the editor or paste a LaTeX block…"
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <label className="block space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>Desired edit</span>
                <input
                  type="text"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="e.g. Expand the proof steps and align equations"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={handleSuggest}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0071E3] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0077ED] disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Generate Proposal
              </button>

              {proposal && (
                <div className="space-y-3 rounded-xl border border-[#0071E3]/30 bg-[#0071E3]/5 p-3">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Proposed Change
                  </div>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2.5 font-mono text-xs text-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    {proposal}
                  </pre>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={acceptProposal}
                      className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      Accept and apply
                    </button>
                    <button
                      type="button"
                      onClick={() => setProposal(null)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTool === 'sketch' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Sketch to TikZ & SVG</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Draw or upload a diagram, optionally crop it, and vectorize into SVG & TikZ.
                </p>
              </div>

              {/* Canvas controls */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setInteractionMode('draw');
                    setDrawTool('pen');
                  }}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                    interactionMode === 'draw' && drawTool === 'pen'
                      ? 'bg-[#0071E3] text-white'
                      : 'border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  <PenTool className="h-3.5 w-3.5" />
                  Pen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInteractionMode('draw');
                    setDrawTool('eraser');
                  }}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                    interactionMode === 'draw' && drawTool === 'eraser'
                      ? 'bg-[#0071E3] text-white'
                      : 'border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Eraser
                </button>
                <button
                  type="button"
                  onClick={() => setInteractionMode('crop')}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                    interactionMode === 'crop'
                      ? 'bg-[#0071E3] text-white'
                      : 'border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Crop className="h-3.5 w-3.5" />
                  Crop
                </button>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                  <input type="file" accept="image/*" onChange={handleSketchUpload} className="sr-only" />
                </label>
                <button
                  type="button"
                  onClick={handleUndoSketch}
                  disabled={!canUndoSketch}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>

              {/* Interactive Canvas over CSS grid + Crop Box */}
              <div className="paper-grid relative overflow-hidden rounded-xl border border-slate-300 bg-white dark:border-slate-700">
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={220}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerCancel={handleCanvasPointerUp}
                  className={`block aspect-[360/220] w-full touch-none ${
                    interactionMode === 'crop' ? 'cursor-crosshair' : 'cursor-cell'
                  }`}
                />
                {cropRect && cropRect.w > 2 && cropRect.h > 2 && (
                  <div
                    className="pointer-events-none absolute border-2 border-dashed border-[#0071E3] bg-[#0071E3]/10"
                    style={{
                      left: `${(cropRect.x / 360) * 100}%`,
                      top: `${(cropRect.y / 220) * 100}%`,
                      width: `${(cropRect.w / 360) * 100}%`,
                      height: `${(cropRect.h / 220) * 100}%`,
                    }}
                  />
                )}
              </div>

              {(interactionMode === 'crop' || uploadedDataUrl) && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmCrop}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Confirm crop
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCropRect(null);
                      setConfirmedCropUrl(null);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset crop
                  </button>
                </div>
              )}

              {confirmedCropUrl && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <ImageIcon className="h-4 w-4 shrink-0" />
                  <span>Crop confirmed and ready for vectorization.</span>
                </div>
              )}

              {/* Mode & Description */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSketchMode('enhance')}
                  className={`rounded-lg border px-2.5 py-2 text-xs font-semibold ${
                    sketchMode === 'enhance'
                      ? 'border-[#0071E3] bg-[#0071E3]/10 text-[#0071E3]'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  Enhance crop
                </button>
                <button
                  type="button"
                  onClick={() => setSketchMode('generate')}
                  className={`rounded-lg border px-2.5 py-2 text-xs font-semibold ${
                    sketchMode === 'generate'
                      ? 'border-[#0071E3] bg-[#0071E3]/10 text-[#0071E3]'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  Generate content
                </button>
              </div>

              <input
                type="text"
                value={sketchDescription}
                onChange={(e) => setSketchDescription(e.target.value)}
                placeholder="Optional description (e.g. unit circle, function graph…)"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />

              <button
                type="button"
                disabled={busy}
                onClick={handleVectorize}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0071E3] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0077ED] disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Vectorize Sketch
              </button>

              {vectorResult && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Vector SVG Preview
                  </div>
                  <div
                    className="flex items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-3"
                    dangerouslySetInnerHTML={{ __html: vectorResult.svg }}
                  />
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Generated TikZ Code
                  </div>
                  <pre className="max-h-36 overflow-auto rounded-lg bg-slate-900 p-2.5 font-mono text-[11px] text-slate-100">
                    {vectorResult.tikz}
                  </pre>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => downloadFile(vectorResult.svg, 'opentex-sketch.svg', 'image/svg+xml')}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download SVG
                    </button>
                    <button
                      type="button"
                      onClick={includeSketchInDocument}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#0071E3] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0077ED]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Include in document
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Editor & Live Compiled Preview */}
        <LatexEditorPane
          latex={latex}
          onChange={setLatex}
          title={docTitle}
          latexStyle={latexStyle}
          hideSuggest
          onSelectionChange={(snippet) => {
            editorSelectionRef.current = snippet;
            if (snippet.trim()) {
              setSelectedText(snippet);
            }
          }}
          headerSlot={
            <div className="px-1">
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                aria-label="Document title"
                className="w-full max-w-md rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-slate-900 focus:border-slate-300 focus:bg-white focus:outline-none dark:text-white dark:focus:border-slate-700 dark:focus:bg-slate-900"
              />
            </div>
          }
          className="min-h-[600px] xl:col-span-8"
        />
      </div>

      <ConversionPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(item) => {
          setActiveDocId(item.id);
          setLatex(item.latex);
          setDocTitle(item.title);
          setStatusBanner({ text: `Loaded "${item.title}" into Tools.` });
        }}
      />
    </div>
  );
}

export default function ToolsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-sm text-slate-500">
          Loading OpenTEX Tools…
        </div>
      }
    >
      <ToolsWorkspaceInner />
    </Suspense>
  );
}
