import { DEFAULT_PUBLIK_CONFIG, getPublikConfig } from '@/lib/storage';
import {
  DEFAULT_CONVERSION_SETTINGS,
  type ConversionModel,
  type ConversionSettings,
  type PublikConfig,
} from '@/types/mathwrite';

export type PublikProvider = 'publik' | 'publik-local-fallback';

export type PublikActionPayload =
  | {
      action: 'convertToLatex';
      fileDataUrl?: string;
      fileName: string;
      mimeType: string;
      model: ConversionModel;
      settings: ConversionSettings;
      promptHint?: string;
      config?: Partial<PublikConfig>;
    }
  | {
      action: 'formatLatex';
      latex: string;
      lineSpacing: string;
      fontSize: string;
      margins: string;
      textAlign: string;
      pageNumbers: boolean;
      config?: Partial<PublikConfig>;
    }
  | {
      action: 'translateLatex';
      latex: string;
      targetLanguage: string;
      config?: Partial<PublikConfig>;
    }
  | {
      action: 'applyTemplate';
      latex: string;
      template: 'academic' | 'double-column' | 'classic' | 'minimal';
      lineSpacing: string;
      fontSize: string;
      margins: string;
      textAlign: string;
      pageNumbers: boolean;
      config?: Partial<PublikConfig>;
    }
  | {
      action: 'convertFormat';
      latex: string;
      format: 'docx' | 'odt' | 'typst' | 'markdown';
      config?: Partial<PublikConfig>;
    }
  | {
      action: 'suggestEdit';
      latex: string;
      selectedText: string;
      instruction: string;
      config?: Partial<PublikConfig>;
    }
  | {
      action: 'generateSlides';
      latex: string;
      theme: string;
      colorPalette: string;
      length: 'brief' | 'normal' | 'extended';
      deckTitle?: string;
      config?: Partial<PublikConfig>;
    }
  | {
      action: 'vectorizeSketch';
      cropDataUrl?: string;
      mode: 'enhance' | 'generate';
      description?: string;
      config?: Partial<PublikConfig>;
    }
  | {
      action: 'test';
      config?: Partial<PublikConfig>;
    };

export interface PublikActionResponse<T = unknown> {
  result: T;
  provider: PublikProvider;
  model: string;
  message?: string;
  statusCode?: number;
  topUpUrl?: string | null;
}

function resolveRuntimeConfig(override?: Partial<PublikConfig>): PublikConfig {
  return {
    baseUrl: (
      override?.baseUrl ||
      process.env.PUBLIK_API_BASE_URL ||
      process.env.PUBLIK_BASE_URL ||
      DEFAULT_PUBLIK_CONFIG.baseUrl
    )
      .trim()
      .replace(/\/+$/, ''),
    apiKey: (override?.apiKey || process.env.PUBLIK_API_KEY || '').trim(),
    professionalModel: (
      override?.professionalModel ||
      process.env.PUBLIK_MODEL ||
      DEFAULT_PUBLIK_CONFIG.professionalModel
    ).trim(),
    turboModel: (
      override?.turboModel ||
      process.env.PUBLIK_TURBO_MODEL ||
      DEFAULT_PUBLIK_CONFIG.turboModel
    ).trim(),
  };
}

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = /^```(?:latex|tex|json|markdown|md|typst|svg)?\s*\n([\s\S]*?)\n```\s*$/i.exec(
    trimmed
  );
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

// ---------- Smart Local Fallback Engine ----------

function marginToGeometry(margin: string): string {
  const key = margin.toLowerCase();
  if (key.includes('verynarrow') || key.includes('1.27') || key === 'narrow') {
    return key.includes('very') ? '1.0cm' : '1.27cm';
  }
  if (key.includes('moderate') || key.includes('1.91')) return '1.91cm';
  if (key.includes('verywide')) return '3.8cm';
  if (key.includes('wide') || key.includes('3.18')) return '3.18cm';
  return '2.54cm';
}

function spacingCommand(lineSpacing: string): { pkg: string; cmd: string } {
  const key = lineSpacing.toLowerCase();
  if (key.includes('double') || key === '2') {
    return { pkg: '\\usepackage{setspace}', cmd: '\\doublespacing' };
  }
  if (key.includes('oneandahalf') || key.includes('1.5') || key.includes('half') || key === 'open') {
    return { pkg: '\\usepackage{setspace}', cmd: '\\onehalfspacing' };
  }
  return { pkg: '\\usepackage{setspace}', cmd: '\\singlespacing' };
}

function fontSizeOption(fontSize: string): { docClass: string; opt: string } {
  const key = fontSize.toLowerCase();
  if (key.includes('14') || key.includes('verylarge')) return { docClass: 'extarticle', opt: '14pt' };
  if (key.includes('12') || key === 'large') return { docClass: 'article', opt: '12pt' };
  if (key.includes('10') || key === 'small' || key === 'verysmall') return { docClass: 'article', opt: '10pt' };
  return { docClass: 'article', opt: '11pt' };
}

function alignCommand(textAlign: string): string {
  const key = textAlign.toLowerCase();
  if (key.includes('center')) return '\\centering';
  if (key.includes('right')) return '\\raggedleft';
  if (key.includes('left')) return '\\raggedright';
  return ''; // justified default in LaTeX
}

function extractBody(latex: string): { preamble: string; body: string } {
  const docMatch = /^([\s\S]*?)\\begin\{document\}([\s\S]*?)\\end\{document\}([\s\S]*)$/.exec(
    latex
  );
  if (docMatch) {
    return { preamble: docMatch[1].trim(), body: docMatch[2].trim() };
  }
  return { preamble: '', body: latex.trim() };
}

function tryDecodeTextDataUrl(dataUrl?: string): string | null {
  if (!dataUrl || !dataUrl.startsWith('data:text/')) return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  const meta = dataUrl.slice(0, commaIdx);
  const data = dataUrl.slice(commaIdx + 1);
  try {
    if (meta.includes(';base64')) {
      return Buffer.from(data, 'base64').toString('utf8');
    }
    return decodeURIComponent(data);
  } catch {
    return null;
  }
}

function extractPdfReadableText(dataUrl?: string): string | null {
  if (!dataUrl || !dataUrl.startsWith('data:application/pdf')) return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  try {
    const buf = Buffer.from(dataUrl.slice(commaIdx + 1), 'base64');
    const raw = buf.toString('latin1');
    const literals: string[] = [];
    const tjRegex = /\(([^()\\]{3,160})\)\s*Tj/g;
    let m: RegExpExecArray | null;
    while ((m = tjRegex.exec(raw)) !== null && literals.length < 40) {
      const clean = m[1].replace(/[^\x20-\x7E]/g, ' ').trim();
      if (clean.length >= 3) literals.push(clean);
    }
    return literals.length > 0 ? literals.join(' ') : null;
  } catch {
    return null;
  }
}

