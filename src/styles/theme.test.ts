import { describe, expect, it } from 'vitest';
import { THEME_COLOR } from '@/lib/site';
import { contrast, paletteVars, read, resolveColor, sourceFiles, themeScopes, type Vars } from './theme-check';

const palette = paletteVars();
const { light, dark, inline } = themeScopes();

describe('palette', () => {
  it('holds the brand colours', () => {
    expect(palette).toMatchObject({
      '--palette-bokara': '#2a2725',
      '--palette-hunter': '#3a4a3f',
      '--palette-lime': '#91a673',
      '--palette-sand': '#ae8f60',
      '--palette-whisper': '#eae2d3',
      '--palette-bright': '#f6f2f1',
    });
  });

  it('keeps the browser theme colour in step with the page background', () => {
    expect(THEME_COLOR).toBe(palette['--palette-bright']);
  });
});

describe('theme roles', () => {
  it('defines the same roles in the light and dark themes', () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
  });

  it('gives Tailwind a colour utility for every role, and nothing that does not exist', () => {
    const exposed = Object.values(inline).map((v) => v.match(/^var\((--[\w-]+)\)$/)?.[1]);
    expect(exposed.every(Boolean)).toBe(true);
    expect(new Set(exposed)).toEqual(new Set(Object.keys(light)));
  });
});

/** [foreground, background, minimum WCAG ratio]. 4.5 is AA for text, 3 is AA for UI outlines. */
const PAIRS: Array<[string, string, number]> = [
  ['--fg', '--bg', 7],
  ['--fg', '--bg-alt', 4.5],
  ['--fg', '--surface', 4.5],
  ['--fg-muted', '--bg', 4.5],
  ['--fg-muted', '--bg-alt', 4.5],
  ['--fg-muted', '--surface', 4.5],
  ['--accent-text', '--bg', 4.5],
  ['--accent-text', '--bg-alt', 4.5],
  ['--accent-text', '--surface', 4.5],
  ['--on-action', '--action', 4.5],
  ['--on-action', '--action-hover', 4.5],
  ['--on-accent', '--accent', 4.5],
  ['--on-accent', '--warm', 4.5],
  ['--success', '--bg', 4.5],
  ['--success', '--surface', 4.5],
  ['--danger', '--bg', 4.5],
  ['--danger', '--surface', 4.5],
  ['--ring', '--bg', 3],
  ['--ring', '--bg-alt', 3],
  ['--ring', '--surface', 3],
];

describe.each([
  ['light', light],
  ['dark', dark],
] as Array<[string, Vars]>)('%s theme contrast (WCAG)', (_name, scope) => {
  const vars = { ...palette, ...scope };
  it.each(PAIRS)('%s on %s is at least %s:1', (fg, bg, min) => {
    const ratio = contrast(resolveColor(`var(${fg})`, vars), resolveColor(`var(${bg})`, vars));
    expect(ratio, `${fg} on ${bg} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
  });
});

/**
 * The guard that makes "single source of truth" real: components and pages may only use theme names.
 * Raw colours, arbitrary pixel sizes and Tailwind's default palette are all rejected.
 */
describe('components use tokens, not raw values', () => {
  const files = sourceFiles(['src/components', 'src/app']);
  const contents = files.map((file) => ({ file, text: read(file) }));

  const offenders = (pattern: RegExp) =>
    contents.flatMap(({ file, text }) => [...text.matchAll(pattern)].map((m) => `${file}: ${m[0]}`));

  it('scans real files', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it('has no raw colour values', () => {
    expect(offenders(/(?<![\w&/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)).toEqual([]);
    expect(offenders(/\b(?:rgba?|hsla?|oklch|oklab|lch)\(/g)).toEqual([]);
  });

  it('has no arbitrary pixel, rem or em sizes in class names', () => {
    expect(offenders(/\b[a-z-]+-\[[^\]\s]*\d(?:px|rem|em)[^\]\s]*\]/g)).toEqual([]);
  });

  it("does not use Tailwind's default colour names", () => {
    const families = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black';
    expect(offenders(new RegExp(`\\b(?:bg|text|border|ring|fill|stroke|from|via|to|shadow|outline|divide|decoration)-(?:${families})(?:-\\d{2,3})?\\b`, 'g'))).toEqual([]);
  });

  it('never reaches for the raw palette variables', () => {
    expect(offenders(/var\(--palette-/g)).toEqual([]);
  });
});

/** The site is mobile first. These rules keep every page and section built the same way. */
describe('responsive rules', () => {
  const files = sourceFiles(['src/components', 'src/app']).map((file) => ({ file, text: read(file) }));
  const offenders = (pattern: RegExp, skip: (file: string) => boolean = () => false) =>
    files.filter((f) => !skip(f.file)).flatMap(({ file, text }) => [...text.matchAll(pattern)].map((m) => `${file}: ${m[0]}`));

  it('writes the phone layout first and only enlarges: no max-* variants, arbitrary breakpoints or media queries', () => {
    expect(offenders(/\bmax-(?:xs|sm|md|lg|xl|2xl):/g)).toEqual([]);
    expect(offenders(/\b(?:min|max)-\[[^\]]+\]:/g)).toEqual([]);
    expect(offenders(/@media[^{]*(?:max-width|min-width)/g)).toEqual([]);
  });

  it('keeps responsive columns inside the layout primitives (Stack, Cluster, Grid, Split)', () => {
    const inLayout = (file: string) => file === 'src/components/ui/layout.tsx';
    expect(offenders(/\b(?:(?:xs|sm|md|lg|xl|2xl):)?(?:grid-cols|col-span|grid-rows)-\S+/g, inLayout)).toEqual([]);
  });

  it('defines breakpoints in rem, in ascending order', () => {
    const tokens = read('src/styles/tokens.css');
    const found = [...tokens.matchAll(/--breakpoint-(\w+):\s*([\d.]+)rem;/g)].map((m) => [m[1]!, Number(m[2])] as const);
    expect(found.map(([name]) => name)).toEqual(['xs', 'sm', 'md', 'lg', 'xl', '2xl']);
    const widths = found.map(([, rem]) => rem);
    expect(widths).toEqual([...widths].sort((a, b) => a - b));
  });

  it('has the fluid rhythm tokens that layouts depend on', () => {
    const tokens = read('src/styles/tokens.css');
    for (const name of ['gutter', 'section', 'inset', 'block', 'grid', 'split', 'card', 'panel', 'touch']) {
      expect(tokens, `missing --spacing-${name}`).toMatch(new RegExp(`--spacing-${name}:`));
    }
    expect(tokens).toMatch(/--spacing-touch:\s*2\.75rem/); // 44px minimum tap size
  });
});
