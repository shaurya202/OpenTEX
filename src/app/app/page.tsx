'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Cpu,
  Eraser,
  FileImage,
  FileText,
  Folder,
  Loader2,
  Maximize2,
  Minimize2,
  PenLine,
  Presentation,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Undo2,
  Upload,
  Wrench,
  Zap,
} from 'lucide-react';
import ConversionSettingsModal from '@/components/app/ConversionSettingsModal';
import LatexEditorPane from '@/components/app/LatexEditorPane';
import OnboardingModal from '@/components/app/OnboardingModal';
import { convertToLatex } from '@/lib/publik';
import {
  getAppPreferences,
  getFolders,
  getSettings,
  saveAppPreferences,
  saveConversion,
  saveSettings,
} from '@/lib/storage';
import {
  ConversionFolder,
  ConversionItem,
  ConversionModel,
  ConversionSettings,
  DEFAULT_CONVERSION_SETTINGS,
  LATEX_STYLE_LABELS,
  PRESET_LABELS,
} from '@/types/mathwrite';

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB

interface SampleNote {
  id: string;
  label: string;
  title: string;
  fileName: string;
  model: ConversionModel;
  promptHint: string;
  lines: string[];
}

const SAMPLE_NOTES: SampleNote[] = [
  {
    id: 'limits',
    label: 'Limits & Epsilon-Delta Proof',
    title: 'Limits & Epsilon-Delta Proof',
    fileName: 'limits_epsilon_delta_notes.png',
    model: 'professional',
    promptHint:
      'Handwritten calculus lecture notes on Limits, Epsilon-Delta definition, and Squeeze Theorem.',
    lines: [
      'Limits & Continuity (Lecture 01)',
      'Def:  lim f(x) = L  as x → a   iff   ∀ ε > 0,',
      '∃ δ > 0  s.t.  0 < |x − a| < δ  ⇒  |f(x) − L| < ε',
      'Thm (Squeeze):  g(x) ≤ f(x) ≤ h(x) & lim g = lim h = L ⇒ lim f = L',
    ],
  },
  {
    id: 'eigen',
    label: 'Eigenvalues & Spectral Theorem',
    title: 'Eigenvalues & Spectral Theorem',
    fileName: 'spectral_theorem_notes.png',
    model: 'professional',
    promptHint:
      'Handwritten linear algebra notes covering Av = lambda v, characteristic polynomial det(A - lambda I) = 0, and Spectral Theorem A = Q Lambda Q^T.',
    lines: [
      'Linear Algebra — Eigenvalues & Spectral Thm',
      'A v = λ v,     v ≠ 0',
      'p(λ) = det(A − λ Iₙ) = 0',
      'If  A = Aᵀ ∈ ℝⁿˣⁿ,  then  A = Q Λ Qᵀ',
    ],
  },
  {
    id: 'stokes',
    label: "Stokes' Theorem Vector Calculus",
    title: "Stokes' Theorem Vector Calculus",
    fileName: 'stokes_theorem_notes.png',
    model: 'professional',
    promptHint:
      "Handwritten vector calculus notes on Stokes' Theorem: surface integral of curl F dot dS equals closed line integral F dot dr.",
    lines: [
      "Stokes' Theorem (Vector Calculus)",
      'Let S be an oriented smooth surface with boundary ∂S:',
      '∬ₛ (∇ × F) · dS  =  ∮ F · dr   (boundary ∂S)',
      "Special case (2D):  Green's Theorem in the plane",
    ],
  },
];

