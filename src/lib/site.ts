export const SITE = {
  name: 'Stableford',
  tagline: 'Play for something bigger',
  description:
    'Log your golf scores, join a monthly prize draw and fund a charity you choose. A share of every subscription goes to your cause.',
} as const;

/**
 * Browsers need a literal colour for the address-bar tint, so it cannot come from a CSS variable.
 * src/styles/theme.test.ts checks it still equals --palette-bright in tokens.css.
 */
export const THEME_COLOR = '#f6f2f1';
