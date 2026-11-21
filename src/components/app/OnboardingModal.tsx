'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cpu,
  FileText,
  Moon,
  PenLine,
  Settings,
  Sun,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import {
  getAppPreferences,
  getPublikConfig,
  saveAppPreferences,
} from '@/lib/storage';
import {
  ConversionModel,
  ConversionSettings,
  PRESET_SETTINGS,
  StylePreset,
} from '@/types/mathwrite';

interface OnboardingModalProps {
  open: boolean;
  settings: ConversionSettings;
  model: ConversionModel;
  onSettingsChange: (next: ConversionSettings) => void;
  onModelChange: (next: ConversionModel) => void;
  onComplete: (action: 'workspace' | 'sample' | 'sketch' | 'upload') => void;
}

const PRESET_OPTIONS: {
  id: Exclude<StylePreset, 'custom'>;
  title: string;
  desc: string;
}[] = [
  {
    id: 'faithful',
    title: 'Verbatim',
    desc: 'Preserves your exact wording, layout, and annotations.',
  },
  {
    id: 'balanced',
    title: 'Balanced',
    desc: 'Clean section headings, spelling fixes, and readable equations.',
  },
  {
    id: 'professional',
    title: 'Publication',
    desc: 'Polished academic prose, 1.5x line spacing, and table of contents.',
  },
];

