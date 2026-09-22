/** Copy for the admin area (PRD section 11). Kept in one file, like every other page's content. */

export const ADMIN_NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/draws', label: 'Draws' },
  { href: '/admin/charities', label: 'Charities' },
  { href: '/admin/winners', label: 'Winners' },
] as const;

export const ADMIN_OVERVIEW = {
  title: 'Overview',
  stats: {
    total_users: 'Members',
    active_subscribers: 'Active subscribers',
    draws_published: 'Draws published',
    total_prize_pool_cents: 'Total prize pool paid out',
    current_jackpot_cents: 'Current jackpot',
    winners_total: 'Winners, all time',
    pending_verifications: 'Awaiting proof review',
    paid_out_cents: 'Paid to winners',
    pending_payout_cents: 'Approved, not yet paid',
  },
  charityTotals: 'Given to charities',
  charityTotalsEmpty: 'Nothing given yet — no draw has been published.',
  drawStats: 'Draw history',
  drawStatsEmpty: 'No draws published yet.',
  auditTitle: 'Recent admin activity',
  auditEmpty: 'Nothing logged yet.',
} as const;

export const ADMIN_USERS = {
  title: 'Users',
  searchPlaceholder: 'Search name or email…',
  columns: { name: 'Member', subscription: 'Subscription', charity: 'Charity', joined: 'Joined' },
  empty: 'No members match that search.',
  none: '—',
} as const;

export const ADMIN_USER_DETAIL = {
  back: 'All users',
  profile: {
    title: 'Profile',
    nameLabel: 'Name',
    roleLabel: 'Role',
    save: 'Save',
    saved: 'Saved.',
    cannotDemoteSelf: 'You cannot remove your own admin role.',
  },
  subscription: {
    title: 'Subscription',
    planLabel: 'Plan',
    statusLabel: 'Status',
    renewsLabel: 'Renews / ends',
    cancelLabel: 'Cancel at period end',
    save: 'Set subscription',
    saved: 'Subscription updated. A real Stripe webhook will overwrite this if one arrives.',
    none: 'No subscription on record.',
  },
  giving: {
    title: 'Charity & giving',
    charityLabel: 'Charity',
    percentLabel: 'Contribution percent',
    save: 'Save',
    saved: 'Saved.',
    none: 'No charity chosen.',
  },
  scores: {
    title: 'Scores',
    add: 'Add score',
  },
  winnings: {
    title: 'Winnings',
    none: 'No wins.',
  },
  donations: {
    title: 'One-off donations',
    none: 'No donations.',
  },
} as const;

export const ADMIN_DRAWS = {
  title: 'Draws',
  new: 'Open a new draw',
  periodLabel: 'Month (YYYY-MM)',
  modeLabel: 'Mode',
  weightingLabel: 'Weighting',
  create: 'Create draft',
  columns: { period: 'Period', mode: 'Mode', status: 'Status', pool: 'Pool', published: 'Published' },
  empty: 'No draws yet.',
  statusLabel: { draft: 'Draft', published: 'Published' },
} as const;

export const ADMIN_DRAW_DETAIL = {
  back: 'All draws',
  modeCard: {
    title: 'Mode',
    save: 'Save mode',
    saved: 'Mode updated. Any earlier simulation was cleared.',
    lockedNote: 'A published draw cannot be changed.',
  },
  simulate: {
    title: 'Simulate',
    lead: 'A dry run: pool, winners and prizes, without making anything official. Repeat as many times as you like.',
    run: 'Run simulation',
    rerun: 'Run again',
    never: 'Not simulated yet.',
    last: (date: string) => `Last simulated ${date}.`,
  },
  publish: {
    title: 'Publish',
    lead: 'Makes exactly the simulated result official and creates the winners. This cannot be undone.',
    needsSimulation: 'Run a simulation first.',
    confirm: 'Publish this draw? This cannot be undone.',
    button: 'Publish draw',
    published: (date: string) => `Published ${date}.`,
  },
  snapshot: {
    title: 'This draw',
    activeSubscribers: 'Active subscribers',
    eligibleEntries: 'Eligible entries',
    basePool: 'Base pool',
    rolloverIn: 'Jackpot rolled in',
    totalPool: 'Total pool',
  },
  tiers: { title: 'Prize ledger', tier: 'Tier', winners: 'Winners', pool: 'Pool', each: 'Each', rolledOver: 'Rolled over' },
  winners: {
    title: 'Winners',
    previewNote: 'Preview from the last simulation — not official until published.',
    empty: 'No matches of three or more yet.',
    columns: { member: 'Member', numbers: 'Numbers', matches: 'Matches', tier: 'Tier', prize: 'Prize' },
  },
} as const;

export const ADMIN_CHARITIES = {
  title: 'Charities',
  new: 'Add a charity',
  edit: 'Edit',
  columns: { name: 'Charity', category: 'Category', featured: 'Featured', status: 'Status' },
  empty: 'No charities yet.',
  form: {
    nameLabel: 'Name',
    slugLabel: 'Slug',
    slugHint: 'Lowercase letters, numbers and hyphens. Used in the URL.',
    categoryLabel: 'Category',
    summaryLabel: 'Summary',
    descriptionLabel: 'Description',
    imageLabel: 'Image',
    featuredLabel: 'Feature on the home page',
    activeLabel: 'Visible to members',
    save: 'Save charity',
    cancel: 'Cancel',
    uploading: 'Uploading…',
  },
  events: {
    title: 'Events',
    add: 'Add event',
    titleLabel: 'Title',
    dateLabel: 'Date',
    locationLabel: 'Location',
    descriptionLabel: 'Description',
    save: 'Save event',
    empty: 'No events.',
  },
  delete: 'Delete',
  deleteConfirm: 'Delete this charity? One with any history will be hidden instead of deleted.',
  deactivated: 'This charity has history, so it was hidden rather than deleted.',
} as const;

export const ADMIN_WINNERS = {
  title: 'Winners',
  filters: { verification: 'Verification', payout: 'Payout', all: 'All' },
  columns: { member: 'Member', period: 'Draw', tier: 'Tier', prize: 'Prize', verification: 'Verification', payout: 'Payout', proof: 'Proof' },
  empty: 'No winners match that filter.',
  viewProof: 'View proof',
  noProof: 'Not submitted',
  approve: 'Approve',
  reject: 'Reject',
  rejectReasonLabel: 'Reason (shown to the member)',
  markPaid: 'Mark as paid',
  reviewedNote: (name: string) => `Reviewed by ${name}`,
} as const;
