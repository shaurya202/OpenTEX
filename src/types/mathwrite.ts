export type ConversionModel = 'professional' | 'turbo';

export type StylePreset = 'faithful' | 'balanced' | 'professional' | 'custom';

export type LatexThemeStyle = 'standard' | 'tagged' | 'boxed';

export type EditorPalette = 'mathwrite' | 'github' | 'ocean' | 'solarized' | 'vivid' | 'mono';

export interface ConversionSettings {
  preset: StylePreset;
  latexStyle: LatexThemeStyle;
  title: boolean;
  headings: 'sections' | 'emphasis';
  toc: boolean;
  language: string;
  colours: boolean;
  underlines: 'matchPaper' | 'normalise';
  crossedOut: 'drop' | 'keep';
  annotations: 'drop' | 'keep';
  margin: 'veryNarrow' | 'narrow' | 'normal' | 'wide' | 'veryWide';
  lineSpacing: 'normal' | 'open' | 'oneAndAHalf' | 'double';
  fontSize: 'verySmall' | 'small' | 'normal' | 'large' | 'veryLarge';
  contextualText: 'none' | 'minimal' | 'enhanced';
  textStyle: 'preserveWording' | 'correctSpelling' | 'rewriteProfessionally';
  equationLayout: 'preserveOriginal' | 'compact' | 'readable' | 'automatic';
  numbering: boolean;
  diagrams: 'draw' | 'placeholder' | 'omit';
  images: boolean;
}

export interface ConversionItem {
  id: string;
  title: string;
  fileName: string;
  fileType: 'IMAGE' | 'PDF' | 'SLIDES' | 'TOOLS';
  model: ConversionModel;
  pages: number;
  latex: string;
  createdAt: string;
  folderId: string;
  previewImage?: string;
}

export interface ConversionFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  mode: 'readonly' | 'open';
  inviteCode: string;
  memberCount: number;
  isOwner: boolean;
  conversionIds: string[];
}

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string | null;
}

export interface PublikConfig {
  baseUrl: string;
  apiKey: string;
  professionalModel: string;
  turboModel: string;
}

export interface AppPreferences {
  theme: 'light' | 'dark' | 'system';
  editorPalette: EditorPalette;
  saveHistory: boolean;
  interfaceLanguage: string;
  onboardingCompleted?: boolean;
  defaultModel?: ConversionModel;
}

export interface FeedbackRequest {
  id: string;
  title: string;
  description: string;
  votes: number;
  voted?: boolean;
  status: 'Planned' | 'In Progress' | 'Shipped';
  author: string;
  createdAt: string;
}

export const NOTES_LANGUAGES = [
  { value: 'automatic', label: 'Automatic (Detect from notes)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ru', label: 'Russian' },
  { value: 'hi', label: 'Hindi' },
] as const;

export const PRESET_LABELS: Record<StylePreset, string> = {
  faithful: 'Verbatim',
  balanced: 'Balanced',
  professional: 'Publication',
  custom: 'Custom',
};

export const LATEX_STYLE_LABELS: Record<LatexThemeStyle, string> = {
  standard: 'Classic',
  tagged: 'Tagged',
  boxed: 'Boxed',
};

export const DEFAULT_CONVERSION_SETTINGS: ConversionSettings = {
  preset: 'balanced',
  latexStyle: 'standard',
  title: true,
  headings: 'sections',
  toc: false,
  language: 'automatic',
  colours: true,
  underlines: 'normalise',
  crossedOut: 'drop',
  annotations: 'drop',
  margin: 'normal',
  lineSpacing: 'normal',
  fontSize: 'normal',
  contextualText: 'minimal',
  textStyle: 'correctSpelling',
  equationLayout: 'automatic',
  numbering: true,
  diagrams: 'draw',
  images: true,
};

export const PRESET_SETTINGS: Record<Exclude<StylePreset, 'custom'>, Omit<ConversionSettings, 'preset' | 'latexStyle' | 'language'>> = {
  faithful: {
    title: false,
    headings: 'emphasis',
    toc: false,
    colours: true,
    underlines: 'matchPaper',
    crossedOut: 'keep',
    annotations: 'keep',
    margin: 'normal',
    lineSpacing: 'normal',
    fontSize: 'normal',
    contextualText: 'none',
    textStyle: 'preserveWording',
    equationLayout: 'preserveOriginal',
    numbering: false,
    diagrams: 'draw',
    images: true,
  },
  balanced: {
    title: true,
    headings: 'sections',
    toc: false,
    colours: true,
    underlines: 'normalise',
    crossedOut: 'drop',
    annotations: 'drop',
    margin: 'normal',
    lineSpacing: 'normal',
    fontSize: 'normal',
    contextualText: 'minimal',
    textStyle: 'correctSpelling',
    equationLayout: 'automatic',
    numbering: true,
    diagrams: 'draw',
    images: true,
  },
  professional: {
    title: true,
    headings: 'sections',
    toc: true,
    colours: false,
    underlines: 'normalise',
    crossedOut: 'drop',
    annotations: 'drop',
    margin: 'normal',
    lineSpacing: 'oneAndAHalf',
    fontSize: 'normal',
    contextualText: 'enhanced',
    textStyle: 'rewriteProfessionally',
    equationLayout: 'readable',
    numbering: true,
    diagrams: 'draw',
    images: true,
  },
};

export interface PaletteStyle {
  id: EditorPalette;
  name: string;
  bg: string;
  gutter: string;
  text: string;
  command: string;
  math: string;
  comment: string;
  braces: string;
}

export const EDITOR_PALETTES: Record<EditorPalette, PaletteStyle> = {
  mathwrite: {
    id: 'mathwrite',
    name: 'OpenTEX',
    bg: '#020617',
    gutter: '#475569',
    text: '#e2e8f0',
    command: '#7dd3fc',
    math: '#6ee7b7',
    comment: '#64748b',
    braces: '#fde68a',
  },
  github: {
    id: 'github',
    name: 'GitHub',
    bg: '#0d1117',
    gutter: '#6e7681',
    text: '#c9d1d9',
    command: '#79c0ff',
    math: '#a5d6ff',
    comment: '#8b949e',
    braces: '#ffa657',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    bg: '#0b192c',
    gutter: '#5c7c99',
    text: '#e0f2fe',
    command: '#38bdf8',
    math: '#34d399',
    comment: '#64748b',
    braces: '#f472b6',
  },
  solarized: {
    id: 'solarized',
    name: 'Solarized',
    bg: '#002b36',
    gutter: '#586e75',
    text: '#93a1a1',
    command: '#268bd2',
    math: '#2aa198',
    comment: '#657b83',
    braces: '#b58900',
  },
  vivid: {
    id: 'vivid',
    name: 'Vivid',
    bg: '#111827',
    gutter: '#6b7280',
    text: '#f9fafb',
    command: '#c084fc',
    math: '#4ade80',
    comment: '#9ca3af',
    braces: '#fbbf24',
  },
  mono: {
    id: 'mono',
    name: 'Monochrome',
    bg: '#09090b',
    gutter: '#52525b',
    text: '#e4e4e7',
    command: '#ffffff',
    math: '#d4d4d8',
    comment: '#71717a',
    braces: '#a1a1aa',
  },
};