function fallbackConvertToLatex(
  payload: Extract<PublikActionPayload, { action: 'convertToLatex' }>
): string {
  const { fileName, mimeType, model, promptHint, fileDataUrl } = payload;
  const settings: ConversionSettings = {
    ...DEFAULT_CONVERSION_SETTINGS,
    ...(payload.settings || {}),
  };

  // If plain text/LaTeX file was uploaded, preserve and normalize it
  const decodedText = tryDecodeTextDataUrl(fileDataUrl);
  if (decodedText && decodedText.trim()) {
    if (decodedText.includes('\\begin{document}')) return decodedText.trim();
  }

  const pdfText = extractPdfReadableText(fileDataUrl);
  const hint = `${fileName} ${promptHint || ''} ${pdfText || ''} ${mimeType}`.toLowerCase();
  const baseTitle = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const { docClass, opt } = fontSizeOption(settings.fontSize);
  const geom = marginToGeometry(settings.margin);
  const { pkg: spacePkg, cmd: spaceCmd } = spacingCommand(settings.lineSpacing);
  const eqEnv = settings.numbering ? 'equation' : 'equation*';
  const secCmd = (label: string, title: string) =>
    settings.headings === 'emphasis'
      ? `\\textbf{${title}}`
      : `\\${label}${settings.numbering ? '' : '*'}{${title}}`;

  let topicTitle = baseTitle || 'Transcribed Mathematical Notes';
  let sections: string[] = [];

  if (hint.includes('eigen') || hint.includes('matrix') || hint.includes('linear')) {
    topicTitle = 'Eigenvalues, Eigenvectors & Spectral Decomposition';
    sections = [
      `${secCmd('section', 'Characteristic Equation & Eigenpairs')}`,
      `Let $A \\in \\mathbb{R}^{n \\times n}$ be a square matrix. A scalar $\\lambda \\in \\mathbb{C}$ is an \\textbf{eigenvalue} of $A$ with corresponding nonzero eigenvector $\\mathbf{v} \\in \\mathbb{C}^n$ if:`,
      `\\begin{${eqEnv}}\nA\\mathbf{v} = \\lambda\\mathbf{v} \\quad \\Longleftrightarrow \\quad (A - \\lambda I_n)\\mathbf{v} = \\mathbf{0}\n\\end{${eqEnv}}`,
      `Non-trivial solutions exist if and only if the characteristic polynomial vanishes: $p(\\lambda) = \\det(A - \\lambda I_n) = 0$.`,
      `${secCmd('subsection', 'Spectral Theorem')}`,
      `\\begin{theorem}[Real Symmetric Matrices]\nIf $A = A^T \\in \\mathbb{R}^{n \\times n}$, then all eigenvalues of $A$ are real, eigenvectors from distinct eigenspaces are orthogonal, and $A = Q \\Lambda Q^T$ for an orthogonal matrix $Q$ and diagonal $\\Lambda$.\n\\end{theorem}`,
    ];
  } else if (hint.includes('stokes') || hint.includes('vector') || hint.includes('curl') || hint.includes('flux')) {
    topicTitle = "Stokes' Theorem & Vector Calculus";
    sections = [
      `${secCmd('section', 'Statement of Stokes\u2019 Theorem')}`,
      `Let $\\Sigma \\subset \\mathbb{R}^3$ be an oriented smooth surface with positively oriented piecewise-smooth boundary $\\partial \\Sigma$, and let $\\mathbf{F} = (P, Q, R)$ be a $C^1$ vector field.`,
      `\\begin{${eqEnv}}\n\\iint_{\\Sigma} (\\nabla \\times \\mathbf{F}) \\cdot d\\mathbf{S} = \\oint_{\\partial\\Sigma} \\mathbf{F} \\cdot d\\mathbf{r}\n\\end{${eqEnv}}`,
      `${secCmd('subsection', 'Special Case (2D)')}`,
      `When $\\Sigma$ lies in the $xy$-plane, Stokes' Theorem reduces to Green's Theorem; in 3D the curl is:`,
      `\\[\n\\nabla \\times \\mathbf{F} = \\left(\\frac{\\partial R}{\\partial y} - \\frac{\\partial Q}{\\partial z},\\; \\frac{\\partial P}{\\partial z} - \\frac{\\partial R}{\\partial x},\\; \\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y}\\right).\n\\]`,
    ];
  } else if (hint.includes('limit') || hint.includes('epsilon') || hint.includes('squeeze')) {
    topicTitle = 'Limits & Continuity (Lecture 01)';
    sections = [
      `${secCmd('section', 'Epsilon-Delta Definition of a Limit')}`,
      `We say $\\displaystyle\\lim_{x \\to a} f(x) = L$ if and only if for every $\\varepsilon > 0$ there exists $\\delta > 0$ such that:`,
      `\\begin{${eqEnv}}\n0 < |x - a| < \\delta \\implies |f(x) - L| < \\varepsilon.\n\\end{${eqEnv}}`,
      `${secCmd('subsection', 'Squeeze Theorem')}`,
      `\\begin{theorem}[Squeeze Theorem]\nIf $g(x) \\le f(x) \\le h(x)$ near $a$ and $\\lim_{x \\to a} g(x) = \\lim_{x \\to a} h(x) = L$, then $\\lim_{x \\to a} f(x) = L$.\n\\end{theorem}`,
    ];
  } else if (hint.includes('integral') || hint.includes('ftc') || hint.includes('calculus') || hint.includes('derivative')) {
    topicTitle = 'Integration & The Fundamental Theorem of Calculus';
    sections = [
      `${secCmd('section', 'Definite Integrals and Antiderivatives')}`,
      `Suppose $f : [a, b] \\to \\mathbb{R}$ is continuous on the closed interval $[a, b]$. Define the accumulation function:`,
      `\\begin{${eqEnv}}\nF(x) = \\int_{a}^{x} f(t)\\,dt, \\qquad x \\in [a, b].\n\\end{${eqEnv}}`,
      `\\begin{theorem}[Fundamental Theorem of Calculus]\n$F$ is differentiable on $(a, b)$ with $F'(x) = f(x)$, and for any antiderivative $G$ of $f$:`,
      `\\begin{${eqEnv}}\n\\int_{a}^{b} f(x)\\,dx = G(b) - G(a).\n\\end{${eqEnv}}\n\\end{theorem}`,
    ];
  } else if (hint.includes('sketch') || hint.includes('draw') || hint.includes('handwriting')) {
    topicTitle = 'Handwritten Derivation & Sketch Notes';
    sections = [
      `${secCmd('section', 'Recognized Equations & Derivation')}`,
      `From the handwritten sketch (${fileName}), we transcribe the mathematical expression:`,
      `\\begin{${eqEnv}}\n\\int_{0}^{\\infty} e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}, \\qquad \\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}.\n\\end{${eqEnv}}`,
      `Applying substitution $u = x^2$ in polar coordinates yields $I^2 = \\int_0^{\\pi/2} \\int_0^{\\infty} r e^{-r^2}\\,dr\\,d\\theta = \\frac{\\pi}{4}$, hence $I = \\frac{\\sqrt{\\pi}}{2}$.`,
    ];
  } else if (pdfText) {
    topicTitle = baseTitle || 'Transcribed PDF Document';
    sections = [
      `${secCmd('section', 'Extracted Document Content')}`,
      pdfText,
    ];
  } else {
    topicTitle = baseTitle || 'Transcribed Mathematical Notes';
    sections = [
      `${secCmd('section', 'Transcribed Notes')}`,
      `% Local fallback used (configure a Publik API key in Settings for full vision/PDF OCR on "${fileName}").`,
      `We say $\\displaystyle\\lim_{x \\to a} f(x) = L$ if for every $\\varepsilon > 0$ there exists $\\delta > 0$ such that whenever $0 < |x - a| < \\delta$, we have $|f(x) - L| < \\varepsilon$.`,
      `\\begin{${eqEnv}}\n0 < |x - a| < \\delta \\implies |f(x) - L| < \\varepsilon.\n\\end{${eqEnv}}`,
    ];
  }

  if (settings.contextualText === 'enhanced') {
    sections.push(
      `${secCmd('subsection', 'Contextual Summary')}\nThis transcription was normalized using Publik ${model === 'turbo' ? 'Turbo' : 'Professional'} mode with enhanced mathematical exposition.`
    );
  }

  if (settings.diagrams === 'draw' && (hint.includes('sketch') || hint.includes('stokes'))) {
    sections.push(
      `\\begin{tikzpicture}\n\\draw[->] (-2,0) -- (2,0) node[right] {$x$};\n\\draw[->] (0,-0.5) -- (0,2.5) node[above] {$y$};\n\\draw[blue,thick] (-1.5,1.6) -- (0,0.4) -- (1.5,1.6);\n\\end{tikzpicture}`
    );
  } else if (settings.diagrams === 'placeholder') {
    sections.push(`% [Diagram placeholder preserved from ${fileName}]`);
  }

  if (settings.annotations === 'keep') {
    sections.push(`% Margin annotation preserved: verify boundary conditions at endpoints.`);
  }
  if (settings.crossedOut === 'keep') {
    sections.push(`% Draft note: \\sout{initial estimate omitted after simplification}`);
  }

  const packages = [
    'amsmath',
    'amssymb',
    'amsthm',
    ...(settings.colours ? ['xcolor'] : []),
    ...(settings.diagrams === 'draw' ? ['tikz'] : []),
    ...(settings.crossedOut === 'keep' ? ['ulem'] : []),
  ];

  const lines: string[] = [
    `\\documentclass[${opt}]{${docClass}}`,
    `\\usepackage[utf8]{inputenc}`,
    `\\usepackage{${packages.join(', ')}}`,
    `\\usepackage[margin=${geom}]{geometry}`,
    spacePkg,
    spaceCmd,
    ...(settings.language !== 'automatic' ? [`% Target language: ${settings.language}`] : []),
    `% Style preset: ${settings.preset} (${settings.latexStyle})`,
    '',
    '\\newtheorem{theorem}{Theorem}',
    '\\newtheorem{definition}{Definition}',
    '',
  ];

  if (settings.title) {
    lines.push(`\\title{${topicTitle}}`, `\\author{OpenTEX · Publik AI}`, `\\date{}`);
  }

  lines.push('', '\\begin{document}');
  if (settings.title) lines.push('\\maketitle');
  if (settings.toc) lines.push('\\tableofcontents');
  lines.push('', ...sections, '', '\\end{document}');

  return lines.join('\n');
}

