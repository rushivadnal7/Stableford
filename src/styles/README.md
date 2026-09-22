# Theme guide

Every colour, font, size, weight, space, radius, shadow and motion value comes from this folder.
Components never contain a raw value, and a test fails if one sneaks in.

## The layers

| File | Holds | Change it when |
|---|---|---|
| `tokens.css` | Raw values: the brand palette, type scale, spacing, radii, shadows, gradients, easings | A brand colour, a size or a spacing value changes |
| `theme.css` | Meaning: colour **roles** (`bg`, `fg`, `action`, ...) for the light and dark themes | You want a role to look different, or need a new role |
| `utilities.css` | Named building blocks: `type-h2`, `type-eyebrow`, `container-page`, `section-y`, ... | You need a new text style or layout block |
| `motion.css` | The scroll-reveal behaviour | Reveal timing or distance changes (values are in `tokens.css`) |
| `hero.css` | The home page's scroll-driven 3D story: the runway, the pinned screen, the capsule mask | You change the hero's layout (see the root README's "The hero's 3D story") |
| `base.css` | Element defaults: body, focus ring, selection, reduced motion | Rarely |
| `../lib/fonts.ts` | The three typefaces | You swap a font |

Components then use only names from `theme.css` and `utilities.css`:

```tsx
<section data-theme="dark" className="section-y bg-canvas text-fg">
  <h2 className="type-h2">Give a little <em className="type-serif text-accent-text">more</em></h2>
  <p className="type-lead">...</p>
</section>
```

## Common changes

- **A brand colour changes:** edit the `--palette-*` value in `tokens.css`. Hover states and muted text are
  `color-mix()` of palette values, so they follow. Run `npm test`: the contrast tests tell you if a role stopped
  being readable.
- **A different font:** change the import in `src/lib/fonts.ts`. Keep the `variable` name.
- **Bigger or smaller text:** edit the `--text-*` scale in `tokens.css`. Every `type-*` style reads from it.
- **Tighter or looser layout:** edit `--spacing-section`, `--spacing-gutter` or `--container-page`.
- **A new colour role** (say `--info`): add it to **both** themes in `theme.css`, add its line to `@theme inline`,
  and add its contrast pairs to `theme.test.ts`. The test fails until all three agree.
- **A dark panel on a light page:** put `data-theme="dark"` on it (or use `<Section tone="dark">`, `<Panel>`).
  Everything inside re-themes itself.
- **A site-wide dark mode:** map `:root` to the dark values inside a `prefers-color-scheme` block or a
  `data-theme` on `<html>`. No component changes.

## Rules

1. No hex, `rgb()`, `oklch()` or Tailwind default colours (`bg-red-500`) outside this folder.
2. No arbitrary sizes (`p-[13px]`, `text-[17px]`). Use the spacing and type scales.
3. Use a **role** (`text-fg-muted`), never a palette name. The palette variables are private to `theme.css`.
4. `--accent` and `--warm` are for decoration (fills, dots, lines). For text use `--accent-text`, which is tuned
   to pass contrast in each theme.
5. Choose a heading level for meaning and a `type-*` style for looks; they are independent (`<Heading as="h2" variant="h3">`).
6. Variants live with the component (`cva` in `components/ui`), not in pages.

`theme.test.ts` enforces 1 to 3 and checks WCAG contrast for every role pair in both themes.

## Responsive: mobile first

Write the phone layout first, then add `sm:`, `md:`, `lg:` only to *enlarge*. Never `max-*:` and never a
`@media (max-width)`; a test fails if one appears.

| Breakpoint | Width | Typical change |
|---|---|---|
| (none) | 0 and up | The base layout: one column, stacked |
| `xs` | 400px | Room for a second button beside the first |
| `sm` | 640px | Two columns for small cards |
| `md` | 768px | Tablet: two columns for content, desktop nav starts to fit |
| `lg` | 1024px | Laptop: full split layouts, desktop nav |
| `xl` / `2xl` | 1280px / 1536px | Wider gutters; the content stops growing at `--container-page` |

Consistency comes from a small set of pieces. Reach for these before writing any margin or grid by hand:

- **Layout primitives** in `components/ui/layout.tsx`: `Stack` (vertical rhythm), `Cluster` (wrapping row),
  `Grid` (`cols` 1 to 4) and `Split` (two columns at `lg`, with a `ratio`). They are the only files allowed to contain
  `grid-cols-*` or `col-span-*`, so every page collapses the same way.
- **`Section` and `Panel`** in `components/ui/section.tsx`: the page rhythm, gutter and header spacing.
- **Fluid spacing tokens** (`--spacing-gutter`, `section`, `inset`, `block`, `grid`, `split`, `card`, `panel`): each is a
  `clamp()`, so spacing scales smoothly with the screen and never needs a breakpoint.
- **Fluid type**: every `type-*` style is a `clamp()` too, so headings shrink on a phone without a media query.
- **Tap targets**: anything you tap is at least `h-touch` (`--spacing-touch`, 44px). Links inside a sentence are exempt.

`npm run build && npm run test:responsive` opens the production site in real Chrome at nine widths (320 to 1920) and
fails on sideways scrolling, elements sticking out of the screen, tap targets under 44px, text under 12px and
headings that overflow. It writes a full-page screenshot per width to `tests/responsive/out/` for a quick look.
`node tests/responsive/check.mjs --selftest` proves the checks can fail by auditing a deliberately broken page.
