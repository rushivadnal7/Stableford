/**
 * Everything the home page says, in one place. Components render this; they contain no copy.
 * Numbers that are product rules come from CONFIG, the same file the backend uses, so the site
 * can never promise something the platform does not do.
 */
import { CONFIG, type Tier } from '@/lib/config';
import { ANCHORS } from '@/lib/routes';

const { poolSharePercent, tierSharePercent } = CONFIG.prize;
const { minPercent, maxPercent } = CONFIG.charity;

/** A headline with one italic-serif word: [before][accent][after]. */
export interface Title {
  before: string;
  accent: string;
  after?: string;
}

export const NAV = [
  { label: 'How it works', href: ANCHORS.how },
  { label: 'Prizes', href: ANCHORS.prizes },
  { label: 'Charities', href: ANCHORS.charities },
  { label: 'Pricing', href: ANCHORS.pricing },
  { label: 'FAQ', href: ANCHORS.faq },
] as const;

export const HERO = {
  eyebrow: 'Scores · Draws · Giving',
  title: { before: 'Every round you play can ', accent: 'give', after: ' something back.' } satisfies Title,
  lead: 'Subscribe, log your latest five scores and join a monthly prize draw. A share of every subscription goes to a charity you choose.',
  primary: 'Subscribe',
  secondary: 'See how it works',
  assurances: ['Monthly or yearly plans', 'Cancel any time', 'Secure payments with Stripe'],
};

/** The scroll story in the hero: a still for the picture, and one caption per camera shot. */
export const STORY = {
  label: 'The story of a round',
  scroll: 'Scroll',
  poster: {
    alt: 'A bronze golfer holds a finish pose on a putting green while a ball arcs away toward the flag.',
    wide: '/models/poster-wide.webp',
    tall: '/models/poster-tall.webp',
  },
  chapters: [
    { kicker: '01', title: 'You play.', text: 'Every round you finish becomes a Stableford score, from 1 to 45.' },
    { kicker: '02', title: 'Your five count.', text: 'Your latest five scores are your entry into the monthly draw.' },
    { kicker: '03', title: 'The draw rolls.', text: 'Five numbers are drawn every month. Match three, four or five and share the prize pool.' },
    { kicker: '04', title: 'And it gives back.', text: 'A share of every subscription goes to the charity you chose.' },
  ],
};

/** One example used by the hero preview and the prizes section, so they always agree. */
export const SAMPLE = {
  scores: [31, 12, 35, 27, 18],
  drawn: [12, 22, 27, 31, 44],
  charityPercent: 15,
};

/** The numbers a member's scores share with the draw, in order. */
export const matchesOf = (scores: readonly number[], drawn: readonly number[]) =>
  scores.filter((s) => drawn.includes(s)).sort((a, b) => a - b);

export const STEPS = [
  { icon: 'heart', title: 'Subscribe', text: 'Pick monthly or yearly, and choose the charity you want to back.' },
  { icon: 'pencil', title: 'Log your scores', text: 'Add your latest Stableford scores, from 1 to 45. We keep your newest five.' },
  { icon: 'sparkles', title: 'Enter the draw', text: 'Your five scores are your entry. Every month five numbers are drawn, and matching three, four or five wins a share of the prize pool.' },
  { icon: 'trophy', title: 'Give and win', text: 'Your charity receives its share every month. Winners upload a quick proof and are paid once it is approved.' },
] as const;

export const HOW = {
  eyebrow: 'How it works',
  title: { before: 'Four steps, ', accent: 'one monthly draw' } satisfies Title,
  lead: 'No handicap tracking, no tee times. Just your scores, a draw, and a cause.',
};

export const FEE_SPLIT = {
  eyebrow: 'Where it goes',
  title: { before: 'Your subscription, ', accent: 'split in the open' } satisfies Title,
  lead: `${poolSharePercent}% of every subscription builds the monthly prize pool. You decide how much goes to charity, from ${minPercent}% up to ${maxPercent}%. The rest keeps the platform running.`,
  sliderLabel: 'Share to your charity',
  parts: {
    pool: { label: 'Prize pool', text: 'Shared between the month\'s winners.' },
    charity: { label: 'Your charity', text: 'Paid to the cause you choose.' },
    platform: { label: 'Running the platform', text: 'Payments, hosting and support.' },
  },
};

