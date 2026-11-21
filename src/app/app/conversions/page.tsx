'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Folder,
  FolderPlus,
  Pencil,
  Search,
  Share2,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import LatexEditorPane from '@/components/app/LatexEditorPane';
import {
  deleteConversion,
  getCommunities,
  getConversions,
  getFolders,
  getSettings,
  saveCommunities,
  saveConversion,
  saveConversions,
  saveFolders,
  SEED_COMMUNITIES,
  SEED_CONVERSIONS,
  SEED_FOLDERS,
} from '@/lib/storage';
import {
  Community,
  ConversionFolder,
  ConversionItem,
  DEFAULT_CONVERSION_SETTINGS,
  LatexThemeStyle,
} from '@/types/mathwrite';

type FileTypeFilter = 'ALL' | 'IMAGE' | 'PDF' | 'SLIDES' | 'TOOLS';
type DateFilter = 'all' | 'today' | 'week' | 'month';

export default function ConversionsPage() {
  const [conversions, setConversions] = useState<ConversionItem[]>(SEED_CONVERSIONS);
  const [folders, setFolders] = useState<ConversionFolder[]>(SEED_FOLDERS);
  const [communities, setCommunities] = useState<Community[]>(SEED_COMMUNITIES);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(SEED_CONVERSIONS[0].id);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const [latexStyle, setLatexStyle] = useState<LatexThemeStyle>(DEFAULT_CONVERSION_SETTINGS.latexStyle);

  // Folder CRUD UI
  const [newFolderName, setNewFolderName] = useState('');
  const [addingFolder, setAddingFolder] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteFolderId, setConfirmDeleteFolderId] = useState<string | null>(null);

  // Share to community modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const loadedConvs = getConversions();
    const loadedFolders = getFolders();
    const loadedComms = getCommunities();
    setConversions(loadedConvs);
    setFolders(loadedFolders);
    setCommunities(loadedComms);
    if (loadedConvs.length > 0) {
      setSelectedId(loadedConvs[0].id);
    } else {
      setSelectedId(null);
    }
    setLatexStyle(getSettings().latexStyle);
  }, []);

  const filteredConversions = useMemo(() => {
    const now = Date.now();
    return conversions.filter((item) => {
      if (selectedFolderId !== 'all' && item.folderId !== selectedFolderId) return false;
      if (typeFilter !== 'ALL' && item.fileType !== typeFilter) return false;
      if (dateFilter !== 'all') {
        const ageMs = now - new Date(item.createdAt).getTime();
        if (dateFilter === 'today' && ageMs > 86400_000) return false;
        if (dateFilter === 'week' && ageMs > 7 * 86400_000) return false;
        if (dateFilter === 'month' && ageMs > 30 * 86400_000) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !item.title.toLowerCase().includes(q) &&
          !item.fileName.toLowerCase().includes(q) &&
          !item.latex.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [conversions, selectedFolderId, typeFilter, dateFilter, search]);

  const selected = useMemo(
    () => conversions.find((c) => c.id === selectedId) || filteredConversions[0] || null,
    [conversions, selectedId, filteredConversions]
  );

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    const folder: ConversionFolder = {
      id: `folder-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
    };
    const next = [...folders, folder];
    setFolders(next);
    saveFolders(next);
    setNewFolderName('');
    setAddingFolder(false);
    setSelectedFolderId(folder.id);
  };

  const handleRenameFolder = (id: string) => {
    const name = renameValue.trim();
    if (!name) {
      setRenamingFolderId(null);
      return;
    }
    const next = folders.map((f) => (f.id === id ? { ...f, name } : f));
    setFolders(next);
    saveFolders(next);
    setRenamingFolderId(null);
  };

  const handleDeleteFolder = (id: string) => {
    if (id === 'general') return;
    const updatedConvs = conversions.map((c) =>
      c.folderId === id ? { ...c, folderId: 'general' } : c
    );
    const updatedFolders = folders.filter((f) => f.id !== id);
    setConversions(updatedConvs);
    setFolders(updatedFolders);
    saveConversions(updatedConvs);
    saveFolders(updatedFolders);
    setConfirmDeleteFolderId(null);
    if (selectedFolderId === id) setSelectedFolderId('all');
  };

  const updateSelectedField = (patch: Partial<ConversionItem>) => {
    if (!selected) return;
    const updated = { ...selected, ...patch };
    const next = saveConversion(updated);
    setConversions(next);
  };

  const handleDeleteConversion = (id: string) => {
    const next = deleteConversion(id);
    setConversions(next);
    setConfirmDeleteId(null);
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null);
    }
  };

  const handleShareToCommunity = (communityId: string) => {
    if (!selected) return;
    const targetComm = communities.find((c) => c.id === communityId);
    if (!targetComm || (!targetComm.isOwner && targetComm.mode !== 'open')) return;
    const next = communities.map((comm) => {
      if (comm.id !== communityId) return comm;
      if (comm.conversionIds.includes(selected.id)) return comm;
      return { ...comm, conversionIds: [selected.id, ...comm.conversionIds] };
    });
    setCommunities(next);
    saveCommunities(next);
    setShareSuccess(`Shared to ${targetComm.name}`);
    setTimeout(() => {
      setShareSuccess(null);
      setShareModalOpen(false);
    }, 1000);
  };

  const handleSelectDocument = (id: string) => {
    setSelectedId(id);
    setConfirmDeleteId(null);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const metaUnit =
    selected?.fileType === 'SLIDES'
      ? selected.pages === 1
        ? 'slide'
        : 'slides'
      : selected?.pages === 1
        ? 'page'
        : 'pages';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-normal tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
            My Conversions
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Organize, edit, preview, and export all your converted documents in one place.
          </p>
        </div>
        <Link
          href="/app"
          className="inline-flex items-center justify-center rounded-xl bg-[#0071E3] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0077ED]"
        >
          + New Conversion
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or content…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-[#0071E3] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs dark:border-slate-700 dark:bg-slate-950">
            {(['ALL', 'IMAGE', 'PDF', 'SLIDES', 'TOOLS'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`rounded-md px-2.5 py-1.5 font-medium transition ${
                  typeFilter === t
                    ? 'bg-slate-900 text-white dark:bg-[#0071E3]'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {t === 'ALL' ? 'All' : t}
              </button>
            ))}
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>
        </div>
      </div>

      {/* Main Layout: Folders + List + Detail */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Folders Sidebar */}
        <aside className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-4 lg:h-[calc(100vh-13rem)] lg:min-h-[580px] dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Folders</h2>
            <button
              type="button"
              onClick={() => setAddingFolder((v) => !v)}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-[#0071E3] hover:bg-[#0071E3]/10"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              New folder
            </button>
          </div>

          {addingFolder && (
            <form onSubmit={handleCreateFolder} className="mb-3 flex gap-1.5">
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name…"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="submit"
                className="rounded-lg bg-[#0071E3] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0077ED]"
              >
                Add
              </button>
            </form>
          )}

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedFolderId('all')}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition ${
                selectedFolderId === 'all'
                  ? 'bg-[#0071E3]/10 font-semibold text-[#0071E3]'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-[#0071E3]" />
                All
              </span>
              <span className="text-xs text-slate-500">{conversions.length}</span>
            </button>

            {folders.map((folder) => {
              const count = conversions.filter((c) => c.folderId === folder.id).length;
              const isSelected = selectedFolderId === folder.id;
              return (
                <div key={folder.id} className="space-y-1">
                  <div
                    className={`group flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
                      isSelected
                        ? 'bg-[#0071E3]/10 font-semibold text-[#0071E3]'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {renamingFolderId === folder.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleRenameFolder(folder.id);
                        }}
                        className="flex flex-1 items-center gap-1"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleRenameFolder(folder.id)}
                          className="min-w-0 flex-1 rounded border border-[#0071E3] bg-white px-1.5 py-0.5 text-xs dark:bg-slate-950 dark:text-white"
                        />
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedFolderId(folder.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <Folder className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    )}

                    <div className="flex shrink-0 items-center gap-1">
                      {folder.id !== 'general' && renamingFolderId !== folder.id && (
                        <div className="flex items-center gap-0.5 opacity-75 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            title="Rename folder"
                            aria-label={`Rename ${folder.name}`}
                            onClick={() => {
                              setRenamingFolderId(folder.id);
                              setRenameValue(folder.name);
                              setConfirmDeleteFolderId(null);
                            }}
                            className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete folder (items move to General)"
                            aria-label={`Delete ${folder.name}`}
                            onClick={() => setConfirmDeleteFolderId(folder.id)}
                            className="rounded p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <span className="min-w-[1.25rem] text-right text-xs text-slate-500">{count}</span>
                    </div>
                  </div>

                  {confirmDeleteFolderId === folder.id && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] dark:border-rose-900/60 dark:bg-rose-950/40">
                      <span className="text-rose-800 dark:text-rose-200">
                        Delete folder? Items move to General.
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteFolder(folder.id)}
                          className="rounded bg-rose-600 px-2 py-0.5 font-semibold text-white hover:bg-rose-500"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteFolderId(null)}
                          className="px-1.5 py-0.5 text-slate-600 hover:underline dark:text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Matching Conversions List */}
          <div className="mt-5 flex min-h-0 flex-1 flex-col border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Documents ({filteredConversions.length})
            </div>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {filteredConversions.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">
                  No matching conversions.
                </p>
              ) : (
                filteredConversions.map((item) => {
                  const active = selected?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectDocument(item.id)}
                      className={`w-full rounded-xl border p-2.5 text-left transition ${
                        active
                          ? 'border-[#0071E3] bg-[#0071E3]/10'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="line-clamp-1 text-sm font-medium text-slate-900 dark:text-white">
                          {item.title}
                        </div>
                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {item.fileType}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="truncate">{item.fileName}</span>
                        <span className="shrink-0 pl-2">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Detail Pane */}
        <section ref={detailRef} className="flex flex-col lg:col-span-8">
          {selected ? (
            <LatexEditorPane
              latex={selected.latex}
              onChange={(nextLatex) => updateSelectedField({ latex: nextLatex })}
              title={selected.title}
              latexStyle={latexStyle}
              sourcePreviewUrl={selected.previewImage}
              sourceFileName={selected.fileName}
              sourceMimeType={
                selected.fileType === 'PDF'
                  ? 'application/pdf'
                  : selected.previewImage
                    ? 'image/png'
                    : undefined
              }
              metaLabel={`${selected.model === 'professional' ? 'Professional' : 'Turbo'} · ${selected.pages} ${metaUnit}`}
              className="min-h-[580px] flex-1 lg:h-[calc(100vh-13rem)]"
              headerSlot={
                <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
                  <input
                    type="text"
                    value={selected.title}
                    onChange={(e) => updateSelectedField({ title: e.target.value })}
                    aria-label="Conversion title"
                    className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-slate-900 focus:border-slate-300 focus:bg-white focus:outline-none dark:text-white dark:focus:border-slate-700 dark:focus:bg-slate-900"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Folder:</label>
                    <select
                      value={selected.folderId}
                      onChange={(e) => updateSelectedField({ folderId: e.target.value })}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              }
              extraActions={
                <>
                  <Link
                    href={`/app/tools?id=${encodeURIComponent(selected.id)}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#0071E3]/30 bg-[#0071E3]/10 px-2.5 py-1.5 text-xs font-semibold text-[#0071E3] hover:bg-[#0071E3]/15"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    Open in Tools
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShareModalOpen(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </button>
                  {confirmDeleteId === selected.id ? (
                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-xs dark:border-rose-900 dark:bg-rose-950/50">
                      <span className="font-medium text-rose-800 dark:text-rose-200">Delete?</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteConversion(selected.id)}
                        className="rounded bg-rose-600 px-2 py-0.5 font-semibold text-white hover:bg-rose-500"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded px-1.5 py-0.5 text-slate-600 hover:underline dark:text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(selected.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  )}
                </>
              }
            />
          ) : (
            <div className="flex min-h-[540px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No conversion selected
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Convert a note or PDF in the workspace, or choose an existing item from the left.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Share to Community Modal */}
      {shareModalOpen && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShareModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Share to Community"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Share to Community
              </h3>
              <button
                type="button"
                aria-label="Close Share dialog"
                onClick={() => setShareModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Choose a community to share “{selected.title}”.
            </p>
            {shareSuccess && (
              <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                {shareSuccess}
              </div>
            )}
            <div className="mt-4 space-y-2">
              {communities.map((comm) => {
                const alreadyShared = comm.conversionIds.includes(selected.id);
                const canPost = comm.isOwner || comm.mode === 'open';
                return (
                  <button
                    key={comm.id}
                    type="button"
                    disabled={!canPost}
                    onClick={() => handleShareToCommunity(comm.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                      canPost
                        ? 'border-slate-200 hover:border-[#0071E3] hover:bg-[#0071E3]/5 dark:border-slate-800 dark:hover:bg-slate-800'
                        : 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-950/40'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{comm.name}</div>
                      <div className="text-xs text-slate-500">
                        {comm.memberCount} {comm.memberCount === 1 ? 'member' : 'members'} · {comm.mode === 'open' ? 'Open' : 'Read-only'}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#0071E3]">
                      {!canPost ? 'Owner only' : alreadyShared ? 'Shared' : 'Share'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
