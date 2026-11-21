# OpenTEX

Open-source AI LaTeX workspace that converts handwritten math, physics, and engineering notes or PDFs into clean LaTeX, Beamer slide decks, Word/OpenDocument/Typst/Markdown files, and TikZ vector diagrams.

## Overview

OpenTEX includes an image, PDF, and sketchpad workspace at `/app` with a resizable split LaTeX editor and live KaTeX preview, 6 syntax highlighting palettes, Classic/Tagged/Boxed theorem styles, `.tex` and PDF downloads, and one-click Open in Overleaf export.

The Beamer generator at `/app/slides` turns notes into structured slide decks across 6 themes and 5 palettes, while `/app/tools` adds Format, Translate, Templates, Convert (`.docx`, `.odt`, `.typ`, `.md`), AI Suggestions, and Sketch-to-SVG/TikZ tools. Folder-wide conversions run through the `/api/mcp` endpoint for Claude Code, Codex, Cursor, or Claude Desktop, and the `publik` module connects sign-in, usage counting, and tier models (`publik-smart` and `publik-fast`) alongside user-provided OpenAI-compatible keys.

## Quick Start

```bash
npm install
npm run build
npm run start
```
