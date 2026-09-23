/** Every link target in one place, so pages and navigation never disagree. */
export const ROUTES = {
  home: '/',
  signup: '/signup',
  login: '/login',
  charities: '/charities',
  dashboard: '/dashboard',
  admin: '/admin',
} as const;

/** A charity's own page: /charities/the-slug. */
export const charityHref = (slug: string) => `${ROUTES.charities}/${slug}`;

/** In-page anchors on the home page. Each id is set on its section in components/home. */
export const ANCHORS = {
  how: '#how-it-works',
  split: '#where-it-goes',
  prizes: '#prizes',
  charities: '#charities',
  pricing: '#pricing',
  faq: '#faq',
} as const;

export function signupHref(plan?: 'monthly' | 'yearly', charitySlug?: string): string {
  const params = new URLSearchParams();
  if (plan) params.set('plan', plan);
  if (charitySlug) params.set('charity', charitySlug);
  const qs = params.toString();
  return qs ? `${ROUTES.signup}?${qs}` : ROUTES.signup;
}
