import {
  ApiKeyItem,
  AppPreferences,
  Community,
  ConversionFolder,
  ConversionItem,
  ConversionSettings,
  DEFAULT_CONVERSION_SETTINGS,
  FeedbackRequest,
  PublikConfig,
} from '@/types/mathwrite';

const KEYS = {
  CONVERSIONS: 'mw_conversions_v1',
  FOLDERS: 'mw_folders_v1',
  SETTINGS: 'mw_conversion_settings_v1',
  COMMUNITIES: 'mw_communities_v1',
  API_KEYS: 'mw_api_keys_v1',
  PUBLIK_CONFIG: 'mw_publik_config_v1',
  PREFERENCES: 'mw_app_preferences_v1',
  FEEDBACK: 'mw_feedback_v1',
};

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const daysAgo = (d: number) => new Date(now - d * 86400_000).toISOString();

export const SEED_FOLDERS: ConversionFolder[] = [
  { id: 'general', name: 'General', createdAt: daysAgo(14) },
  { id: 'calculus-1', name: 'Calculus I', createdAt: daysAgo(10) },
  { id: 'linear-algebra', name: 'Linear Algebra', createdAt: daysAgo(7) },
];

export const SEED_CONVERSIONS: ConversionItem[] = [
  {
    id: 'conv-limits',
    title: 'Limits & Continuity Notes',
    fileName: 'limits_lecture_01.jpg',
    fileType: 'IMAGE',
    model: 'professional',
    pages: 1,
    folderId: 'calculus-1',
    createdAt: hoursAgo(3),
    latex: `\\documentclass{article}
\\usepackage{amsmath, amssymb, amsthm}

\\title{Limits and Continuity}
\\author{OpenTEX Notes}
\\date{}

\\begin{document}
\\maketitle

\\section*{Limits. Definitions}

\\textbf{Precise Definition:} We say $\\displaystyle\\lim_{x\\to a} f(x) = L$ if for every $\\varepsilon > 0$ there is a $\\delta > 0$ such that whenever $0 < |x-a| < \\delta$ then $|f(x) - L| < \\varepsilon$.

\\subsection*{Relationship between the limit and one-sided limits}

\\begin{equation}
\\lim_{x\\to a} f(x) = L \\;\\Longleftrightarrow\\; \\lim_{x\\to a^+} f(x) = \\lim_{x\\to a^-} f(x) = L
\\end{equation}

\\begin{theorem}[Squeeze Theorem]
Suppose $g(x) \\leq f(x) \\leq h(x)$ for all $x$ in an open interval containing $a$ (except possibly at $a$). If
\\[
\\lim_{x\\to a} g(x) = \\lim_{x\\to a} h(x) = L,
\\]
then $\\displaystyle\\lim_{x\\to a} f(x) = L$.
\\end{theorem}

\\end{document}`,
  },
  {
    id: 'conv-ftc',
    title: 'Fundamental Theorem of Calculus',
    fileName: 'ftc_handwritten_proof.pdf',
    fileType: 'PDF',
    model: 'professional',
    pages: 3,
    folderId: 'calculus-1',
    createdAt: daysAgo(1),
    latex: `\\documentclass{article}
\\usepackage{amsmath, amssymb, amsthm}

\\section{The Fundamental Theorem of Calculus}

The fundamental theorem of calculus establishes the relationship between differentiation and integration.

\\subsection{Statement}
If $f$ is continuous on $[a, b]$ and $F$ is defined by:
\\begin{equation}
  F(x) = \\int_{a}^{x} f(t) \\, dt, \\quad a \\leq x \\leq b
\\end{equation}
Then $F$ is differentiable on $(a, b)$ and:
\\begin{equation}
  F'(x) = f(x), \\quad a \\leq x \\leq b
\\end{equation}

\\subsection{Evaluation Theorem (Part II)}
If $f$ is continuous on $[a, b]$ and $G$ is any antiderivative of $f$, then:
\\[
\\int_{a}^{b} f(x)\\,dx = G(b) - G(a).
\\]

\\end{document}`,
  },
  {
    id: 'conv-eigen',
    title: 'Linear Algebra - Eigenvalues & Matrices',
    fileName: 'eigenvalues_chapter4.pdf',
    fileType: 'PDF',
    model: 'turbo',
    pages: 8,
    folderId: 'linear-algebra',
    createdAt: daysAgo(3),
    latex: `\\documentclass{article}
\\usepackage{amsmath, amssymb, amsthm}

\\section{Eigenvalues and Diagonalization}

Let $A \\in \\mathbb{R}^{n \\times n}$ be a square matrix. A scalar $\\lambda \\in \\mathbb{C}$ is an \\textbf{eigenvalue} of $A$ if there exists a nonzero vector $\\mathbf{v} \\neq \\mathbf{0}$ such that:
\\begin{equation}
A\\mathbf{v} = \\lambda\\mathbf{v}
\\end{equation}

The characteristic polynomial is given by $p(\\lambda) = \\det(A - \\lambda I_n) = 0$.

\\subsection{Spectral Theorem for Symmetric Matrices}
If $A = A^T \\in \\mathbb{R}^{n \\times n}$, then $A$ admits an orthogonal diagonalization:
\\[
A = Q \\Lambda Q^T, \\quad \\Lambda = \\begin{pmatrix} \\lambda_1 & 0 & \\cdots & 0 \\\\ 0 & \\lambda_2 & \\cdots & 0 \\\\ \\vdots & \\vdots & \\ddots & \\vdots \\\\ 0 & 0 & \\cdots & \\lambda_n \\end{pmatrix}
\\]
where the columns of $Q$ form an orthonormal basis of eigenvectors.

\\end{document}`,
  },
  {
    id: 'conv-fourier-slides',
    title: 'Fourier Transform Beamer Slides',
    fileName: 'fourier_seminar_deck.tex',
    fileType: 'SLIDES',
    model: 'turbo',
    pages: 6,
    folderId: 'general',
    createdAt: daysAgo(5),
    latex: `\\documentclass{beamer}
\\usetheme{Madrid}
\\usepackage{amsmath, amssymb}

\\title{The Fourier Transform}
\\subtitle{From Signals to PDEs}
\\author{OpenTEX Slides}

\\begin{document}

\\begin{frame}
\\titlepage
\\end{frame}

\\begin{frame}{Definition of the Fourier Transform}
For $f \\in L^1(\\mathbb{R})$, the Fourier transform $\\hat{f}(\\xi)$ is defined by:
\\[
\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x) e^{-2\\pi i x \\xi} \\, dx
\\]
\\begin{itemize}
  \\item Linear operator mapping time domain to frequency domain
  \\item Converts differentiation into algebraic multiplication
\\end{itemize}
\\end{frame}

\\begin{frame}{Plancherel & Inversion Theorem}
If $f, \\hat{f} \\in L^1(\\mathbb{R}) \\cap L^2(\\mathbb{R})$, then:
\\[
f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi) e^{2\\pi i x \\xi} \\, d\\xi, \\qquad \\|f\\|_{L^2} = \\|\\hat{f}\\|_{L^2}.
\\]
\\end{frame}

\\end{document}`,
  },
];

