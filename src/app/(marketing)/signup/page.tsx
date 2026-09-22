import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignupForm, type SignupCharity, type SignupPlan } from '@/components/auth/signup-form';
import { Eyebrow, RichTitle } from '@/components/ui/heading';
import { Split, Stack } from '@/components/ui/layout';
import { Section } from '@/components/ui/section';
import { FALLBACK_CHARITIES, FALLBACK_PLANS } from '@/content/fallback';
import { SIGNUP } from '@/content/auth';
import { HERO } from '@/content/home';
import { unwrap } from '@/lib/db';
import { pageUser } from '@/lib/auth-page';
import { ROUTES } from '@/lib/routes';
import { anonClient } from '@/lib/supabase/user';
import { listCharities } from '@/modules/charities/service';

export const metadata: Metadata = { title: 'Create your account' };

async function getSignupOptions(): Promise<{ charities: SignupCharity[]; plans: SignupPlan[] }> {
  try {
    const db = anonClient();
    const [charities, plans] = await Promise.all([
      listCharities(db, { limit: 100, offset: 0 }),
      db.from('plans').select('code, name, interval, price_cents').eq('is_active', true).order('price_cents'),
    ]);
    const planRows = unwrap(plans) as SignupPlan[];
    if (planRows.length === 0 || charities.items.length === 0) throw new Error('No plans or charities found');
    return { charities: charities.items, plans: planRows };
  } catch {
    return { charities: FALLBACK_CHARITIES, plans: FALLBACK_PLANS };
  }
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; charity?: string }>;
}) {
  // Already signed in: nothing to do here.
  if (await pageUser()) redirect(ROUTES.dashboard);

  const { plan, charity } = await searchParams;
  const { charities, plans } = await getSignupOptions();
  const defaultPlan = plan === 'monthly' || plan === 'yearly' ? plan : undefined;
  const defaultCharityId = charity ? charities.find((c) => c.slug === charity)?.id : undefined;

  return (
    <Section contained className="pt-block">
      <Split
        ratio="5-7"
        align="start"
        first={
          <Stack gap="lg" className="lg:sticky lg:top-header lg:pt-block">
            <Eyebrow className="flex items-center gap-3">
              <span aria-hidden="true" className="size-2 rounded-pill bg-accent" />
              {SIGNUP.eyebrow}
            </Eyebrow>
            <h1 className="type-h1 max-w-narrow text-fg">
              <RichTitle {...SIGNUP.title} />
            </h1>
            <p className="type-lead max-w-copy">{SIGNUP.lead}</p>
            <ul className="type-small flex flex-col gap-2 text-fg-muted">
              {HERO.assurances.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span aria-hidden="true" className="size-1.5 rounded-pill bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="type-small text-fg-muted">
              {SIGNUP.haveAccount}{' '}
              <a href={ROUTES.login} className="font-semibold text-accent-text underline underline-offset-4">
                {SIGNUP.signIn}
              </a>
            </p>
          </Stack>
        }
        second={<SignupForm charities={charities} plans={plans} defaultPlan={defaultPlan} defaultCharityId={defaultCharityId} />}
      />
    </Section>
  );
}
