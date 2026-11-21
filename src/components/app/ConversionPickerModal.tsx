'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileCode2, FileImage, FileText, Presentation, Search, Wrench, X } from 'lucide-react';
import { getConversions } from '@/lib/storage';
import { ConversionItem } from '@/types/mathwrite';

interface ConversionPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (conversion: ConversionItem) => void;
  title?: string;
}

const TYPE_ICON: Record<ConversionItem['fileType'], React.ComponentType<{ className?: string }>> = {
  IMAGE: FileImage,
  PDF: FileText,
  SLIDES: Presentation,
  TOOLS: Wrench,
};

export default function ConversionPickerModal({
  open,
  onClose,
  onSelect,
  title = 'Load from My Conversions',
}: ConversionPickerModalProps) {
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setItems(getConversions());
      setQuery('');
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.fileName.toLowerCase().includes(q) ||
        item.latex.toLowerCase().includes(q)
    );
  }, [items, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-[#D2D2D7] bg-white text-[#1D1D1F] shadow-xl dark:border-[#2C2C2E] dark:bg-[#1C1C1E] dark:text-[#F5F5F7]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close picker"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversions by title, filename, or LaTeX..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-950"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No matching conversions found.
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = TYPE_ICON[item.fileType] || FileText;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition-all hover:border-blue-500 hover:bg-blue-50/40 dark:border-slate-800 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{item.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="truncate">{item.fileName}</span>
                        <span>·</span>
                        <span>
                          {item.pages} {item.pages === 1 ? 'page' : 'pages'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-md bg-[#F5F5F7] px-2 py-0.5 text-[10px] font-semibold text-[#6E6E73] dark:bg-[#2C2C2E] dark:text-[#A1A1A6]">
                    {item.fileType}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
