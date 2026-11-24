# OpenTEX

Convert handwritten math notes, textbook pages, and PDFs into clean, compilable LaTeX, Beamer slide decks, Word/Typst/Markdown exports, and TikZ diagrams, 100% free and powered by Publik AI.

## Running Locally

```bash
npm install
npm run dev
```

Or build and start the production server:

```bash
npm run build
npm run start
```

## publik API
- Base URL: https://publikhq.com/api/v1 (OpenAI Chat Completions, Responses, Anthropic Messages)
- Models: publik-fast, publik-balanced, publik-smart or a vendor/model name from GET /models; never a bare model name
- Sign in with publik: the publik module's gate runs at start-up, before the first screen; it also sends usage telemetry
- Key: per-install `pk_` from POST /installs, stored in that visitor's `publik_cred` cookie. Do not cache it in module scope or `/tmp` (warm serverless instances are shared). A key typed in Settings wins over env `PUBLIK_API_KEY`; the env key is only the fallback when the visitor has not set one
- App token: publik-app-token.txt (public app id `pat_`, committed by design) or `PUBLIK_APP_TOKEN`. It is not a visitor secret
- 402: show error.message + error.top_up_url only
- Show use: GET /wallet used_percent or prepaid_remaining_percent, never money
- Never print or log a key
- Docs: https://publikhq.com/llms.txt, https://publikhq.com/developers, https://publikhq.com/skills/api.md
