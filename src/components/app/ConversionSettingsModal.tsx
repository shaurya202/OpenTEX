'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import {
  ConversionSettings,
  DEFAULT_CONVERSION_SETTINGS,
  LatexThemeStyle,
  NOTES_LANGUAGES,
  PRESET_SETTINGS,
  StylePreset,
} from '@/types/mathwrite';

interface ConversionSettingsModalProps {
  open: boolean;
  settings: ConversionSettings;
  onChange: (next: ConversionSettings) => void;
  onClose: () => void;
}

const PRESET_OPTIONS: Array<{
  id: Exclude<StylePreset, 'custom'>;
  label: string;
  description: string;
}> = [
  {
    id: 'faithful',
    label: 'Verbatim',
    description: 'Preserves exact wording, annotations, underlines, and original equation layout.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Clean sections, light spelling fixes, and automatic equation formatting.',
  },
  {
    id: 'professional',
    label: 'Publication',
    description: 'Publication-ready wording, table of contents, 1.5x spacing, readable math.',
  },
];

const LATEX_STYLES: Array<{ id: LatexThemeStyle; label: string; description: string }> = [
  { id: 'standard', label: 'Classic', description: 'Clean academic article typography' },
  { id: 'tagged', label: 'Tagged', description: 'Numbered & labeled theorem blocks' },
  { id: 'boxed', label: 'Boxed', description: 'Framed callouts for proofs & definitions' },
];