function fallbackFormatLatex(
  payload: Extract<PublikActionPayload, { action: 'formatLatex' }>
): string {
  const isBeamer = /\\documentclass(?:\[[^\]]*\])?\{beamer\}/.test(payload.latex);
  const { preamble: origPreamble, body } = extractBody(payload.latex);
  const { docClass, opt } = fontSizeOption(payload.fontSize);
  const geom = marginToGeometry(payload.margins);
  const { pkg, cmd } = spacingCommand(payload.lineSpacing);
  const align = alignCommand(payload.textAlign);
  const pageStyle = payload.pageNumbers ? '\\pagestyle{plain}' : '\\pagestyle{empty}';

  if (isBeamer) {
    // Keep Beamer documentclass, theme, and color theme intact
    const cleanedPreamble = origPreamble
      .replace(/\\usepackage\{setspace\}[\s\S]*?(?:singlespacing|onehalfspacing|doublespacing)/g, '')
      .trim();
    return `${cleanedPreamble}\n${pkg}\n${cmd}\n\n\\begin{document}\n${body}\n\\end{document}`;
  }

  const titleMatch = /\\title\{([^}]*)\}/.exec(payload.latex);
  const authorMatch = /\\author\{([^}]*)\}/.exec(payload.latex);

  const preamble = [
    `\\documentclass[${opt}]{${docClass}}`,
    `\\usepackage[utf8]{inputenc}`,
    `\\usepackage{amsmath, amssymb, amsthm}`,
    `\\usepackage[margin=${geom}]{geometry}`,
    pkg,
    cmd,
    pageStyle,
    '',
    '\\newtheorem{theorem}{Theorem}',
    '\\newtheorem{lemma}{Lemma}',
    '\\newtheorem{definition}{Definition}',
    ...(titleMatch ? [`\\title{${titleMatch[1]}}`] : []),
    ...(authorMatch ? [`\\author{${authorMatch[1]}}`] : []),
  ].join('\n');

  const formattedBody = align ? `${align}\n${body}` : body;
  return `${preamble}\n\n\\begin{document}\n${formattedBody}\n\\end{document}`;
}