export default function OnboardingModal({
  open,
  settings,
  model,
  onSettingsChange,
  onModelChange,
  onComplete,
}: OnboardingModalProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [connectionLabel, setConnectionLabel] = useState<string>('Checking connection…');
  const dialogRef = useRef<HTMLDivElement>(null);
  const sampleActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    const prefs = getAppPreferences();
    const resolved =
      prefs.theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : prefs.theme;
    setTheme(resolved);

    const cfg = getPublikConfig();
    if (cfg.apiKey.trim()) {
      setConnectionLabel('Custom API key configured');
      return;
    }

    fetch('/api/publik/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { hasAppToken?: boolean; gate?: { state?: string } }) => {
        if (data.gate?.state === 'ready' && data.hasAppToken) {
          setConnectionLabel('Connected to Publik AI');
        } else {
          setConnectionLabel('Local preview mode · Configure key in Settings anytime');
        }
      })
      .catch(() => {
        setConnectionLabel('Local preview mode · Configure key in Settings anytime');
      });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onComplete('workspace');
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onComplete]);

  useEffect(() => {
    if (open && step === 2) {
      sampleActionRef.current?.focus();
    }
  }, [open, step]);

  if (!open) return null;

  const handleThemeSelect = (nextTheme: 'light' | 'dark') => {
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.documentElement.style.colorScheme = nextTheme;
    const prefs = getAppPreferences();
    saveAppPreferences({ ...prefs, theme: nextTheme });
    window.dispatchEvent(new Event('mw-preferences-updated'));
  };

  const handlePresetSelect = (preset: Exclude<StylePreset, 'custom'>) => {
    onSettingsChange({
      ...settings,
      ...PRESET_SETTINGS[preset],
      preset,
    });
  };

  const handleModelSelect = (nextModel: ConversionModel) => {
    onModelChange(nextModel);
    const prefs = getAppPreferences();
    saveAppPreferences({ ...prefs, defaultModel: nextModel });
  };

  const stepTitles = [
    'Set your default output style',
    'Choose your conversion model',
    'Start your first conversion',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-[#D2D2D7] bg-white text-[#1D1D1F] shadow-xl dark:border-[#2C2C2E] dark:bg-[#1C1C1E] dark:text-[#F5F5F7]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5EA] px-6 py-4 dark:border-[#2C2C2E]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1D1D1F] font-serif text-sm font-semibold text-white dark:bg-[#F5F5F7] dark:text-[#1D1D1F]">
              &part;
            </span>
            <div>
              <p className="text-[11px] font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                Workspace setup · Step {step + 1} of 3
              </p>
              <h2 id="onboarding-title" className="text-sm font-semibold">
                {stepTitles[step]}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onComplete('workspace')}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-[#6E6E73] transition-colors hover:bg-[#F5F5F7] hover:text-[#1D1D1F] dark:text-[#A1A1A6] dark:hover:bg-[#2C2C2E] dark:hover:text-white"
            aria-label="Skip setup"
          >
            Skip
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6">
          {step === 0 && (
            <>
              <div>
                <p className="mb-2.5 text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                  Default LaTeX preset
                </p>
                <div className="space-y-2">
                  {PRESET_OPTIONS.map((opt) => {
                    const selected = settings.preset === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handlePresetSelect(opt.id)}
                        className={`flex w-full items-start justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors ${
                          selected
                            ? 'border-[#0071E3] bg-[#0071E3]/5'
                            : 'border-[#D2D2D7] hover:border-[#8E8E93] dark:border-[#2C2C2E] dark:hover:border-[#48484A]'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-medium">{opt.title}</div>
                          <div className="mt-0.5 text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                            {opt.desc}
                          </div>
                        </div>
                        {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0071E3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                  Appearance
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleThemeSelect('light')}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium transition-colors ${
                      theme === 'light'
                        ? 'border-[#0071E3] bg-[#0071E3]/5 text-[#0071E3]'
                        : 'border-[#D2D2D7] text-[#6E6E73] hover:text-[#1D1D1F] dark:border-[#2C2C2E] dark:text-[#A1A1A6]'
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeSelect('dark')}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium transition-colors ${
                      theme === 'dark'
                        ? 'border-[#0071E3] bg-[#0071E3]/10 text-[#4DA3FF]'
                        : 'border-[#D2D2D7] text-[#6E6E73] hover:text-[#1D1D1F] dark:border-[#2C2C2E] dark:text-[#A1A1A6]'
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    <span>Dark</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleModelSelect('professional')}
                  className={`flex w-full items-start justify-between gap-3 rounded-lg border p-3.5 text-left transition-colors ${
                    model === 'professional'
                      ? 'border-[#0071E3] bg-[#0071E3]/5'
                      : 'border-[#D2D2D7] hover:border-[#8E8E93] dark:border-[#2C2C2E] dark:hover:border-[#48484A]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-[#0071E3]" />
                    <div>
                      <div className="text-sm font-medium">Professional (publik-smart)</div>
                      <p className="mt-0.5 text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                        Recommended for handwritten derivations, dense proofs, and diagrams.
                      </p>
                    </div>
                  </div>
                  {model === 'professional' && (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0071E3]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleModelSelect('turbo')}
                  className={`flex w-full items-start justify-between gap-3 rounded-lg border p-3.5 text-left transition-colors ${
                    model === 'turbo'
                      ? 'border-[#0071E3] bg-[#0071E3]/5'
                      : 'border-[#D2D2D7] hover:border-[#8E8E93] dark:border-[#2C2C2E] dark:hover:border-[#48484A]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[#0071E3]" />
                    <div>
                      <div className="text-sm font-medium">Turbo (publik-fast)</div>
                      <p className="mt-0.5 text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                        Faster turnaround for clean printed textbook pages and typed PDFs.
                      </p>
                    </div>
                  </div>
                  {model === 'turbo' && (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0071E3]" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] px-3.5 py-2.5 text-xs dark:border-[#2C2C2E] dark:bg-[#161618]">
                <span className="text-[#6E6E73] dark:text-[#A1A1A6]">{connectionLabel}</span>
                <Link
                  href="/app/settings"
                  onClick={() => onComplete('workspace')}
                  className="inline-flex shrink-0 items-center gap-1 font-medium text-[#0071E3] hover:underline"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Settings</span>
                </Link>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-2.5">
              <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                Pick how you want to begin. Your preferences are saved locally and can be changed anytime.
              </p>

              <button
                ref={sampleActionRef}
                type="button"
                onClick={() => onComplete('sample')}
                className="flex w-full items-center justify-between rounded-lg border border-[#D2D2D7] px-4 py-3 text-left transition-colors hover:border-[#0071E3] hover:bg-[#0071E3]/5 dark:border-[#2C2C2E] dark:hover:border-[#0071E3]"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-[#0071E3]" />
                  <div>
                    <div className="text-sm font-medium">Try a sample handwritten note</div>
                    <div className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                      Loads &ldquo;Limits &amp; Epsilon-Delta Proof&rdquo; ready to convert
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#6E6E73]" />
              </button>

              <button
                type="button"
                onClick={() => onComplete('sketch')}
                className="flex w-full items-center justify-between rounded-lg border border-[#D2D2D7] px-4 py-3 text-left transition-colors hover:border-[#0071E3] hover:bg-[#0071E3]/5 dark:border-[#2C2C2E] dark:hover:border-[#0071E3]"
              >
                <div className="flex items-center gap-3">
                  <PenLine className="h-4 w-4 text-[#0071E3]" />
                  <div>
                    <div className="text-sm font-medium">Draw on the math sketchpad</div>
                    <div className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                      Sketch an equation or matrix directly on the canvas
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#6E6E73]" />
              </button>

              <button
                type="button"
                onClick={() => onComplete('upload')}
                className="flex w-full items-center justify-between rounded-lg border border-[#D2D2D7] px-4 py-3 text-left transition-colors hover:border-[#0071E3] hover:bg-[#0071E3]/5 dark:border-[#2C2C2E] dark:hover:border-[#0071E3]"
              >
                <div className="flex items-center gap-3">
                  <Upload className="h-4 w-4 text-[#0071E3]" />
                  <div>
                    <div className="text-sm font-medium">Upload an image or PDF</div>
                    <div className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                      PNG, JPG, WEBP, or multi-page PDF up to 50 MB
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#6E6E73]" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E5E5EA] bg-[#FAFAFC] px-6 py-3.5 dark:border-[#2C2C2E] dark:bg-[#161618]">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === step
                    ? 'w-5 bg-[#0071E3]'
                    : 'w-1.5 bg-[#D2D2D7] dark:bg-[#3A3A3C]'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#D2D2D7] bg-white px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] dark:border-[#3A3A3C] dark:bg-[#2C2C2E] dark:text-[#F5F5F7]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 0 | 1 | 2)}
                className="inline-flex items-center gap-1 rounded-lg bg-[#0071E3] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#0077ED]"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onComplete('workspace')}
                className="inline-flex items-center gap-1 rounded-lg bg-[#1D1D1F] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#3A3A3C] dark:bg-[#F5F5F7] dark:text-[#1D1D1F]"
              >
                <span>Enter Workspace</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