export const PRIZES = {
  eyebrow: 'How you win',
  title: { before: 'Three ways to ', accent: 'win', after: ' every month' } satisfies Title,
  lead: 'Your latest five scores are your entry. Each month five numbers between 1 and 45 are drawn. Match three, four or five to win a share of the pool.',
  tiers: [
    { tier: 5 as Tier, name: 'Five numbers', label: 'Jackpot', note: 'Nobody matched all five? The jackpot rolls over into next month.' },
    { tier: 4 as Tier, name: 'Four numbers', label: 'Big win', note: 'Shared equally between everyone who matches four.' },
    { tier: 3 as Tier, name: 'Three numbers', label: 'Winner', note: 'Shared equally between everyone who matches three.' },
  ].map((t) => ({ ...t, share: tierSharePercent[t.tier] })),
  exampleTitle: 'How a match works',
  exampleYours: 'Your scores',
  exampleDrawn: 'The draw',
};

export const CHARITIES = {
  eyebrow: 'Charities',
  title: { before: 'Back a cause ', accent: 'you care about' } satisfies Title,
  lead: `You choose your charity when you subscribe and can change it any time. At least ${minPercent}% of your subscription goes to them, every month.`,
  browse: 'Browse all charities',
};

export const PRICING = {
  eyebrow: 'Pricing',
  title: { before: 'One subscription, ', accent: 'two ways', after: ' to pay' } satisfies Title,
  lead: 'Every plan includes the monthly draw, score tracking and your charity share.',
  features: [
    'Entry into every monthly draw',
    'Track and edit your latest five scores',
    `Give ${minPercent}% to ${maxPercent}% of your fee to a charity you pick`,
    'Cancel any time and keep access until the period ends',
  ],
  cta: 'Choose',
  best: 'Best value',
};

export const FAQ = {
  eyebrow: 'Questions',
  title: { before: 'Good to ', accent: 'know' } satisfies Title,
  lead: 'Anything else? You can also ask us once you have an account.',
  items: [
    {
      q: 'What are Stableford scores?',
      a: 'Stableford is a way of scoring golf where you earn points on each hole, so a higher total is better. You enter the total for a round, a number from 1 to 45.',
    },
    {
      q: 'How does the monthly draw work?',
      a: 'Your latest five scores are your entry. Once a month five numbers between 1 and 45 are drawn. If three, four or five of them match your scores, you win a share of that tier of the prize pool.',
    },
    {
      q: 'What if nobody matches all five?',
      a: 'The five-number jackpot rolls over and joins next month\'s. The four and three-number prizes are only paid when someone matches them.',
    },
    {
      q: 'How do I get paid if I win?',
      a: 'You upload a screenshot of your scores from the golf platform you use. Once our team approves it, your prize is marked as paid.',
    },
    {
      q: 'Can I change my charity or how much it gets?',
      a: `Yes, any time from your dashboard. The minimum is ${minPercent}% of your subscription, and you can give up to ${maxPercent}%.`,
    },
    {
      q: 'Can I cancel?',
      a: 'Any time. You keep access until the end of the period you have paid for, and your score history stays available to read.',
    },
  ],
};

export const FINAL_CTA = {
  title: { before: 'Make your next round ', accent: 'count.' } satisfies Title,
  text: 'Subscribe in a minute, choose your charity and join this month\'s draw.',
  primary: 'Subscribe',
  secondary: 'Meet the charities',
};

export const FOOTER = {
  blurb: 'A subscription that turns your golf scores into a monthly prize draw, with a share of every payment going to a charity you choose.',
  groups: [
    { title: 'Explore', links: [{ label: 'How it works', href: ANCHORS.how }, { label: 'Prizes', href: ANCHORS.prizes }, { label: 'Pricing', href: ANCHORS.pricing }, { label: 'FAQ', href: ANCHORS.faq }] },
  ],
  note: 'Payments are processed by Stripe. We never see your card details.',
};