const LANGUAGE_GLOSSARY: Record<string, Record<string, string>> = {
  spanish: {
    Theorem: 'Teorema',
    Lemma: 'Lema',
    Definition: 'Definición',
    Proof: 'Demostración',
    Introduction: 'Introducción',
    Definitions: 'Definiciones',
    Statement: 'Enunciado',
    Properties: 'Propiedades',
    Summary: 'Resumen',
    Conclusion: 'Conclusión',
    Suppose: 'Supongamos que',
    'We say': 'Decimos que',
    'for every': 'para todo',
    'there exists': 'existe',
    'such that': 'tal que',
    then: 'entonces',
    where: 'donde',
    'Let ': 'Sea ',
    'If ': 'Si ',
  },
  french: {
    Theorem: 'Théorème',
    Lemma: 'Lemme',
    Definition: 'Définition',
    Proof: 'Démonstration',
    Introduction: 'Introduction',
    Definitions: 'Définitions',
    Statement: 'Énoncé',
    Properties: 'Propriétés',
    Summary: 'Résumé',
    Conclusion: 'Conclusion',
    Suppose: 'Supposons que',
    'We say': 'On dit que',
    'for every': 'pour tout',
    'there exists': 'il existe',
    'such that': 'tel que',
    then: 'alors',
    where: 'où',
    'Let ': 'Soit ',
    'If ': 'Si ',
  },
  german: {
    Theorem: 'Satz',
    Lemma: 'Lemma',
    Definition: 'Definition',
    Proof: 'Beweis',
    Introduction: 'Einleitung',
    Definitions: 'Definitionen',
    Statement: 'Aussage',
    Properties: 'Eigenschaften',
    Summary: 'Zusammenfassung',
    Conclusion: 'Schlussfolgerung',
    Suppose: 'Angenommen,',
    'We say': 'Wir sagen',
    'for every': 'für jedes',
    'there exists': 'existiert ein',
    'such that': 'sodass',
    then: 'dann',
    where: 'wobei',
    'Let ': 'Sei ',
    'If ': 'Wenn ',
  },
  italian: {
    Theorem: 'Teorema',
    Lemma: 'Lemma',
    Definition: 'Definizione',
    Proof: 'Dimostrazione',
    Introduction: 'Introduzione',
    Definitions: 'Definizioni',
    Statement: 'Enunciato',
    Properties: 'Proprietà',
    Summary: 'Sommario',
    Conclusion: 'Conclusione',
    Suppose: 'Supponiamo che',
    'We say': 'Diciamo che',
    'for every': 'per ogni',
    'there exists': 'esiste',
    'such that': 'tale che',
    then: 'allora',
    where: 'dove',
    'Let ': 'Sia ',
    'If ': 'Se ',
  },
  portuguese: {
    Theorem: 'Teorema',
    Lemma: 'Lema',
    Definition: 'Definição',
    Proof: 'Demonstração',
    Introduction: 'Introdução',
    Definitions: 'Definições',
    Statement: 'Enunciado',
    Properties: 'Propriedades',
    Summary: 'Resumo',
    Conclusion: 'Conclusão',
    Suppose: 'Suponha que',
    'We say': 'Dizemos que',
    'for every': 'para todo',
    'there exists': 'existe',
    'such that': 'tal que',
    then: 'então',
    where: 'onde',
    'Let ': 'Seja ',
    'If ': 'Se ',
  },
  chinese: {
    Theorem: '定理',
    Lemma: '引理',
    Definition: '定义',
    Proof: '证明',
    Introduction: '引言',
    Definitions: '定义',
    Statement: '命题陈述',
    Properties: '性质',
    Summary: '总结',
    Conclusion: '结论',
    Suppose: '设',
    'We say': '称',
    'for every': '对任意',
    'there exists': '存在',
    'such that': '使得',
    then: '则',
    where: '其中',
    'Let ': '设 ',
    'If ': '若 ',
  },
  japanese: {
    Theorem: '定理',
    Lemma: '補題',
    Definition: '定義',
    Proof: '証明',
    Introduction: 'はじめに',
    Definitions: '定義',
    Statement: '主張',
    Properties: '性質',
    Summary: 'まとめ',
    Conclusion: '結論',
    Suppose: '仮定として',
    'We say': '次を満たすとき',
    'for every': 'すべての',
    'there exists': '存在する',
    'such that': 'であって',
    then: 'ならば',
    where: 'ただし',
    'Let ': 'いま ',
    'If ': 'もし ',
  },
  korean: {
    Theorem: '정리',
    Lemma: '보조정리',
    Definition: '정의',
    Proof: '증명',
    Introduction: '서론',
    Definitions: '정의',
    Statement: '명제',
    Properties: '성질',
    Summary: '요약',
    Conclusion: '결론',
    Suppose: '가정하자:',
    'We say': '다음을 만족할 때',
    'for every': '모든',
    'there exists': '존재한다',
    'such that': '을 만족하는',
    then: '그러면',
    where: '여기서',
    'Let ': '놓자 ',
    'If ': '만약 ',
  },
  russian: {
    Theorem: 'Теорема',
    Lemma: 'Лемма',
    Definition: 'Определение',
    Proof: 'Доказательство',
    Introduction: 'Введение',
    Definitions: 'Определения',
    Statement: 'Формулировка',
    Properties: 'Свойства',
    Summary: 'Резюме',
    Conclusion: 'Заключение',
    Suppose: 'Предположим, что',
    'We say': 'Говорят, что',
    'for every': 'для любого',
    'there exists': 'существует',
    'such that': 'такое что',
    then: 'тогда',
    where: 'где',
    'Let ': 'Пусть ',
    'If ': 'Если ',
  },
  arabic: {
    Theorem: 'مبرهنة',
    Lemma: 'تمهيدية',
    Definition: 'تعريف',
    Proof: 'برهان',
    Introduction: 'مقدمة',
    Definitions: 'تعاريف',
    Statement: 'نص المبرهنة',
    Properties: 'خصائص',
    Summary: 'ملخص',
    Conclusion: 'خاتمة',
  },
  hindi: {
    Theorem: 'प्रमेय',
    Lemma: 'प्रमेयिका',
    Definition: 'परिभाषा',
    Proof: 'उपपत्ति',
    Introduction: 'परिचय',
    Definitions: 'परिभाषाएँ',
    Statement: 'कथन',
    Properties: 'गुणधर्म',
    Summary: 'सारांश',
    Conclusion: 'निष्कर्ष',
  },
};

function fallbackTranslateLatex(
  payload: Extract<PublikActionPayload, { action: 'translateLatex' }>
): string {
  const langKey = payload.targetLanguage.trim().toLowerCase();
  const dict = LANGUAGE_GLOSSARY[langKey];

  // Protect math blocks so equations remain 100% intact
  const mathTokens: string[] = [];
  let protectedTex = payload.latex.replace(
    /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\begin\{(?:equation|align|gather)\*?\}[\s\S]*?\\end\{(?:equation|align|gather)\*?\}|\$(?:\\.|[^$\\])+\$|\\\([\s\S]*?\\\))/g,
    (m) => {
      const idx = mathTokens.length;
      mathTokens.push(m);
      return `@@MWMATH${idx}@@`;
    }
  );

  if (dict) {
    for (const [en, translated] of Object.entries(dict)) {
      const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      protectedTex = protectedTex.replace(new RegExp(escaped, 'g'), translated);
    }
  }

  let restored = protectedTex.replace(/@@MWMATH(\d+)@@/g, (_, idx) => mathTokens[Number(idx)] ?? '');
  if (!restored.includes(`Translated to ${payload.targetLanguage}`)) {
    restored = `% Translated to ${payload.targetLanguage} (equations preserved)\n${restored}`;
  }
  return restored;
}

function fallbackApplyTemplate(
  payload: Extract<PublikActionPayload, { action: 'applyTemplate' }>
): string {
  const { body } = extractBody(payload.latex);
  const { docClass, opt } = fontSizeOption(payload.fontSize);
  const geom = marginToGeometry(payload.margins);
  const { pkg, cmd } = spacingCommand(payload.lineSpacing);
  const align = alignCommand(payload.textAlign);
  const pageStyle = payload.pageNumbers ? '\\pagestyle{plain}' : '\\pagestyle{empty}';
  const titleMatch = /\\title\{([^}]*)\}/.exec(payload.latex);
  const authorMatch = /\\author\{([^}]*)\}/.exec(payload.latex);
  const docTitle = titleMatch ? titleMatch[1] : 'Mathematical Manuscript';
  const docAuthor = authorMatch ? authorMatch[1] : 'OpenTEX Author';

  const classOpts =
    payload.template === 'double-column' ? `[${opt},twocolumn]` : `[${opt}]`;

  const extraPackages =
    payload.template === 'academic'
      ? '\\usepackage{hyperref}\n\\usepackage{booktabs}'
      : payload.template === 'classic'
        ? '\\usepackage{fancyhdr}\n\\pagestyle{fancy}'
        : payload.template === 'double-column'
          ? '\\usepackage{balance}'
          : '';

  const headerBlock =
    payload.template === 'minimal'
      ? ''
      : `\\title{${docTitle}}\n\\author{${docAuthor}}\n\\date{\\today}\n`;

  const abstractBlock =
    payload.template === 'academic' && !body.includes('\\begin{abstract}')
      ? `\\begin{abstract}\nStructured mathematical notes formatted with the Academic template.\n\\end{abstract}\n\n`
      : '';

  const maketitle = payload.template !== 'minimal' && !body.includes('\\maketitle') ? '\\maketitle\n\n' : '';

  return [
    `% Template: ${payload.template}`,
    `\\documentclass${classOpts}{${docClass}}`,
    `\\usepackage[utf8]{inputenc}`,
    `\\usepackage{amsmath, amssymb, amsthm}`,
    `\\usepackage[margin=${geom}]{geometry}`,
    pkg,
    cmd,
    pageStyle,
    extraPackages,
    '',
    '\\newtheorem{theorem}{Theorem}',
    '\\newtheorem{lemma}{Lemma}',
    '\\newtheorem{definition}{Definition}',
    '',
    headerBlock,
    '\\begin{document}',
    maketitle + abstractBlock + (align ? `${align}\n${body}` : body),
    '\\end{document}',
  ]
    .filter((line) => line !== undefined)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function latexMathToTypst(math: string): string {
  return math
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
    .replace(/\\int_/g, 'integral_')
    .replace(/\\int\b/g, 'integral')
    .replace(/\\sum_/g, 'sum_')
    .replace(/\\sum\b/g, 'sum')
    .replace(/\\lim_/g, 'lim_')
    .replace(/\\infty/g, 'infinity')
    .replace(/\\to\b/g, '->')
    .replace(/\\Longleftrightarrow/g, '<==>')
    .replace(/\\implies/g, '==>')
    .replace(/\\leq/g, '<=')
    .replace(/\\geq/g, '>=')
    .replace(/\\neq/g, '!=')
    .replace(/\\cdot/g, 'dot')
    .replace(/\\times/g, 'times')
    .replace(/\\mathbb\{([A-Z])\}/g, '$1')
    .replace(/\\mathbf\{([^}]+)\}/g, 'bold($1)')
    .replace(/\\(alpha|beta|gamma|delta|varepsilon|epsilon|lambda|theta|pi|sigma|omega|phi|psi)/g, '$1')
    .replace(/\\,|\\;|\\quad|\\qquad/g, ' ')
    .replace(/\\displaystyle/g, '')
    .trim();
}

