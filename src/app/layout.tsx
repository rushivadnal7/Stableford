import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { fontVariables } from '@/lib/fonts';
import { SITE, THEME_COLOR } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { title: `${SITE.name}: ${SITE.tagline}`, description: SITE.description, siteName: SITE.name, type: 'website' },
};

// viewport-fit=cover lets the page use the full screen on notched phones; the pt-safe / pb-safe utilities
// keep content clear of the notch and home indicator.
export const viewport: Viewport = { themeColor: THEME_COLOR, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="bg-canvas text-fg antialiased">
        <a
          href="#main"
          className="sr-only rounded-pill bg-action px-4 py-2 type-label text-on-action focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-overlay"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
