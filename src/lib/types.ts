/** Row shapes, matching supabase/migrations. Timestamps and dates arrive as ISO strings. */

export type UserRole = 'member' | 'admin';
export type SubscriptionStatus = 'incomplete' | 'active' | 'past_due' | 'canceled';
export type VerificationStatus = 'awaiting_proof' | 'submitted' | 'approved' | 'rejected';
export type PayoutStatus = 'pending' | 'paid';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  charity_id: string | null;
  charity_percent: number;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  code: 'monthly' | 'yearly';
  name: string;
  interval: 'month' | 'year';
  price_cents: number;
  is_active: boolean;
}

export interface Subscription {
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface Score {
  id: string;
  user_id: string;
  score: number;
  played_on: string;
  created_at: string;
  updated_at: string;
}

export interface Charity {
  id: string;
  slug: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  image_path: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CharityEvent {
  id: string;
  charity_id: string;
  title: string;
  description: string;
  location: string | null;
  event_date: string;
  created_at: string;
}

export interface Draw {
  id: string;
  period: string;
  mode: 'random' | 'algorithmic';
  weighting: 'common' | 'rare' | null;
  status: 'draft' | 'published';
  seed: string | null;
  numbers: number[] | null;
  simulated_at: string | null;
  active_subscribers: number;
  eligible_entries: number;
  base_pool_cents: number;
  rollover_in_cents: number;
  total_pool_cents: number;
  rollover_out_cents: number;
  charity_cents_total: number;
  created_by: string | null;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DrawTier {
  draw_id: string;
  tier: 3 | 4 | 5;
  pool_cents: number;
  winner_count: number;
  prize_each_cents: number;
  retained_cents: number;
  rolled_over_cents: number;
}

export interface DrawEntry {
  draw_id: string;
  user_id: string;
  numbers: number[];
  match_count: number | null;
}

export interface Winner {
  id: string;
  draw_id: string;
  user_id: string;
  tier: 3 | 4 | 5;
  prize_cents: number;
  verification_status: VerificationStatus;
  proof_path: string | null;
  proof_submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  payout_status: PayoutStatus;
  paid_at: string | null;
  paid_by: string | null;
  created_at: string;
}

export interface Donation {
  id: string;
  user_id: string;
  charity_id: string;
  amount_cents: number;
  stripe_session_id: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: number;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