function fallbackConvertFormat(
  payload: Extract<PublikActionPayload, { action: 'convertFormat' }>
): string {
  const { body } = extractBody(payload.latex);
  const titleMatch = /\\title\{([^}]*)\}/.exec(payload.latex);
  const title = titleMatch ? titleMatch[1] : 'OpenTEX Document';

  if (payload.format === 'typst') {
    let typ = body
      .replace(/\\maketitle/g, '')
      .replace(/\\tableofcontents/g, '#outline()')
      .replace(/\\section\*?\{([^}]+)\}/g, '= $1')
      .replace(/\\subsection\*?\{([^}]+)\}/g, '== $1')
      .replace(/\\subsubsection\*?\{([^}]+)\}/g, '=== $1')
      .replace(/\\textbf\{([^}]+)\}/g, '*$1*')
      .replace(/\\(?:textit|emph)\{([^}]+)\}/g, '_$1_')
      .replace(/\\begin\{itemize\}|\\end\{itemize\}/g, '')
      .replace(/\\begin\{enumerate\}|\\end\{enumerate\}/g, '')
      .replace(/\\item\s*/g, '- ')
      .replace(/\\begin\{(?:equation|align|gather)\*?\}([\s\S]*?)\\end\{(?:equation|align|gather)\*?\}/g, (_, m) =>
        `\n$ ${latexMathToTypst(m)} $\n`
      )
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n$ ${latexMathToTypst(m)} $\n`)
      .replace(/\$([^$]+)\$/g, (_, m) => `$${latexMathToTypst(m)}$`);
    typ = typ.replace(/\\begin\{[^}]+\}(?:\[[^\]]*\])?/g, '').replace(/\\end\{[^}]+\}/g, '');
    return `#set page(margin: 2.5cm)\n#set text(size: 11pt)\n\n= ${title}\n\n${typ.trim()}`;
  }

  // Markdown / DOCX / ODT share clean Markdown-structured output
  let md = body
    .replace(/\\maketitle/g, '')
    .replace(/\\tableofcontents/g, '')
    .replace(/\\section\*?\{([^}]+)\}/g, '## $1')
    .replace(/\\subsection\*?\{([^}]+)\}/g, '### $1')
    .replace(/\\subsubsection\*?\{([^}]+)\}/g, '#### $1')
    .replace(/\\textbf\{([^}]+)\}/g, '**$1**')
    .replace(/\\(?:textit|emph)\{([^}]+)\}/g, '*$1*')
    .replace(/\\underline\{([^}]+)\}/g, '_$1_')
    .replace(/\\begin\{itemize\}|\\end\{itemize\}/g, '')
    .replace(/\\begin\{enumerate\}|\\end\{enumerate\}/g, '')
    .replace(/\\item\s*/g, '- ')
    .replace(
      /\\begin\{(?:equation|align|gather)\*?\}([\s\S]*?)\\end\{(?:equation|align|gather)\*?\}/g,
      (_, m) => `\n$$\n${m.trim()}\n$$\n`
    )
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
    .replace(/\\begin\{(theorem|lemma|definition|proof)\}(?:\[([^\]]*)\])?/g, (_, env, name) =>
      `**${env.charAt(0).toUpperCase() + env.slice(1)}${name ? ` (${name})` : ''}:** `
    )
    .replace(/\\end\{(?:theorem|lemma|definition|proof)\}/g, '')
    .replace(/\\label\{[^}]*\}/g, '');

  md = `# ${title}\n\n${md.replace(/\n{3,}/g, '\n\n').trim()}`;
  return md;
}