export const SEED_COMMUNITIES: Community[] = [
  {
    id: 'comm-linalg',
    name: 'Linear Algebra · Group B',
    description: 'Sample course notes, problem sets, and past exams.',
    mode: 'open',
    inviteCode: 'ot-linalg-b2026',
    memberCount: 1,
    isOwner: true,
    conversionIds: ['conv-eigen', 'conv-limits'],
  },
  {
    id: 'comm-analysis',
    name: 'Real Analysis Seminar',
    description: 'Sample weekly lecture transcriptions and theorem proofs.',
    mode: 'readonly',
    inviteCode: 'ot-analysis-sem',
    memberCount: 1,
    isOwner: false,
    conversionIds: ['conv-ftc', 'conv-fourier-slides'],
  },
];

export const SEED_API_KEYS: ApiKeyItem[] = [
  {
    id: 'key-1',
    name: 'Local MCP Workspace Key',
    prefix: 'ot_live_8a9f...3c21',
    createdAt: daysAgo(6),
    lastUsed: null,
  },
];

export const DEFAULT_PUBLIK_CONFIG: PublikConfig = {
  baseUrl: 'https://publikhq.com/api/v1',
  apiKey: '',
  professionalModel: 'publik-smart',
  turboModel: 'publik-fast',
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  theme: 'light',
  editorPalette: 'mathwrite',
  saveHistory: true,
  interfaceLanguage: 'en',
  onboardingCompleted: false,
  defaultModel: 'professional',
};

