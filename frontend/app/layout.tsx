import './globals.css';
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter, Plus_Jakarta_Sans } from 'next/font/google';
import LiquidBackdrop from './components/LiquidBackdrop';

/**
 * Self-hosted and subset by next/font. This replaces two @font-face rules that
 * hotlinked content-hashed .woff2 files straight off adchitects.co — a third
 * party's CDN, which would break on their next deploy — and a render-blocking
 * Google Fonts @import. It also fixes the real blocker on visual hierarchy:
 * only weight 400 was ever loaded, so bold headings were browser-synthesised.
 */
const geist = Geist({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-body',
  display: 'swap',
});

/* Dashboard display face. Geometric with heavy, wide numerals — the reference
   design leans on very large figures, and Inter's numerals read too narrow at
   that size. Weight 800 is what carries the "$ 56,874" treatment. */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

/* The UI leans on `font-mono` for labels and metadata; left on the system mono
   stack it would be the one family that still looked untouched. */
const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'InvoNest | AI Cash Flow Intelligence & Invoice Recovery',
  description: 'Predict cash flow before it becomes a problem. Auto-assess risk, parse documents via OCR, and run digital twin simulations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${geist.variable} ${inter.variable} ${geistMono.variable} ${jakarta.variable}`}
    >
      {/* No dark:bg-* here — the fixed <LiquidBackdrop> supplies the page
          background, and a solid colour would paint straight over it. */}
      <body className="antialiased min-h-screen text-[#0d2227] dark:text-zinc-100 transition-colors duration-300">
        <LiquidBackdrop />
        {children}
      </body>
    </html>
  );
}