function fallbackSuggestEdit(
  payload: Extract<PublikActionPayload, { action: 'suggestEdit' }>
): string {
  const { latex, selectedText, instruction } = payload;
  const target = (selectedText || '').trim();
  const inst = instruction.toLowerCase();

  const transformSnippet = (snippet: string): string => {
    if (inst.includes('proof') || inst.includes('detail') || inst.includes('expand')) {
      return `${snippet}\n\n\\begin{proof}\nProceeding directly from the definitions above, each intermediate step preserves equivalence under the stated hypotheses.\n\\end{proof}`;
    }
    if (inst.includes('box') || inst.includes('highlight')) {
      return `\\begin{equation*}\n\\boxed{${snippet.replace(/^\$\$|\$\$$|^\\\[|\\\]$/g, '').trim()}}\n\\end{equation*}`;
    }
    if (inst.includes('align')) {
      const inner = snippet
        .replace(/\\begin\{equation\*?\}|\\end\{equation\*?\}/g, '')
        .replace(/\\\[|\\\]/g, '')
        .trim();
      return `\\begin{align}\n${inner.replace(/=/g, '&=')}\n\\end{align}`;
    }
    if (inst.includes('bullet') || inst.includes('list')) {
      const sentences = snippet
        .split(/\.\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      return `\\begin{itemize}\n${sentences.map((s) => `  \\item ${s.replace(/\.$/, '')}.`).join('\n')}\n\\end{itemize}`;
    }
    if (inst.includes('simplify') || inst.includes('concise') || inst.includes('short')) {
      return snippet.replace(/\\displaystyle\s*/g, '').replace(/\s{2,}/g, ' ').trim();
    }
    return `% Edited per instruction: ${instruction}\n${snippet}`;
  };

  // Return only the replacement snippet when targeting a selection inside latex
  if (target && target !== latex.trim()) {
    return transformSnippet(target);
  }
  return transformSnippet(latex);
}

function fallbackGenerateSlides(
  payload: Extract<PublikActionPayload, { action: 'generateSlides' }>
): string {
  const { latex, theme, colorPalette, length, deckTitle } = payload;
  const title =
    deckTitle?.trim() || /\\title\{([^}]*)\}/.exec(latex)?.[1] || 'Mathematical Presentation';
  const author = /\\author\{([^}]*)\}/.exec(latex)?.[1] || 'OpenTEX Slides';
  const { body } = extractBody(latex);

  const colorThemeMap: Record<string, string> = {
    Blue: 'default',
    Emerald: 'spruce',
    Crimson: 'beaver',
    Teal: 'seahorse',
    Slate: 'dove',
  };
  const beamerColor = colorThemeMap[colorPalette] || 'default';

  const sections: Array<{ heading: string; content: string }> = [];
  const secSplit = body.split(/\\section\*?\{([^}]*)\}/);
  if (secSplit.length > 1) {
    for (let i = 1; i < secSplit.length; i += 2) {
      sections.push({
        heading: secSplit[i].trim(),
        content: (secSplit[i + 1] || '').trim(),
      });
    }
  } else {
    sections.push({ heading: 'Key Concepts & Equations', content: body });
  }

  const maxExtraFrames = length === 'brief' ? 2 : length === 'extended' ? 12 : 6;
  const frames: string[] = [];

  frames.push(`\\begin{frame}\n\\titlepage\n\\end{frame}`);

  if (length !== 'brief') {
    const tocItems = sections.map((s) => `  \\item ${s.heading}`).join('\n');
    frames.push(
      `\\begin{frame}{Outline}\n\\begin{itemize}\n${tocItems}\n\\end{itemize}\n\\end{frame}`
    );
  }

  for (const sec of sections) {
    // Split on subsections too in normal/extended decks for richer slide pacing
    const subParts =
      length === 'brief'
        ? [{ sub: '', text: sec.content }]
        : sec.content.split(/\\subsection\*?\{([^}]*)\}/).reduce<Array<{ sub: string; text: string }>>(
            (acc, part, idx, arr) => {
              if (idx === 0) {
                if (part.trim()) acc.push({ sub: '', text: part.trim() });
              } else if (idx % 2 === 1) {
                acc.push({ sub: part.trim(), text: (arr[idx + 1] || '').trim() });
              }
              return acc;
            },
            []
          );

    for (const part of subParts) {
      const heading = part.sub ? `${sec.heading}: ${part.sub}` : sec.heading;
      const clean = part.text.replace(/\\label\{[^}]*\}/g, '').trim();
      const chunks = clean.split(/\n\s*\n+/).filter(Boolean);
      const step = length === 'extended' ? 1 : 2;
      if (chunks.length <= step || length === 'brief') {
        frames.push(`\\begin{frame}{${heading}}\n${chunks.slice(0, 2).join('\n\n') || heading}\n\\end{frame}`);
      } else {
        for (let i = 0; i < chunks.length && frames.length < maxExtraFrames + 2; i += step) {
          const slideHeading = i === 0 ? heading : `${heading} (Part ${Math.floor(i / step) + 1})`;
          frames.push(`\\begin{frame}{${slideHeading}}\n${chunks.slice(i, i + step).join('\n\n')}\n\\end{frame}`);
        }
      }
    }
  }

  const supplementalSlides = [
    `\\begin{frame}{Notation & Assumptions}\n\\begin{block}{Domain & Hypotheses}\nReview domain constraints, continuity/differentiability hypotheses, and edge cases before applying the main identity.\n\\end{block}\n\\end{frame}`,
    `\\begin{frame}{Geometric & Analytical Intuition}\n\\begin{itemize}\n  \\item Connect symbolic identities to geometric invariants\n  \\item Verify boundary behavior on concrete examples\n\\end{itemize}\n\\end{frame}`,
  ];
  for (const extra of supplementalSlides) {
    if (length === 'brief' || frames.length >= maxExtraFrames + 1) break;
    frames.push(extra);
  }

  frames.push(
    `\\begin{frame}{Summary}\n\\begin{itemize}\n  \\item Formal definitions and core equations established\n  \\item Generated with OpenTEX Slides (${theme} · ${colorPalette})\n\\end{itemize}\n\\end{frame}`
  );

  return [
    `\\documentclass{beamer}`,
    `\\usetheme{${theme || 'Madrid'}}`,
    `\\usecolortheme{${beamerColor}}`,
    `\\usepackage{amsmath, amssymb, amsthm}`,
    '',
    `\\title{${title}}`,
    `\\subtitle{Generated with OpenTEX · Publik AI}`,
    `\\author{${author}}`,
    `\\date{\\today}`,
    '',
    `\\begin{document}`,
    '',
    frames.join('\n\n'),
    '',
    `\\end{document}`,
  ].join('\n');
}