export const SEED_FEEDBACK: FeedbackRequest[] = [
  {
    id: 'fb-1',
    title: 'TikZ commutative diagram recognition',
    description: 'Recognize category theory diagrams with curved arrows and convert straight to tikz-cd.',
    votes: 42,
    status: 'In Progress',
    author: 'Antonio Bruno',
    createdAt: daysAgo(4),
  },
  {
    id: 'fb-2',
    title: 'Multi-file Overleaf project export with BibTeX',
    description: 'Bundle main.tex, references.bib, and extracted figures when exporting to Overleaf.',
    votes: 31,
    status: 'Planned',
    author: 'Marion Lefebvre',
    createdAt: daysAgo(9),
  },
  {
    id: 'fb-3',
    title: '100% Free Unlimited Mode with Publik AI',
    description: 'Remove credit caps and connect directly to Publik OpenAI-compatible models.',
    votes: 89,
    status: 'Shipped',
    author: 'Andrés Leyenda',
    createdAt: daysAgo(1),
  },
];

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getConversions(): ConversionItem[] {
  return readStorage<ConversionItem[]>(KEYS.CONVERSIONS, SEED_CONVERSIONS);
}

export function saveConversions(items: ConversionItem[]): boolean {
  return writeStorage(KEYS.CONVERSIONS, items);
}

export function saveConversion(item: ConversionItem): ConversionItem[] {
  const existing = getConversions();
  const idx = existing.findIndex((c) => c.id === item.id);
  const next = idx >= 0 ? existing.map((c, i) => (i === idx ? item : c)) : [item, ...existing];
  if (!saveConversions(next) && item.previewImage) {
    // Drop large base64 previewImage if localStorage quota is full so text/LaTeX still persists
    const withoutPreview = { ...item, previewImage: undefined };
    const slimNext = idx >= 0 ? existing.map((c, i) => (i === idx ? withoutPreview : c)) : [withoutPreview, ...existing];
    saveConversions(slimNext);
    return slimNext;
  }
  return next;
}

export function deleteConversion(id: string): ConversionItem[] {
  const next = getConversions().filter((c) => c.id !== id);
  saveConversions(next);
  return next;
}

export function getFolders(): ConversionFolder[] {
  return readStorage<ConversionFolder[]>(KEYS.FOLDERS, SEED_FOLDERS);
}

export function saveFolders(folders: ConversionFolder[]): void {
  writeStorage(KEYS.FOLDERS, folders);
}

const LEGACY_LANGUAGE_MAP: Record<string, string> = {
  english: 'en',
  spanish: 'es',
  german: 'de',
  french: 'fr',
  italian: 'it',
  portuguese: 'pt',
  chinese: 'zh',
  japanese: 'ja',
  korean: 'ko',
  arabic: 'ar',
  russian: 'ru',
  hindi: 'hi',
};

export function getSettings(): ConversionSettings {
  const raw = readStorage<ConversionSettings>(KEYS.SETTINGS, DEFAULT_CONVERSION_SETTINGS);
  const mappedLang = LEGACY_LANGUAGE_MAP[(raw.language || '').toLowerCase()];
  return mappedLang ? { ...raw, language: mappedLang } : raw;
}

export function saveSettings(settings: ConversionSettings): void {
  writeStorage(KEYS.SETTINGS, settings);
}

export function getCommunities(): Community[] {
  return readStorage<Community[]>(KEYS.COMMUNITIES, SEED_COMMUNITIES);
}

export function saveCommunities(communities: Community[]): void {
  writeStorage(KEYS.COMMUNITIES, communities);
}

export function getApiKeys(): ApiKeyItem[] {
  return readStorage<ApiKeyItem[]>(KEYS.API_KEYS, SEED_API_KEYS);
}

export function saveApiKeys(keys: ApiKeyItem[]): void {
  writeStorage(KEYS.API_KEYS, keys);
}

export function getPublikConfig(): PublikConfig {
  const cfg = readStorage<PublikConfig>(KEYS.PUBLIK_CONFIG, DEFAULT_PUBLIK_CONFIG);
  if (cfg.baseUrl === 'https://api.publik.ai/v1' && !cfg.apiKey) {
    return DEFAULT_PUBLIK_CONFIG;
  }
  return cfg;
}

export function savePublikConfig(config: PublikConfig): void {
  writeStorage(KEYS.PUBLIK_CONFIG, config);
}

export function getAppPreferences(): AppPreferences {
  return readStorage<AppPreferences>(KEYS.PREFERENCES, DEFAULT_APP_PREFERENCES);
}

export function saveAppPreferences(prefs: AppPreferences): void {
  writeStorage(KEYS.PREFERENCES, prefs);
}

export function getFeedbackRequests(): FeedbackRequest[] {
  return readStorage<FeedbackRequest[]>(KEYS.FEEDBACK, SEED_FEEDBACK);
}

export function saveFeedbackRequests(items: FeedbackRequest[]): void {
  writeStorage(KEYS.FEEDBACK, items);
}

export function clearAllConversions(): void {
  writeStorage<ConversionItem[]>(KEYS.CONVERSIONS, []);
}
