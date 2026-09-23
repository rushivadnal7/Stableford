/** Copy for the public charity directory and a single charity's page. */

export const CHARITIES_PAGE = {
  eyebrow: 'Charities',
  title: { before: 'Every charity we ', accent: 'back' },
  lead: 'These are the causes members are giving to right now. Pick one during signup, and change it any time.',
  searchPlaceholder: 'Search charities…',
  allCategories: 'All categories',
  empty: 'No charities match that search.',
  emptyAll: 'Charities are being added — check back soon.',
  cta: 'Subscribe and support this charity',
} as const;

export const CHARITY_DETAIL = {
  back: 'All charities',
  eventsTitle: 'Upcoming events',
  noEvents: 'No events scheduled right now.',
  cta: 'Subscribe with this charity',
  featured: 'Featured',
  donate: {
    title: 'Make a one-off donation',
    lead: (name: string) => `Give directly to ${name}, no subscription required.`,
    signInLead: (name: string) => `Sign in to send a one-off donation straight to ${name}.`,
    signInCta: 'Sign in to donate',
    amountLabel: 'Amount',
    customLabel: 'Or enter your own amount (USD)',
    cta: (dollars: number) => `Donate $${dollars}`,
  },
} as const;