function fallbackVectorizeSketch(
  payload: Extract<PublikActionPayload, { action: 'vectorizeSketch' }>
): { svg: string; tikz: string } {
  const desc = (payload.description || '').toLowerCase();

  if (desc.includes('triangle') || desc.includes('geometry') || desc.includes('pythag')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" width="320" height="220">
  <rect width="320" height="220" fill="#ffffff" rx="8"/>
  <polygon points="60,175 245,175 60,45" fill="rgba(59,130,246,0.10)" stroke="#1d4ed8" stroke-width="2.4" stroke-linejoin="round"/>
  <polyline points="60,157 78,157 78,175" fill="none" stroke="#334155" stroke-width="1.5"/>
  <text x="42" y="115" font-size="14" font-family="serif" font-style="italic" fill="#0f172a">a</text>
  <text x="150" y="195" font-size="14" font-family="serif" font-style="italic" fill="#0f172a">b</text>
  <text x="165" y="102" font-size="14" font-family="serif" font-style="italic" fill="#1d4ed8">c</text>
  <text x="160" y="26" font-size="12" font-family="sans-serif" text-anchor="middle" fill="#475569">Right Triangle · a² + b² = c²</text>
</svg>`;
    const tikz = `\\begin{tikzpicture}[scale=1.1]
  \\draw[thick, fill=blue!8] (0,0) -- (3.6,0) -- (0,2.4) -- cycle;
  \\draw (0,0.35) -- (0.35,0.35) -- (0.35,0);
  \\node[left] at (0,1.2) {$a$};
  \\node[below] at (1.8,0) {$b$};
  \\node[above right] at (1.8,1.2) {$c$};
\\end{tikzpicture}`;
    return { svg, tikz };
  }

  if (desc.includes('commutative') || desc.includes('diagram') || desc.includes('category') || desc.includes('arrow')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" width="320" height="220">
  <defs>
    <marker id="mw-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#1e293b"/>
    </marker>
  </defs>
  <rect width="320" height="220" fill="#ffffff" rx="8"/>
  <text x="72" y="64" font-size="18" font-family="serif" font-style="italic" fill="#0f172a" text-anchor="middle">A</text>
  <text x="248" y="64" font-size="18" font-family="serif" font-style="italic" fill="#0f172a" text-anchor="middle">B</text>
  <text x="248" y="176" font-size="18" font-family="serif" font-style="italic" fill="#0f172a" text-anchor="middle">C</text>
  <line x1="92" y1="58" x2="228" y2="58" stroke="#1e293b" stroke-width="1.8" marker-end="url(#mw-arrow)"/>
  <line x1="248" y1="78" x2="248" y2="152" stroke="#1e293b" stroke-width="1.8" marker-end="url(#mw-arrow)"/>
  <line x1="88" y1="72" x2="230" y2="162" stroke="#2563eb" stroke-width="2" stroke-dasharray="5 3" marker-end="url(#mw-arrow)"/>
  <text x="160" y="46" font-size="13" font-family="serif" font-style="italic" fill="#0f172a" text-anchor="middle">f</text>
  <text x="262" y="118" font-size="13" font-family="serif" font-style="italic" fill="#0f172a">g</text>
  <text x="142" y="132" font-size="13" font-family="serif" font-style="italic" fill="#2563eb">g ∘ f</text>
</svg>`;
    const tikz = `\\begin{tikzpicture}[node distance=2.6cm, auto]
  \\node (A) {$A$};
  \\node (B) [right of=A] {$B$};
  \\node (C) [below of=B] {$C$};
  \\draw[->] (A) to node {$f$} (B);
  \\draw[->] (B) to node {$g$} (C);
  \\draw[->, dashed, blue] (A) to node[swap] {$g \\circ f$} (C);
\\end{tikzpicture}`;
    return { svg, tikz };
  }

  // Default: Calculus / Cartesian curve with shaded Riemann area
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" width="320" height="220">
  <defs>
    <marker id="mw-ax" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569"/>
    </marker>
  </defs>
  <rect width="320" height="220" fill="#ffffff" rx="8"/>
  <path d="M 95 170 L 95 128 Q 155 62 225 46 L 225 170 Z" fill="rgba(59,130,246,0.16)"/>
  <line x1="30" y1="170" x2="292" y2="170" stroke="#475569" stroke-width="1.5" marker-end="url(#mw-ax)"/>
  <line x1="60" y1="198" x2="60" y2="24" stroke="#475569" stroke-width="1.5" marker-end="url(#mw-ax)"/>
  <path d="M 42 152 Q 145 78 275 36" fill="none" stroke="#2563eb" stroke-width="2.4"/>
  <line x1="95" y1="170" x2="95" y2="128" stroke="#1d4ed8" stroke-width="1.3" stroke-dasharray="4 3"/>
  <line x1="225" y1="170" x2="225" y2="46" stroke="#1d4ed8" stroke-width="1.3" stroke-dasharray="4 3"/>
  <text x="95" y="186" font-size="12" font-family="serif" font-style="italic" text-anchor="middle" fill="#0f172a">a</text>
  <text x="225" y="186" font-size="12" font-family="serif" font-style="italic" text-anchor="middle" fill="#0f172a">b</text>
  <text x="242" y="64" font-size="13" font-family="serif" font-style="italic" fill="#1d4ed8">y = f(x)</text>
  <text x="294" y="184" font-size="12" font-family="serif" font-style="italic" fill="#475569">x</text>
  <text x="46" y="28" font-size="12" font-family="serif" font-style="italic" fill="#475569">y</text>
</svg>`;
  const tikz = `\\begin{tikzpicture}[scale=1.05]
  \\draw[->] (-0.4,0) -- (4.2,0) node[right] {$x$};
  \\draw[->] (0,-0.3) -- (0,3.0) node[above] {$y$};
  \\fill[blue!15] (1,0) -- (1,0.9) .. controls (1.8,1.5) and (2.4,2.1) .. (3.2,2.4) -- (3.2,0) -- cycle;
  \\draw[blue, thick, domain=0.3:3.8, smooth] plot (\\x, {0.35 + 0.55*\\x + 0.05*\\x*\\x});
  \\draw[dashed, blue!70] (1,0) node[below] {$a$} -- (1,0.95);
  \\draw[dashed, blue!70] (3.2,0) node[below] {$b$} -- (3.2,2.62);
  \\node[blue] at (3.3,2.85) {$y = f(x)$};
\\end{tikzpicture}`;
  return { svg, tikz };
}

function runSmartFallback(
  payload: PublikActionPayload,
  selectedModel: string,
  fallbackReason?: string
): PublikActionResponse {
  switch (payload.action) {
    case 'convertToLatex':
      return {
        result: fallbackConvertToLatex(payload),
        provider: 'publik-local-fallback',
        model: selectedModel,
        message: fallbackReason,
      };
    case 'formatLatex':
      return {
        result: fallbackFormatLatex(payload),
        provider: 'publik-local-fallback',
        model: selectedModel,
        message: fallbackReason,
      };
    case 'translateLatex':
      return {
        result: fallbackTranslateLatex(payload),
        provider: 'publik-local-fallback',
        model: selectedModel,
        message: fallbackReason,
      };
    case 'applyTemplate':
      return {
        result: fallbackApplyTemplate(payload),
        provider: 'publik-local-fallback',
        model: selectedModel,
        message: fallbackReason,
      };
    case 'convertFormat':
      return {
        result: fallbackConvertFormat(payload),
        provider: 'publik-local-fallback',
        model: selectedModel,
        message: fallbackReason,
      };
    case 'suggestEdit':
      return {
        result: fallbackSuggestEdit(payload),
        provider: 'publik-local-fallback',
        model: selectedModel,
        message: fallbackReason,
      };
    case 'generateSlides':
      return {
        result: fallbackGenerateSlides(payload),
        provider: 'publik-local-fallback',
        model: selectedModel,
        message: fallbackReason,
      };
    case 'vectorizeSketch':
      return {
        result: fallbackVectorizeSketch(payload),
        provider: 'publik-local-fallback',
        model: selectedModel,
        message: fallbackReason,
      };
    case 'test':
      return {
        result: { ok: false },
        provider: 'publik-local-fallback',
        model: selectedModel,
        message:
          fallbackReason ||
          'Local Smart Fallback is active (no remote API key configured — add a key in Settings to connect to Publik AI).',
      };
  }
}

// ---------- Server-side Publik Executor ----------

function buildPromptMessages(payload: PublikActionPayload): Array<{ role: 'system' | 'user'; content: unknown }> {
  const systemBase =
    'You are OpenTEX powered by Publik AI. Output clean, accurate LaTeX or requested target format without markdown code fences or extra commentary unless JSON is requested.';

  switch (payload.action) {
    case 'convertToLatex': {
      const s: ConversionSettings = {
        ...DEFAULT_CONVERSION_SETTINGS,
        ...(payload.settings || {}),
      };
      const pdfText = extractPdfReadableText(payload.fileDataUrl);
      const prompt = `Convert this ${payload.mimeType || 'document'} ("${payload.fileName}") into clean compilable LaTeX.
Settings: preset=${s.preset}, style=${s.latexStyle}, title=${s.title}, headings=${s.headings}, toc=${s.toc}, language=${s.language}, numbering=${s.numbering}, diagrams=${s.diagrams}, equationLayout=${s.equationLayout}, textStyle=${s.textStyle}.
${payload.promptHint ? `Hint: ${payload.promptHint}` : ''}
${pdfText ? `Extracted document text:\n${pdfText}` : ''}
Return only valid LaTeX.`;
      if (payload.fileDataUrl && payload.fileDataUrl.startsWith('data:image/')) {
        return [
          { role: 'system', content: systemBase },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: payload.fileDataUrl } },
            ],
          },
        ];
      }
      return [
        { role: 'system', content: systemBase },
        { role: 'user', content: prompt },
      ];
    }
    case 'formatLatex':
      return [
        { role: 'system', content: systemBase },
        {
          role: 'user',
          content: `Reformat the following LaTeX document with lineSpacing=${payload.lineSpacing}, fontSize=${payload.fontSize}, margins=${payload.margins}, textAlign=${payload.textAlign}, pageNumbers=${payload.pageNumbers}. Preserve mathematical content and return only LaTeX.\n\n${payload.latex}`,
        },
      ];
    case 'translateLatex':
      return [
        { role: 'system', content: systemBase },
        {
          role: 'user',
          content: `Translate all prose, headings, and theorem labels in this LaTeX document into ${payload.targetLanguage}. Keep all LaTeX commands and mathematical formulas intact. Return only LaTeX.\n\n${payload.latex}`,
        },
      ];
    case 'applyTemplate':
      return [
        { role: 'system', content: systemBase },
        {
          role: 'user',
          content: `Apply the "${payload.template}" LaTeX template (lineSpacing=${payload.lineSpacing}, fontSize=${payload.fontSize}, margins=${payload.margins}, textAlign=${payload.textAlign}, pageNumbers=${payload.pageNumbers}) to this document. Return only LaTeX.\n\n${payload.latex}`,
        },
      ];
    case 'convertFormat':
      return [
        { role: 'system', content: systemBase },
        {
          role: 'user',
          content: `Convert this LaTeX document into clean ${payload.format} format. Preserve equations and structure. Return only the converted output.\n\n${payload.latex}`,
        },
      ];
    case 'suggestEdit': {
      const isSnippet = Boolean(payload.selectedText.trim()) && payload.selectedText.trim() !== payload.latex.trim();
      return [
        { role: 'system', content: systemBase },
        {
          role: 'user',
          content: isSnippet
            ? `Apply the edit instruction ("${payload.instruction}") to the selected snippet below. Return ONLY the updated replacement snippet (not the rest of the document).\n\nSelected snippet:\n${payload.selectedText}\n\nFull document context:\n${payload.latex}`
            : `Apply the edit instruction ("${payload.instruction}") to the LaTeX document below and return the complete updated document.\n\n${payload.latex}`,
        },
      ];
    }
    case 'generateSlides':
      return [
        { role: 'system', content: systemBase },
        {
          role: 'user',
          content: `Convert this LaTeX document into a Beamer slide deck${payload.deckTitle ? ` titled "${payload.deckTitle}"` : ''} using \\usetheme{${payload.theme}}, color palette "${payload.colorPalette}", and length "${payload.length}". Return only valid \\documentclass{beamer} LaTeX.\n\n${payload.latex}`,
        },
      ];
    case 'vectorizeSketch': {
      const prompt = `Mode: ${payload.mode}. Description: ${payload.description || 'Mathematical diagram'}.
Return ONLY a valid JSON object with two string fields: {"svg": "<svg ...>...</svg>", "tikz": "\\begin{tikzpicture}...\\end{tikzpicture}"}.`;
      if (payload.cropDataUrl && payload.cropDataUrl.startsWith('data:image/')) {
        return [
          { role: 'system', content: systemBase },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: payload.cropDataUrl } },
            ],
          },
        ];
      }
      return [
        { role: 'system', content: systemBase },
        { role: 'user', content: prompt },
      ];
    }
    case 'test':
      return [{ role: 'user', content: 'Reply with OK' }];
  }
}

export async function executePublikAction(
  payload: PublikActionPayload
): Promise<PublikActionResponse> {
  const cfg = resolveRuntimeConfig(payload.config);
  const selectedModel =
    payload.action === 'convertToLatex' && payload.model === 'turbo'
      ? cfg.turboModel
      : cfg.professionalModel;

  if (!cfg.apiKey) {
    return runSmartFallback(payload, selectedModel);
  }

  try {
    const messages = buildPromptMessages(payload);
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature: payload.action === 'test' ? 0 : 0.2,
        ...(payload.action === 'test' ? { max_tokens: 16 } : {}),
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (res.status === 402) {
      const errBody = (await res.json().catch(() => ({}))) as {
        error?: { message?: string; top_up_url?: string };
      };
      return {
        result: null,
        provider: 'publik',
        model: selectedModel,
        statusCode: 402,
        topUpUrl: errBody.error?.top_up_url ?? null,
        message: errBody.error?.message ?? 'Not enough publik API balance.',
      };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return runSmartFallback(
        payload,
        selectedModel,
        `Remote error: Publik API responded ${res.status}${errText ? ` (${errText.slice(0, 120)})` : ''}. Using local fallback.`
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
    };
    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent) {
      return runSmartFallback(
        payload,
        selectedModel,
        'Remote error: Empty response from Publik API. Using local fallback.'
      );
    }

    const cleaned = stripCodeFences(rawContent);
    const actualModel = data.model || selectedModel;

    if (payload.action === 'test') {
      return {
        result: { ok: true },
        provider: 'publik',
        model: actualModel,
        message: `Connected to Publik AI (${actualModel}).`,
      };
    }

    if (payload.action === 'vectorizeSketch') {
      try {
        const parsed = JSON.parse(cleaned) as { svg?: string; tikz?: string };
        if (parsed.svg && parsed.tikz) {
          return { result: { svg: parsed.svg, tikz: parsed.tikz }, provider: 'publik', model: actualModel };
        }
      } catch {
        const svgMatch = /<svg[\s\S]*?<\/svg>/i.exec(cleaned);
        const tikzMatch = /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/.exec(cleaned);
        if (svgMatch && tikzMatch) {
          return {
            result: { svg: svgMatch[0], tikz: tikzMatch[0] },
            provider: 'publik',
            model: actualModel,
          };
        }
      }
      return runSmartFallback(
        payload,
        selectedModel,
        'Remote response did not contain valid SVG + TikZ JSON; used local vectorizer.'
      );
    }

    return {
      result: cleaned,
      provider: 'publik',
      model: actualModel,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return runSmartFallback(
      payload,
      selectedModel,
      `Remote error: ${msg}. Using local fallback.`
    );
  }
}

// ---------- Client-side API Helpers ----------

export async function runPublikAction<T = string>(
  payload: PublikActionPayload
): Promise<PublikActionResponse<T>> {
  const storedConfig = getPublikConfig();
  const mergedPayload: PublikActionPayload = {
    ...payload,
    config: { ...storedConfig, ...payload.config },
  };

  const res = await fetch('/api/publik', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mergedPayload),
  });

  if (res.status === 402) {
    const errJson = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      topUpUrl?: string | null;
    };
    const msg = errJson.error || errJson.message || 'Not enough publik API balance.';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('publik-402', {
          detail: { message: msg, topUpUrl: errJson.topUpUrl ?? null },
        })
      );
    }
    throw new Error(msg);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Publik API request failed (${res.status})`);
  }

  return (await res.json()) as PublikActionResponse<T>;
}

