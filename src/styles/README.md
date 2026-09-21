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