function drawSampleNote(sample: SampleNote): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Ruled notebook paper background
  ctx.fillStyle = '#fffef9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let y = 80; y < canvas.height; y += 44) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Margin red line
  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, 0);
  ctx.lineTo(96, canvas.height);
  ctx.stroke();

  // Handwritten-style ink lines with width clamping
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'italic 28px Georgia, "Times New Roman", serif';
  ctx.fillText(sample.lines[0] || sample.title, 122, 66, 800);

  ctx.fillStyle = '#0f172a';
  const bodyLines = sample.lines.slice(1);
  let highlightMetrics = { y: 224, width: 620 };
  bodyLines.forEach((line, idx) => {
    ctx.font = 'italic 25px Georgia, "Times New Roman", serif';
    const y = 146 + idx * 78;
    const measured = Math.min(790, Math.ceil(ctx.measureText(line).width));
    ctx.fillText(line, 122, y, 790);
    if (idx === 1) {
      highlightMetrics = { y, width: measured };
    }
  });

  // Dynamic highlight box around the main equation (line idx 1)
  ctx.strokeStyle = '#0071E3';
  ctx.lineWidth = 2;
  ctx.strokeRect(112, highlightMetrics.y - 34, Math.max(260, highlightMetrics.width + 24), 52);

  return canvas.toDataURL('image/png');
}

