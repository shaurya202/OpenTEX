import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="border-t border-[#D2D2D7] bg-white text-[#6E6E73]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link href="/" className="inline-flex items-center gap-2 text-base font-semibold text-[#1D1D1F]">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1D1D1F] font-serif text-sm font-semibold text-white">
                &part;
              </span>
              <span>
                Open<span className="text-[#0071E3]">TEX</span>
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-[#6E6E73]">
              Open-source LaTeX studio for converting handwritten math notes, scans, and PDFs into compilable TeX, Beamer slides, and TikZ diagrams.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-7 md:justify-items-end">
            <div>
              <h3 className="text-xs font-semibold text-[#1D1D1F]">Product</h3>
              <ul className="mt-3 space-y-2 text-xs">
                <li>
                  <a href="#workflow" className="hover:text-[#1D1D1F]">
                    Workflow
                  </a>
                </li>
                <li>
                  <a href="#toolkit" className="hover:text-[#1D1D1F]">
                    Tools
                  </a>
                </li>
                <li>
                  <a href="#presentations" className="hover:text-[#1D1D1F]">
                    Beamer Slides
                  </a>
                </li>
                <li>
                  <a href="#mcp" className="hover:text-[#1D1D1F]">
                    MCP
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-[#1D1D1F]">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[#1D1D1F]">Workspace</h3>
              <ul className="mt-3 space-y-2 text-xs">
                <li>
                  <Link href="/app" className="hover:text-[#1D1D1F]">
                    Convert Notes
                  </Link>
                </li>
                <li>
                  <Link href="/app/slides" className="hover:text-[#1D1D1F]">
                    Slides
                  </Link>
                </li>
                <li>
                  <Link href="/app/conversions" className="hover:text-[#1D1D1F]">
                    My Conversions
                  </Link>
                </li>
                <li>
                  <Link href="/app/tools" className="hover:text-[#1D1D1F]">
                    Tools
                  </Link>
                </li>
                <li>
                  <Link href="/app/communities" className="hover:text-[#1D1D1F]">
                    Communities
                  </Link>
                </li>
                <li>
                  <Link href="/app/settings" className="hover:text-[#1D1D1F]">
                    Settings
                  </Link>
                </li>
                <li>
                  <Link href="/app/mcp-guide" className="hover:text-[#1D1D1F]">
                    MCP Guide
                  </Link>
                </li>
                <li>
                  <Link href="/app/help" className="hover:text-[#1D1D1F]">
                    Help &amp; Tips
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-[#E5E5EA] pt-5 text-xs text-[#8E8E93] sm:flex-row">
          <span>&copy; 2026 OpenTEX &middot; MIT License</span>
          <span>Powered by Publik AI</span>
        </div>
      </div>
    </footer>
  );
}