export default function ConversionSettingsModal({
  open,
  settings,
  onChange,
  onClose,
}: ConversionSettingsModalProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [draft, setDraft] = useState<ConversionSettings>(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const applyPreset = (preset: Exclude<StylePreset, 'custom'>) => {
    setDraft({
      ...draft,
      ...PRESET_SETTINGS[preset],
      preset,
    });
  };

  const updateField = <K extends keyof ConversionSettings>(
    key: K,
    value: ConversionSettings[K],
    marksCustom = true
  ) => {
    setDraft({
      ...draft,
      [key]: value,
      preset: marksCustom ? 'custom' : draft.preset,
    });
  };

  const handleSave = () => {
    onChange(draft);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conversion-settings-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#D2D2D7] bg-white text-[#1D1D1F] shadow-xl dark:border-[#2C2C2E] dark:bg-[#1C1C1E] dark:text-[#F5F5F7]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5EA] px-6 py-4 dark:border-[#2C2C2E]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0071E3]/10 text-[#0071E3]">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h2 id="conversion-settings-title" className="text-base font-semibold">
                Conversion Settings
              </h2>
              <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                Choose how Publik AI structures your LaTeX output
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] dark:text-[#A1A1A6] dark:hover:bg-[#2C2C2E] dark:hover:text-white"
            aria-label="Cancel and close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Document Style */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-sm font-semibold">Document Style</span>
              {draft.preset === 'custom' && (
                <span className="rounded-md bg-[#0071E3]/10 px-2.5 py-0.5 text-xs font-medium text-[#0071E3]">
                  Custom
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {PRESET_OPTIONS.map((opt) => {
                const selected = draft.preset === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => applyPreset(opt.id)}
                    className={`rounded-xl border p-3.5 text-left transition-all ${
                      selected
                        ? 'border-[#0071E3] bg-[#0071E3]/5 ring-1 ring-[#0071E3]'
                        : 'border-[#D2D2D7] hover:border-[#8E8E93] dark:border-[#2C2C2E] dark:hover:border-[#48484A]'
                    }`}
                  >
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <p className="mt-1 text-xs leading-relaxed text-[#6E6E73] dark:text-[#A1A1A6]">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LaTeX Style */}
          <div>
            <span className="mb-2.5 block text-sm font-semibold">LaTeX Style</span>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {LATEX_STYLES.map((style) => {
                const selected = draft.latexStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => updateField('latexStyle', style.id, false)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      selected
                        ? 'border-[#0071E3] bg-[#0071E3]/5 ring-1 ring-[#0071E3]'
                        : 'border-[#D2D2D7] hover:border-[#8E8E93] dark:border-[#2C2C2E] dark:hover:border-[#48484A]'
                    }`}
                  >
                    <div className="text-sm font-medium">{style.label}</div>
                    <p className="mt-0.5 text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                      {style.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expandable Advanced Settings */}
          <div className="rounded-xl border border-[#D2D2D7] dark:border-[#2C2C2E]">
            <button
              type="button"
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E]/60"
            >
              <span>Advanced settings (17 options)</span>
              {advancedOpen ? (
                <ChevronUp className="h-4 w-4 text-[#6E6E73]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#6E6E73]" />
              )}
            </button>

            {advancedOpen && (
              <div className="grid grid-cols-1 gap-4 border-t border-[#E5E5EA] p-4 text-xs sm:grid-cols-2 dark:border-[#2C2C2E]">
                {/* Checkboxes */}
                <label className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E5EA] px-3 py-2 dark:border-[#2C2C2E]">
                  <span className="font-medium">Generate Title</span>
                  <input
                    type="checkbox"
                    checked={draft.title}
                    onChange={(e) => updateField('title', e.target.checked)}
                    className="h-4 w-4 accent-[#0071E3]"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E5EA] px-3 py-2 dark:border-[#2C2C2E]">
                  <span className="font-medium">Table of Contents</span>
                  <input
                    type="checkbox"
                    checked={draft.toc}
                    onChange={(e) => updateField('toc', e.target.checked)}
                    className="h-4 w-4 accent-[#0071E3]"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E5EA] px-3 py-2 dark:border-[#2C2C2E]">
                  <span className="font-medium">Preserve Colors</span>
                  <input
                    type="checkbox"
                    checked={draft.colours}
                    onChange={(e) => updateField('colours', e.target.checked)}
                    className="h-4 w-4 accent-[#0071E3]"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E5EA] px-3 py-2 dark:border-[#2C2C2E]">
                  <span className="font-medium">Equation Numbering</span>
                  <input
                    type="checkbox"
                    checked={draft.numbering}
                    onChange={(e) => updateField('numbering', e.target.checked)}
                    className="h-4 w-4 accent-[#0071E3]"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E5EA] px-3 py-2 dark:border-[#2C2C2E]">
                  <span className="font-medium">Include Embedded Images</span>
                  <input
                    type="checkbox"
                    checked={draft.images}
                    onChange={(e) => updateField('images', e.target.checked)}
                    className="h-4 w-4 accent-[#0071E3]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                    Headings
                  </span>
                  <select
                    value={draft.headings}
                    onChange={(e) =>
                      updateField('headings', e.target.value as ConversionSettings['headings'])
                    }
                    className="w-full rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-2 dark:border-[#3A3A3C] dark:bg-[#2C2C2E]"
                  >
                    <option value="sections">LaTeX Sections</option>
                    <option value="emphasis">Bold / Emphasis</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                    Notes Language
                  </span>
                  <select
                    value={draft.language}
                    onChange={(e) => updateField('language', e.target.value, false)}
                    className="w-full rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-2 dark:border-[#3A3A3C] dark:bg-[#2C2C2E]"
                  >
                    {NOTES_LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                    Underlines
                  </span>
                  <select
                    value={draft.underlines}
                    onChange={(e) =>
                      updateField('underlines', e.target.value as ConversionSettings['underlines'])
                    }
                    className="w-full rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-2 dark:border-[#3A3A3C] dark:bg-[#2C2C2E]"
                  >
                    <option value="normalise">Normalize</option>
                    <option value="matchPaper">Match Paper</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                    Crossed-out Text
                  </span>
                  <select
                    value={draft.crossedOut}
                    onChange={(e) =>
                      updateField('crossedOut', e.target.value as ConversionSettings['crossedOut'])
                    }
                    className="w-full rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-2 dark:border-[#3A3A3C] dark:bg-[#2C2C2E]"
                  >
                    <option value="drop">Drop</option>
                    <option value="keep">Keep</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                    Margin Annotations
                  </span>
                  <select
                    value={draft.annotations}
                    onChange={(e) =>
                      updateField(
                        'annotations',
                        e.target.value as ConversionSettings['annotations']
                      )
                    }
                    className="w-full rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-2 dark:border-[#3A3A3C] dark:bg-[#2C2C2E]"
                  >
                    <option value="drop">Drop</option>
                    <option value="keep">Keep</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                    Page Margins
                  </span>
                  <select
                    value={draft.margin}
                    onChange={(e) =>
                      updateField('margin', e.target.value as ConversionSettings['margin'])
                    }
                    className="w-full rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-2 dark:border-[#3A3A3C] dark:bg-[#2C2C2E]"
                  >
                    <option value="veryNarrow">Very Narrow</option>
                    <option value="narrow">Narrow</option>
                    <option value="normal">Normal</option>
                    <option value="wide">Wide</option>
                    <option value="veryWide">Very Wide</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                    Line Spacing
                  </span>
                  <select
                    value={draft.lineSpacing}
                    onChange={(e) =>
                      updateField(
                        'lineSpacing',
                        e.target.value as ConversionSettings['lineSpacing']
                      )
                    }
                    className="w-full rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-2 dark:border-[#3A3A3C] dark:bg-[#2C2C2E]"
                  >
                    <option value="normal">Normal</option>
                    <option value="open">Open</option>
                    <option value="oneAndAHalf">1.5x</option>
                    <option value="double">Double</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                    Font Size
                  </span>
                  <select
                    value={draft.fontSize}
                    onChange={(e) =>
                      updateField('fontSize', e.target.value as ConversionSettings['fontSize'])
                    }
                    className="w-full rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-2 dark:border-[#3A3A3C] dark:bg-[#2C2C2E]"
                  >
                    <option value="verySmall">Very Small</option>
                    <option value="small">Small</option>
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                    <option value="veryLarge">Very Large</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                    Contextual Explanations
                  </span>
                  <select
                    value={draft.contextualText}
                    onChange={(e) =>
                      updateField(
                        'contextualText',
                        e.target.value as ConversionSettings['contextualText']
                      )
                    }
                    className="w-full rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-2 dark:border-[#3A3A3C] dark:bg-[#2C2C2E]"
                  >
                    <option value="none">None</option>
                    <option value="minimal">Minimal</option>
                    <option value="enhanced">Enhanced</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                    Text Style
                  </span>
                  <select
                    value={draft.textStyle}
                    onChange={(e) =>
                      updateField('textStyle', e.target.value as ConversionSettings['textStyle'])
                    }
                    className="w-full rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-2 dark:border-[#3A3A3C] dark:bg-[#2C2C2E]"
                  >
                    <option value="preserveWording">Preserve Wording</option>
                    <option value="correctSpelling">Correct Spelling</option>
                    <option value="rewriteProfessionally">Rewrite Professionally</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                    Equation Layout
                  </span>
                  <select
                    value={draft.equationLayout}
                    onChange={(e) =>
                      updateField(
                        'equationLayout',
                        e.target.value as ConversionSettings['equationLayout']
                      )
                    }
                    className="w-full rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-2 dark:border-[#3A3A3C] dark:bg-[#2C2C2E]"
                  >
                    <option value="automatic">Automatic</option>
                    <option value="preserveOriginal">Preserve Original</option>
                    <option value="compact">Compact</option>
                    <option value="readable">Readable</option>
                  </select>
                </label>

                <label className="space-y-1 sm:col-span-2">
                  <span className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                    Hand-drawn Diagrams
                  </span>
                  <select
                    value={draft.diagrams}
                    onChange={(e) =>
                      updateField('diagrams', e.target.value as ConversionSettings['diagrams'])
                    }
                    className="w-full rounded-lg border border-[#D2D2D7] bg-white px-2.5 py-2 dark:border-[#3A3A3C] dark:bg-[#2C2C2E]"
                  >
                    <option value="draw">Draw as TikZ / SVG</option>
                    <option value="placeholder">Placeholder Box</option>
                    <option value="omit">Omit</option>
                  </select>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E5E5EA] px-6 py-4 dark:border-[#2C2C2E]">
          <button
            type="button"
            onClick={() => setDraft({ ...DEFAULT_CONVERSION_SETTINGS })}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#6E6E73] hover:bg-[#F5F5F7] dark:text-[#A1A1A6] dark:hover:bg-[#2C2C2E]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#D2D2D7] px-4 py-2 text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] dark:border-[#3A3A3C] dark:text-[#F5F5F7] dark:hover:bg-[#2C2C2E]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-[#0071E3] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0077ED]"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