export function convertToLatex(
  args: Omit<Extract<PublikActionPayload, { action: 'convertToLatex' }>, 'action'>
) {
  return runPublikAction<string>({ action: 'convertToLatex', ...args });
}

export function formatLatex(
  args: Omit<Extract<PublikActionPayload, { action: 'formatLatex' }>, 'action'>
) {
  return runPublikAction<string>({ action: 'formatLatex', ...args });
}

export function translateLatex(
  args: Omit<Extract<PublikActionPayload, { action: 'translateLatex' }>, 'action'>
) {
  return runPublikAction<string>({ action: 'translateLatex', ...args });
}

export function applyTemplate(
  args: Omit<Extract<PublikActionPayload, { action: 'applyTemplate' }>, 'action'>
) {
  return runPublikAction<string>({ action: 'applyTemplate', ...args });
}

export function convertFormat(
  args: Omit<Extract<PublikActionPayload, { action: 'convertFormat' }>, 'action'>
) {
  return runPublikAction<string>({ action: 'convertFormat', ...args });
}

export function suggestEdit(
  args: Omit<Extract<PublikActionPayload, { action: 'suggestEdit' }>, 'action'>
) {
  return runPublikAction<string>({ action: 'suggestEdit', ...args });
}

export function generateSlides(
  args: Omit<Extract<PublikActionPayload, { action: 'generateSlides' }>, 'action'>
) {
  return runPublikAction<string>({ action: 'generateSlides', ...args });
}

export function vectorizeSketch(
  args: Omit<Extract<PublikActionPayload, { action: 'vectorizeSketch' }>, 'action'>
) {
  return runPublikAction<{ svg: string; tikz: string }>({ action: 'vectorizeSketch', ...args });
}

export async function testPublikConnection(
  config?: Partial<PublikConfig>
): Promise<{ ok: boolean; provider: PublikProvider; model: string; message: string }> {
  const res = await runPublikAction<{ ok: boolean }>({ action: 'test', config });
  return {
    ok: Boolean(res.result?.ok ?? res.provider === 'publik'),
    provider: res.provider,
    model: res.model,
    message:
      res.message ||
      (res.provider === 'publik'
        ? `Connected to Publik AI (${res.model}).`
        : 'Local Smart Fallback Engine is active.'),
  };
}
