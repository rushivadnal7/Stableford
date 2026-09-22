/** Copy for the member dashboard (PRD section 10). */

export const DASHBOARD = {
  welcomeBack: (name: string) => `Welcome back${name ? `, ${name}` : ''}.`,
  checkoutSuccess: 'You’re subscribed. Your first draw entry is your next five scores.',

  subscription: {
    title: 'Subscription',
    active: 'Active',
    pastDue: 'Payment failed',
    canceled: 'Cancelled',
    none: 'No active plan',
    renews: (date: string) => `Renews ${date}`,
    endsAt: (date: string) => `Ends ${date}`,
    manage: 'Manage billing',
    chooseCharityFirst: 'Choose a charity below, then subscribe to join the draw.',
    subscribe: (plan: string, price: string) => `Subscribe — ${plan} ${price}`,
  },

  scores: {
    title: 'Your scores',
    lead: 'Your latest five are your entry into the monthly draw. A new one bumps off the oldest.',
    empty: 'No scores yet. Add your first round below.',
    add: 'Add a score',
    scoreLabel: 'Stableford score',
    dateLabel: 'Date played',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    deleteConfirm: 'Delete this score?',
    subscriberOnly: 'An active subscription is required to add or change scores. Your history is still here to read.',
  },

  giving: {
    title: 'Your giving',
    lead: 'Change your charity or how much they get, any time.',
    percentLabel: 'Share to your charity',
    save: 'Save changes',
    saved: 'Saved.',
    noneSelected: 'No charity selected yet.',
    noneAvailable: 'No charities are set up yet. Check back soon.',
  },

  draws: {
    title: 'Draws',
    upcoming: (period: string) => `Next draw: ${period}`,
    eligible: 'Your five scores are in — you’re entered.',
    notEligible: 'Add five scores to be entered in the next draw.',
    entered: (n: number) => `Entered ${n} draw${n === 1 ? '' : 's'}`,
    recentTitle: 'Recent results',
    none: 'No draws yet.',
    matches: (n: number) => (n > 0 ? `${n} match${n === 1 ? '' : 'es'}` : 'No match'),
  },

  winnings: {
    title: 'Winnings',
    total: 'Total won',
    paid: 'Paid',
    pending: 'Pending',
    none: 'No wins yet — good luck next month.',
    tier: (n: number) => `${n}-number match`,
    verification: { awaiting_proof: 'Upload your proof', submitted: 'Under review', approved: 'Approved', rejected: 'Rejected — resubmit' },
    payout: { pending: 'Payment pending', paid: 'Paid' },
    uploadProof: 'Upload proof',
    uploading: 'Uploading…',
    proofSubmitted: 'Proof submitted. An admin will review it shortly.',
  },

  profile: {
    title: 'Profile',
    nameLabel: 'Name',
    emailLabel: 'Email',
    save: 'Save',
    saved: 'Saved.',
  },

  signOut: 'Sign out',
} as const;
