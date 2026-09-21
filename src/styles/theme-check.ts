/**
 * Test helpers for the theme: read the real CSS, resolve variables and color-mix() the way a browser does,
 * and measure contrast. Only imported by tests; nothing here ships to the browser.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export type Vars = Record<string, string>;
export type RGB = [number, number, number]; // sRGB, 0..1

const ROOT = process.cwd();

export function read(relative: string): string {
  return readFileSync(path.join(ROOT, relative), 'utf8');
}

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

function declarations(body: string): Vars {
  const out: Vars = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim().replace(/\s+/g, ' ');
  return out;
}

/** The raw palette: the first :root block in tokens.css. */
export function paletteVars(): Vars {
  const match = stripComments(read('src/styles/tokens.css')).match(/:root\s*\{([^{}]*)\}/);
  if (!match) throw new Error('tokens.css has no :root block');
  return declarations(match[1]!);
}

/** The roles of each theme, and the list of roles Tailwind is told about. */
export function themeScopes(): { light: Vars; dark: Vars; inline: Vars } {
  const css = stripComments(read('src/styles/theme.css'));
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1]!.trim().replace(/\s+/g, ' '),
    vars: declarations(m[2]!),
  }));
  const pick = (test: (selector: string) => boolean, what: string) => {
    const rule = rules.find((r) => test(r.selector));
    if (!rule) throw new Error(`theme.css has no ${what} block`);
    return rule.vars;
  };
  return {
    light: pick((s) => s.includes("[data-theme='light']"), 'light theme'),
    dark: pick((s) => s === "[data-theme='dark']", 'dark theme'),
    inline: pick((s) => s.startsWith('@theme inline'), '@theme inline'),
  };
}

// ---------------------------------------------------------------------------------------------
// Colour maths
// ---------------------------------------------------------------------------------------------
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => {
  const v = Math.max(0, Math.min(1, c));
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
};

function toOklab([r, g, b]: RGB): RGB {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]: RGB): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += ch;
  }
  parts.push(current.trim());
  return parts;
}

const NAMED: Record<string, RGB> = { white: [1, 1, 1], black: [0, 0, 0] };

/** Resolve a CSS value made of hex, var(--x) and color-mix(in oklab, ...) to an sRGB colour. */
export function resolveColor(value: string, vars: Vars, depth = 0): RGB {
  const v = value.trim();
  if (depth > 25) throw new Error(`Circular variable reference near "${value}"`);

  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1]!.slice(i, i + 2), 16) / 255) as RGB;

  if (NAMED[v]) return NAMED[v]!;

  const ref = v.match(/^var\((--[\w-]+)\)$/);
  if (ref) {
    const next = vars[ref[1]!];
    if (next === undefined) throw new Error(`Undefined variable ${ref[1]}`);
    return resolveColor(next, vars, depth + 1);
  }

  if (v.startsWith('color-mix(') && v.endsWith(')')) {
    const [space, first, second] = splitTopLevel(v.slice('color-mix('.length, -1));
    if (space !== 'in oklab' || !first || !second) throw new Error(`Only "color-mix(in oklab, a p%, b)" is supported: ${v}`);
    const stop = (arg: string) => {
      const m = arg.match(/^(.*?)(?:\s+(\d+(?:\.\d+)?)%)?$/)!;
      return { color: m[1]!, pct: m[2] === undefined ? undefined : Number(m[2]) };
    };
    const a = stop(first);
    const b = stop(second);
    const pa = a.pct ?? (b.pct === undefined ? 50 : 100 - b.pct);
    const t = pa / (pa + (b.pct ?? 100 - pa));
    const [ca, cb] = [toOklab(resolveColor(a.color, vars, depth + 1)), toOklab(resolveColor(b.color, vars, depth + 1))];
    return fromOklab([0, 1, 2].map((i) => ca[i]! * t + cb[i]! * (1 - t)) as RGB);
  }

  throw new Error(`Cannot evaluate colour "${v}"`);
}

const luminance = ([r, g, b]: RGB) => 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [Math.max(luminance(a), luminance(b)), Math.min(luminance(a), luminance(b))];
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------------------------
// Source scanning
// ---------------------------------------------------------------------------------------------
export function sourceFiles(dirs: string[], extensions = ['.ts', '.tsx', '.css']): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(path.join(ROOT, dir))) {
      const relative = `${dir}/${name}`;
      if (statSync(path.join(ROOT, relative)).isDirectory()) walk(relative);
      else if (extensions.some((e) => name.endsWith(e)) && !name.endsWith('.test.ts')) out.push(relative);
    }
  };
  dirs.forEach(walk);
  return out;
}
