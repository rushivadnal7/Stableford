import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { fontVariables } from '@/lib/fonts';
import { SITE, THEME_COLOR } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { title: `${SITE.name}: ${SITE.tagline}`, description: SITE.description, siteName: SITE.name, type: 'website' },
};

export const viewport: Viewport = { themeColor: THEME_COLOR };

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
        {children}
      </body>
    </html>
  );
}
