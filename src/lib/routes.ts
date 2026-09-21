/** Every link target in one place, so pages and navigation never disagree. */
export const ROUTES = {
  home: '/',
  signup: '/signup',
  login: '/login',
  charities: '/charities',
  dashboard: '/dashboard',
} as const;

/** In-page anchors on the home page. Each id is set on its section in components/home. */
export const ANCHORS = {
  how: '#how-it-works',
  split: '#where-it-goes',
  prizes: '#prizes',
  charities: '#charities',
  pricing: '#pricing',
  faq: '#faq',
} as const;

export const signupHref = (plan?: 'monthly' | 'yearly') => (plan ? `${ROUTES.signup}?plan=${plan}` : ROUTES.signup);