export default function ConvertWorkspacePage() {
  const [inputMode, setInputMode] = useState<'upload' | 'sketch'>('upload');
  const [stage, setStage] = useState<'input' | 'result'>('input');

  // Upload state
  const [dragActive, setDragActive] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [fileName, setFileName] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [fileSizeLabel, setFileSizeLabel] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | undefined>(undefined);
  const [promptHint, setPromptHint] = useState('');
  const hintFromSampleRef = useRef(false);

  // Sketchpad state (canvas holds transparent ink layer over CSS .paper-grid)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sketchContainerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const sketchHistoryRef = useRef<ImageData[]>([]);
  const [sketchTool, setSketchTool] = useState<'pen' | 'eraser'>('pen');
  const [inkColor, setInkColor] = useState<'#0f172a' | '#1d4ed8'>('#0f172a');
  const [hasSketchInk, setHasSketchInk] = useState(false);
  const [canUndoSketch, setCanUndoSketch] = useState(false);
  const [isSketchFullscreen, setIsSketchFullscreen] = useState(false);

  // Options state
  const [model, setModel] = useState<ConversionModel>('professional');
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_CONVERSION_SETTINGS);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [folders, setFolders] = useState<ConversionFolder[]>([]);
  const [folderId, setFolderId] = useState('general');

  // Conversion execution & result state
  const [converting, setConverting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultItem, setResultItem] = useState<ConversionItem | null>(null);
  const [providerBadge, setProviderBadge] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(getSettings());
    const prefs = getAppPreferences();
    if (prefs.defaultModel) setModel(prefs.defaultModel);
    if (!prefs.onboardingCompleted) setOnboardingOpen(true);
    const loadedFolders = getFolders();
    setFolders(loadedFolders);
    if (loadedFolders.length > 0 && !loadedFolders.some((f) => f.id === 'general')) {
      setFolderId(loadedFolders[0].id);
    }
  }, []);

  const canvasHasVisibleInk = (ctx: CanvasRenderingContext2D, width: number, height: number): boolean => {
    const data = ctx.getImageData(0, 0, width, height).data;
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] > 10) return true;
    }
    return false;
  };

  const initCanvasGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    sketchHistoryRef.current = [];
    setHasSketchInk(false);
    setCanUndoSketch(false);
  };

  const handleUndoSketch = () => {
    const canvas = canvasRef.current;
    if (!canvas || sketchHistoryRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const previous = sketchHistoryRef.current.pop();
    if (previous) {
      if (previous.width === canvas.width && previous.height === canvas.height) {
        ctx.putImageData(previous, 0, 0);
      } else {
        const temp = document.createElement('canvas');
        temp.width = previous.width;
        temp.height = previous.height;
        temp.getContext('2d')?.putImageData(previous, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scale =
          canvas.width >= previous.width && canvas.height >= previous.height
            ? 1
            : Math.min(canvas.width / previous.width, canvas.height / previous.height);
        ctx.drawImage(temp, 0, 0, previous.width * scale, previous.height * scale);
      }
    }
    setCanUndoSketch(sketchHistoryRef.current.length > 0);
    setHasSketchInk(canvasHasVisibleInk(ctx, canvas.width, canvas.height));
  };

  // Keep canvas resolution matched to its container (including full-screen) without losing ink
  useEffect(() => {
    if (inputMode !== 'sketch') return;
    const container = sketchContainerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const syncCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width === targetW && canvas.height === targetH) return;

      let snapshot: HTMLCanvasElement | null = null;
      if (canvas.width > 0 && canvas.height > 0) {
        snapshot = document.createElement('canvas');
        snapshot.width = canvas.width;
        snapshot.height = canvas.height;
        snapshot.getContext('2d')?.drawImage(canvas, 0, 0);
      }

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx && snapshot) {
        const scale =
          targetW >= snapshot.width && targetH >= snapshot.height
            ? 1
            : Math.min(targetW / snapshot.width, targetH / snapshot.height);
        ctx.drawImage(snapshot, 0, 0, snapshot.width * scale, snapshot.height * scale);
      }
    };

    syncCanvasSize();
    const observer = new ResizeObserver(syncCanvasSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [inputMode, isSketchFullscreen]);

  useEffect(() => {
    if (!isSketchFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSketchFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isSketchFullscreen]);

  const exportSketchWhitePng = (): string | undefined => {
    const src = canvasRef.current;
    if (!src) return undefined;
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    const ctx = out.getContext('2d');
    if (!ctx) return src.toDataURL('image/png');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 0, 0);
    return out.toDataURL('image/png');
  };

  const handleSettingsChange = (next: ConversionSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const handleOnboardingComplete = (action: 'workspace' | 'sample' | 'sketch' | 'upload') => {
    const prefs = getAppPreferences();
    saveAppPreferences({ ...prefs, onboardingCompleted: true });
    setOnboardingOpen(false);
    if (action === 'sample') {
      handleSelectSample(SAMPLE_NOTES[0]);
    } else if (action === 'sketch') {
      setInputMode('sketch');
    } else if (action === 'upload') {
      setInputMode('upload');
      setTimeout(() => fileInputRef.current?.click(), 50);
    }
  };

  const processSelectedFile = (file: File) => {
    setErrorMsg(null);
    if (file.size > MAX_FILE_BYTES) {
      setErrorMsg('File exceeds the 50 MB limit. Please upload a smaller image or PDF.');
      return;
    }
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'];
    const isValidExt = /\.(png|jpe?g|gif|webp|pdf)$/i.test(file.name);
    if (!validTypes.includes(file.type) && !isValidExt) {
      setErrorMsg('Unsupported file type. Please upload PNG, JPG, GIF, WEBP, or PDF.');
      return;
    }

    const sizeMb = file.size / (1024 * 1024);
    setFileSizeLabel(sizeMb >= 1 ? `${sizeMb.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`);
    setFileName(file.name);
    setMimeType(file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png'));
    if (hintFromSampleRef.current) {
      setPromptHint('');
      hintFromSampleRef.current = false;
    }
    setPreviewDataUrl(undefined);
    setReadingFile(true);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewDataUrl(reader.result);
      }
      setReadingFile(false);
    };
    reader.onerror = () => {
      setErrorMsg('Could not read the selected file. Please try again.');
      setReadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sample: SampleNote) => {
    setErrorMsg(null);
    setReadingFile(false);
    setInputMode('upload');
    const dataUrl = drawSampleNote(sample);
    setFileName(sample.fileName);
    setMimeType('image/png');
    setFileSizeLabel('Sample note');
    setPreviewDataUrl(dataUrl);
    setPromptHint(sample.promptHint);
    hintFromSampleRef.current = true;
    setModel(sample.model);
  };

  const clearUpload = () => {
    setReadingFile(false);
    setFileName('');
    setMimeType('');
    setFileSizeLabel('');
    setPreviewDataUrl(undefined);
    if (hintFromSampleRef.current) {
      setPromptHint('');
      hintFromSampleRef.current = false;
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Canvas pointer handlers
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    sketchHistoryRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (sketchHistoryRef.current.length > 25) {
      sketchHistoryRef.current.shift();
    }
    setCanUndoSketch(true);

    canvas.setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    isDrawingRef.current = true;
    ctx.save();
    ctx.globalCompositeOperation = sketchTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.strokeStyle = sketchTool === 'eraser' ? 'rgba(0,0,0,1)' : inkColor;
    ctx.lineWidth = (sketchTool === 'eraser' ? 20 : 2.8) * dpr;
    ctx.lineTo(pt.x + 0.01, pt.y + 0.01);
    ctx.stroke();
    if (sketchTool === 'pen') setHasSketchInk(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const pt = getCanvasPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    if (sketchTool === 'pen') setHasSketchInk(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.restore();
      if (sketchTool === 'eraser') {
        setHasSketchInk(canvasHasVisibleInk(ctx, canvas.width, canvas.height));
      }
    }
    canvas?.releasePointerCapture(e.pointerId);
  };

  const canGenerate =
    !readingFile && (inputMode === 'upload' ? Boolean(fileName && previewDataUrl) : hasSketchInk);

  const handleSwitchInputMode = (nextMode: 'upload' | 'sketch') => {
    setInputMode(nextMode);
    if (hintFromSampleRef.current) {
      setPromptHint('');
      hintFromSampleRef.current = false;
    }
  };

  const handleStartNewConversion = () => {
    setStage('input');
    setErrorMsg(null);
    setResultItem(null);
    setProviderBadge('');
    setPromptHint('');
    hintFromSampleRef.current = false;
    clearUpload();
    initCanvasGrid();
  };

  const handleGenerate = async () => {
    setErrorMsg(null);
    if (readingFile) {
      setErrorMsg('Still loading your file. Please wait a moment.');
      return;
    }
    let activeDataUrl = previewDataUrl;
    let activeFileName = fileName;
    let activeMime = mimeType;
    let activeHint = promptHint;

    if (inputMode === 'sketch') {
      if (!canvasRef.current || !hasSketchInk) {
        setErrorMsg('Draw an equation or diagram on the sketchpad first.');
        return;
      }
      activeDataUrl = exportSketchWhitePng();
      activeFileName = `sketch_${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}.png`;
      activeMime = 'image/png';
      activeHint = activeHint || 'Hand-drawn mathematical equation sketch from OpenTEX sketchpad.';
      setIsSketchFullscreen(false);
    } else if (!activeFileName || !activeDataUrl) {
      setErrorMsg('Please upload an image/PDF or choose one of the sample handwritten notes.');
      return;
    }

    setConverting(true);
    try {
      const response = await convertToLatex({
        fileDataUrl: activeDataUrl,
        fileName: activeFileName,
        mimeType: activeMime || 'image/png',
        model,
        settings,
        promptHint: activeHint || undefined,
      });

      const baseTitle = activeFileName
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (ch) => ch.toUpperCase());

      const newItem: ConversionItem = {
        id: `conv-${Date.now()}`,
        title: baseTitle || 'Converted Math Notes',
        fileName: activeFileName,
        fileType: activeMime.includes('pdf') ? 'PDF' : 'IMAGE',
        model,
        pages: 1,
        latex: response.result,
        createdAt: new Date().toISOString(),
        folderId,
        previewImage: activeMime.includes('pdf') ? undefined : activeDataUrl,
      };

      if (getAppPreferences().saveHistory) {
        saveConversion(newItem);
      }

      setProviderBadge(
        response.provider === 'publik'
          ? `Publik AI · ${response.model}`
          : `Local Preview · ${response.model}`
      );
      setResultItem(newItem);
      setStage('result');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Conversion failed. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  const handleUpdateResultLatex = (nextLatex: string) => {
    if (!resultItem) return;
    const updated = { ...resultItem, latex: nextLatex };
    setResultItem(updated);
    if (getAppPreferences().saveHistory) {
      saveConversion(updated);
    }
  };

  const handleUpdateResultTitle = (nextTitle: string) => {
    if (!resultItem) return;
    const updated = { ...resultItem, title: nextTitle };
    setResultItem(updated);
    if (getAppPreferences().saveHistory) {
      saveConversion(updated);
    }
  };

  if (stage === 'result' && resultItem) {
    return (
      <div className="mx-auto flex h-full max-w-7xl flex-col gap-4">
        {/* Result Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={resultItem.title}
                onChange={(e) => handleUpdateResultTitle(e.target.value)}
                aria-label="Document title"
                className="w-full max-w-md truncate rounded-md bg-transparent px-1 text-base font-semibold outline-none focus:bg-slate-100 dark:focus:bg-slate-800"
              />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="truncate">{resultItem.fileName}</span>
                <span>· {resultItem.model === 'professional' ? 'Professional' : 'Turbo'} model</span>
                {providerBadge && (
                  <span className="rounded-md bg-[#0071E3]/10 px-2 py-0.5 text-[10px] font-medium text-[#0071E3]">
                    {providerBadge}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/tools?id=${encodeURIComponent(resultItem.id)}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Wrench className="h-3.5 w-3.5" />
              Open in Tools
            </Link>
            <Link
              href={`/app/slides?id=${encodeURIComponent(resultItem.id)}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Presentation className="h-3.5 w-3.5" />
              Make Slides
            </Link>
            <button
              type="button"
              onClick={handleStartNewConversion}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0071E3] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0077ED]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Convert new file
            </button>
          </div>
        </div>

        <LatexEditorPane
          latex={resultItem.latex}
          onChange={handleUpdateResultLatex}
          title={resultItem.title}
          latexStyle={settings.latexStyle}
          sourcePreviewUrl={resultItem.previewImage}
          sourceFileName={resultItem.fileName}
          sourceMimeType={mimeType}
          className="min-h-[580px] flex-1"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page Heading */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-normal tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] sm:text-4xl">
            Convert Notes to LaTeX
          </h1>
          <p className="mt-1 text-sm text-[#6E6E73] dark:text-[#A1A1A6]">
            Upload handwritten notes, textbook pages, or PDFs, or sketch an equation directly.
          </p>
        </div>
      </div>

      {/* Live Transcription State */}
      {converting ? (
        <div className="rounded-xl border border-[#D2D2D7] bg-white p-10 text-center text-[#1D1D1F] shadow-xs dark:border-[#2C2C2E] dark:bg-[#1C1C1E] dark:text-[#F5F5F7]">
          <div className="mx-auto max-w-md space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#0071E3]/10 text-[#0071E3]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold">Transcribing your document…</h2>
            <p className="text-sm text-[#6E6E73] dark:text-[#A1A1A6]">
              Analyzing equations and structure with {model === 'professional' ? 'publik-smart' : 'publik-fast'} ({PRESET_LABELS[settings.preset]} preset).
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Upload / Sketchpad */}
          <div className="space-y-4 lg:col-span-7">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
              {/* Mode Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 dark:border-slate-800 dark:bg-slate-950/60">
                <button
                  type="button"
                  onClick={() => handleSwitchInputMode('upload')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all sm:text-sm ${
                    inputMode === 'upload'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Image or PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchInputMode('sketch')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all sm:text-sm ${
                    inputMode === 'sketch'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  <PenLine className="h-4 w-4" />
                  <span>Draw Math Sketchpad</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,.png,.jpg,.jpeg,.gif,.webp,.pdf"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) processSelectedFile(selected);
                }}
                className="hidden"
              />

              <div className={inputMode === 'upload' ? 'p-5' : 'hidden'}>
                {previewDataUrl || fileName ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0071E3]/10 text-[#0071E3]">
                          {mimeType.includes('pdf') ? (
                            <FileText className="h-5 w-5" />
                          ) : (
                            <FileImage className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{fileName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {fileSizeLabel} · {readingFile ? 'Loading file…' : 'Ready to convert'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearUpload}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-red-600 dark:hover:bg-slate-800"
                        title="Remove file"
                        aria-label="Remove file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {previewDataUrl && !mimeType.includes('pdf') && (
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-2 dark:border-slate-800 dark:bg-slate-950">
                        <img
                          src={previewDataUrl}
                          alt={fileName}
                          className="mx-auto max-h-64 rounded-lg object-contain"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      const dropped = e.dataTransfer.files?.[0];
                      if (dropped) processSelectedFile(dropped);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    aria-label="Upload image or PDF file"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all ${
                      dragActive
                        ? 'border-[#0071E3] bg-[#0071E3]/10'
                        : 'border-slate-300 hover:border-[#0071E3] hover:bg-slate-50/70 dark:border-slate-700 dark:hover:border-[#0071E3] dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0071E3]/10 text-[#0071E3]">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold">Drag your image or PDF here</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      or click to browse · PNG, JPG, GIF, WEBP, PDF up to 50MB
                    </p>
                  </div>
                )}

                {/* Sample Handwritten Notes */}
                <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <div className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Try Sample Handwritten Notes
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SAMPLE_NOTES.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => handleSelectSample(sample)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                          fileName === sample.fileName
                            ? 'border-[#0071E3] bg-[#0071E3]/10 text-[#0071E3]'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#0071E3] hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Draw Math Sketchpad (kept mounted to preserve ink across mode switches) */}
              <div
                className={
                  inputMode !== 'sketch'
                    ? 'hidden'
                    : isSketchFullscreen
                      ? 'fixed inset-0 z-50 flex flex-col gap-3 bg-white p-3 sm:p-4 dark:bg-slate-950'
                      : 'space-y-3 p-4'
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isSketchFullscreen && (
                      <span className="mr-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Math Sketchpad
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSketchTool('pen')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                        sketchTool === 'pen'
                          ? 'bg-[#0071E3] text-white'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <PenLine className="h-3.5 w-3.5" />
                      Pen
                    </button>
                    <button
                      type="button"
                      onClick={() => setSketchTool('eraser')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                        sketchTool === 'eraser'
                          ? 'bg-[#0071E3] text-white'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <Eraser className="h-3.5 w-3.5" />
                      Eraser
                    </button>

                    <div className="ml-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setInkColor('#0f172a');
                          setSketchTool('pen');
                        }}
                        title="Black ink"
                        aria-label="Black ink"
                        aria-pressed={inkColor === '#0f172a' && sketchTool === 'pen'}
                        className={`h-8 w-8 rounded-lg bg-slate-900 ring-offset-2 ${
                          inkColor === '#0f172a' && sketchTool === 'pen'
                            ? 'ring-2 ring-[#0071E3]'
                            : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setInkColor('#1d4ed8');
                          setSketchTool('pen');
                        }}
                        title="Blue ink"
                        aria-label="Blue ink"
                        aria-pressed={inkColor === '#1d4ed8' && sketchTool === 'pen'}
                        className={`h-8 w-8 rounded-lg bg-blue-700 ring-offset-2 ${
                          inkColor === '#1d4ed8' && sketchTool === 'pen'
                            ? 'ring-2 ring-[#0071E3]'
                            : ''
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleUndoSketch}
                      disabled={!canUndoSketch}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={initCanvasGrid}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSketchFullscreen((v) => !v)}
                      aria-label={isSketchFullscreen ? 'Exit full screen' : 'Full screen sketchpad'}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {isSketchFullscreen ? (
                        <>
                          <Minimize2 className="h-3.5 w-3.5" />
                          Exit Full Screen
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-3.5 w-3.5" />
                          Full Screen
                        </>
                      )}
                    </button>
                    {isSketchFullscreen && (
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={!canGenerate}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0071E3] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0077ED] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Cpu className="h-3.5 w-3.5" />
                        Generate LaTeX
                      </button>
                    )}
                  </div>
                </div>

                <div
                  ref={sketchContainerRef}
                  className={`paper-grid overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 ${
                    isSketchFullscreen ? 'min-h-0 flex-1' : 'aspect-[760/340] w-full'
                  }`}
                >
                  <canvas
                    ref={canvasRef}
                    width={760}
                    height={340}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className="block h-full w-full touch-none cursor-crosshair"
                  />
                </div>
                {!isSketchFullscreen && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Hand-draw any equation, matrix, or diagram above and click Generate LaTeX.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Model, Style & Folder Configuration */}
          <div className="space-y-4 lg:col-span-5">
            <div className="space-y-5 rounded-xl border border-[#D2D2D7]/80 bg-white p-5 text-[#1D1D1F] shadow-xs dark:border-[#2C2C2E] dark:bg-[#1C1C1E] dark:text-[#F5F5F7]">
              {/* Model Selector */}
              <div>
                <label className="mb-2.5 block text-sm font-semibold">AI Model</label>
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setModel('professional')}
                    className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                      model === 'professional'
                        ? 'border-[#0071E3] bg-[#0071E3]/5 ring-1 ring-[#0071E3]'
                        : 'border-[#D2D2D7]/80 hover:border-[#86868B] dark:border-[#2C2C2E] dark:hover:border-[#48484A]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        <Cpu className="h-4 w-4 text-[#0071E3]" />
                        <span>Professional</span>
                        <span className="rounded-md bg-[#0071E3]/10 px-2 py-0.5 text-[10px] font-medium text-[#0071E3]">
                          Recommended
                        </span>
                      </div>
                      <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                        publik-smart
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                      Best for handwritten math, complex proofs, and hand-drawn sketches.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModel('turbo')}
                    className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                      model === 'turbo'
                        ? 'border-[#0071E3] bg-[#0071E3]/5 ring-1 ring-[#0071E3]'
                        : 'border-[#D2D2D7]/80 hover:border-[#86868B] dark:border-[#2C2C2E] dark:hover:border-[#48484A]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Zap className="h-4 w-4 text-[#0071E3]" />
                        <span>Turbo</span>
                      </div>
                      <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                        publik-fast
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                      Ultra-fast conversion for clean typeset PDFs and printed textbook pages.
                    </p>
                  </button>
                </div>
              </div>

              {/* Document Style Summary */}
              <div className="rounded-xl border border-[#D2D2D7]/80 bg-[#F5F5F7] p-3.5 dark:border-[#2C2C2E] dark:bg-[#161618]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                      Document Style
                    </div>
                    <div className="mt-0.5 text-sm font-semibold">
                      {PRESET_LABELS[settings.preset]} · {LATEX_STYLE_LABELS[settings.latexStyle]} LaTeX
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#D2D2D7] bg-white px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] dark:border-[#3A3A3C] dark:bg-[#2C2C2E] dark:text-[#F5F5F7] dark:hover:bg-[#3A3A3C]"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Customize
                  </button>
                </div>
              </div>

              {/* Folder Selector */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#6E6E73] dark:text-[#A1A1A6]">
                  <Folder className="h-3.5 w-3.5" />
                  <span>Save to folder</span>
                </label>
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="w-full rounded-xl border border-[#D2D2D7] bg-white px-3 py-2 text-sm text-[#1D1D1F] outline-none focus:border-[#0071E3] dark:border-[#3A3A3C] dark:bg-[#2C2C2E] dark:text-[#F5F5F7]"
                >
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Hint */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#6E6E73] dark:text-[#A1A1A6]">
                  Context hint (optional)
                </label>
                <textarea
                  rows={2}
                  value={promptHint}
                  onChange={(e) => {
                    setPromptHint(e.target.value);
                    hintFromSampleRef.current = false;
                  }}
                  placeholder="e.g. Real analysis homework on metric spaces"
                  className="w-full resize-none rounded-xl border border-[#D2D2D7] bg-white px-3 py-2 text-sm text-[#1D1D1F] outline-none focus:border-[#0071E3] dark:border-[#3A3A3C] dark:bg-[#2C2C2E] dark:text-[#F5F5F7]"
                />
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0071E3] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Cpu className="h-4 w-4" />
                <span>Generate LaTeX</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ConversionSettingsModal
        open={settingsModalOpen}
        settings={settings}
        onChange={handleSettingsChange}
        onClose={() => setSettingsModalOpen(false)}
      />

      <OnboardingModal
        open={onboardingOpen}
        settings={settings}
        model={model}
        onSettingsChange={handleSettingsChange}
        onModelChange={setModel}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}
