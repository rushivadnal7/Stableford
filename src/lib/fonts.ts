import { Geist_Mono, Instrument_Sans, Instrument_Serif } from 'next/font/google';

/**
 * The three typefaces. next/font downloads them at build time and serves them from our own domain
 * (no layout shift, no third-party request). Each exposes a CSS variable that tokens.css maps to
 * --font-sans, --font-display and --font-mono, so to change a font, change it here only.
 */
export const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument-sans', display: 'swap' });

export const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });

/** Put on <html> so every variable is available to the whole document. */
export const fontVariables = [sans.variable, display.variable, mono.variable].join(' ');
