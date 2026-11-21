import type { Metadata } from "next";
import { JetBrains_Mono, Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { PublikGate } from "@/components/publik/PublikGate";
import { appToken } from "@/lib/publik-sdk";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const newsreaderSerif = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "OpenTEX: Convert your notes to LaTeX in seconds",
  description:
    "OpenTEX is a 100% free AI-powered workspace powered by Publik AI that converts handwritten math, physics, or engineering notes and PDFs to LaTeX in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialHasAppToken = appToken().startsWith("pat_");
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jakartaSans.variable} ${newsreaderSerif.variable} ${jetbrainsMono.variable} bg-[#F5F5F7] font-sans text-[#1D1D1F] antialiased selection:bg-[#0071E3]/15 selection:text-[#1D1D1F]`}
      >
        <PublikGate initialHasAppToken={initialHasAppToken}>{children}</PublikGate>
      </body>
    </html>
  );
}
