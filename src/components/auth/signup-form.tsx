'use client';

import { Loader2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, FormNotice, Select, TextInput } from '@/components/ui/field';
import { Stack } from '@/components/ui/layout';
import { Card } from '@/components/ui/surface';
import { SIGNUP } from '@/content/auth';
import { apiPatch, apiPost, ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { CONFIG } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { ROUTES } from '@/lib/routes';
import { browserClient } from '@/lib/supabase/browser';

export interface SignupCharity {
  id: string;
  slug: string;
  name: string;
  category: string;
}
export interface SignupPlan {
  code: 'monthly' | 'yearly';
  name: string;
  interval: 'month' | 'year';
  price_cents: number;
}

/** Supabase's own wording is written for a developer console, not a visitor; translate the common ones. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('already registered') || m.includes('already exists')) {
    return 'An account with that email already exists. Try signing in instead.';
  }
  if (m.includes('password')) return 'Choose a password with at least 8 characters.';
  if (m.includes('rate limit')) return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('invalid') && m.includes('email')) return 'Enter a valid email address.';
  return message;
}

export function SignupForm({
  charities,
  plans,
  defaultPlan,
  defaultCharityId,
}: {
  charities: SignupCharity[];
  plans: SignupPlan[];
  defaultPlan?: 'monthly' | 'yearly';
  defaultCharityId?: string;
}) {
  const ids = { name: useId(), email: useId(), password: useId(), confirm: useId(), charity: useId(), percent: useId() };

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [planCode, setPlanCode] = useState<'monthly' | 'yearly'>(defaultPlan ?? plans[0]?.code ?? 'monthly');
  const [charityId, setCharityId] = useState(defaultCharityId ?? charities[0]?.id ?? '');
  const [charityPercent, setCharityPercent] = useState<number>(CONFIG.charity.defaultPercent);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [status, setStatus] = useState<'idle' | 'submitting' | 'confirm-email' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ password?: string; terms?: string }>({});

  const plan = plans.find((p) => p.code === planCode) ?? plans[0];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldError({});

    const next: typeof fieldError = {};
    if (password.length < 8) next.password = SIGNUP.errors.weakPassword;
    else if (password !== confirmPassword) next.password = SIGNUP.errors.passwordMismatch;
    if (!acceptedTerms) next.terms = SIGNUP.errors.termsRequired;
    if (Object.keys(next).length > 0) {
      setFieldError(next);
      return;
    }

    setStatus('submitting');
    try {
      const supabase = browserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, charity_id: charityId, charity_percent: charityPercent },
          emailRedirectTo: `${location.origin}${ROUTES.login}?confirmed=1&plan=${planCode}`,
        },
      });
      if (signUpError) throw signUpError;

      if (!data.session) {
        // The usual path: email confirmation is required before a session exists.
        setStatus('confirm-email');
        return;
      }

      // A session came back immediately (confirmation disabled on this project). Finish setup now.
      await apiPatch('/api/me', { charity_id: charityId, charity_percent: charityPercent });
      const { url } = await apiPost<{ url: string }>('/api/checkout', { plan_code: planCode });
      location.href = url;
    } catch (err) {
      setStatus('error');
      if (err instanceof ApiClientError) setError(err.message);
      else if (err instanceof Error) setError(friendlyAuthError(err.message));
      else setError('Something went wrong. Try again.');
    }
  }

  if (status === 'confirm-email') {
    return (
      <Card className="text-center">
        <Stack gap="md" className="items-center">
          <h2 className="type-h3 text-fg">{SIGNUP.confirmEmail.title}</h2>
          <p className="type-body max-w-copy text-fg-muted">{SIGNUP.confirmEmail.text(email)}</p>
        </Stack>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate>
        <Stack gap="xl">
          <Stack gap="md">
            <div>
              <h2 className="type-h4 text-fg">{SIGNUP.sections.account.title}</h2>
              <p className="type-small text-fg-muted">{SIGNUP.sections.account.text}</p>
            </div>
            <Field label={SIGNUP.fields.fullName} htmlFor={ids.name}>
              <TextInput id={ids.name} name="name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label={SIGNUP.fields.email} htmlFor={ids.email} required>
              <TextInput
                id={ids.email}
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label={SIGNUP.fields.password} htmlFor={ids.password} required hint={fieldError.password ? undefined : SIGNUP.fields.passwordHint} error={fieldError.password}>
              <TextInput
                id={ids.password}
                type="password"
                name="new-password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                invalid={!!fieldError.password}
              />
            </Field>
            <Field label="Confirm password" htmlFor={ids.confirm} required>
              <TextInput
                id={ids.confirm}
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                invalid={!!fieldError.password}
              />
            </Field>
          </Stack>

          <Stack gap="md">
            <div>
              <h2 className="type-h4 text-fg">{SIGNUP.sections.plan.title}</h2>
              <p className="type-small text-fg-muted">{SIGNUP.sections.plan.text}</p>
            </div>
            <div role="radiogroup" aria-label={SIGNUP.sections.plan.title} className="grid grid-cols-1 gap-3 xs:grid-cols-2">
              {plans.map((p) => {
                const selected = p.code === planCode;
                return (
                  <label
                    key={p.code}
                    className={cn(
                      'flex min-h-touch cursor-pointer items-center justify-between gap-3 rounded-lg border p-card transition-colors motion-base',
                      selected ? 'border-action' : 'border-line',
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="plan"
                        value={p.code}
                        checked={selected}
                        onChange={() => setPlanCode(p.code)}
                        className="size-5 shrink-0 accent-action"
                      />
                      <span className="type-label text-fg">{p.name}</span>
                    </span>
                    <span className="type-num text-fg-muted">
                      {formatMoney(p.price_cents)}/{p.interval}
                    </span>
                  </label>
                );
              })}
            </div>
          </Stack>

          <Stack gap="md">
            <div>
              <h2 className="type-h4 text-fg">{SIGNUP.sections.charity.title}</h2>
              <p className="type-small text-fg-muted">{SIGNUP.sections.charity.text}</p>
            </div>
            <Field label={SIGNUP.fields.charity} htmlFor={ids.charity} required>
              <Select id={ids.charity} required value={charityId} onChange={(e) => setCharityId(e.target.value)}>
                {charities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor={ids.percent} className="type-label text-fg">
                  {SIGNUP.fields.charityPercent}
                </label>
                <output htmlFor={ids.percent} className="type-num text-lg text-accent-text">
                  {charityPercent}%
                </output>
              </div>
              <input
                id={ids.percent}
                type="range"
                min={CONFIG.charity.minPercent}
                max={CONFIG.charity.maxPercent}
                step={1}
                value={charityPercent}
                onChange={(e) => setCharityPercent(Number(e.target.value))}
                className="mt-2 h-touch w-full cursor-pointer accent-action"
              />
              <div className="type-num mt-1 flex justify-between text-xs text-fg-muted">
                <span>{CONFIG.charity.minPercent}%</span>
                <span>{CONFIG.charity.maxPercent}%</span>
              </div>
            </div>
          </Stack>

          <Checkbox label={SIGNUP.terms} checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} required />
          {fieldError.terms && (
            <p role="alert" className="type-small -mt-3 text-danger">
              {fieldError.terms}
            </p>
          )}

          {error && <FormNotice>{error}</FormNotice>}

          <Button type="submit" size="lg" className="w-full" disabled={status === 'submitting'}>
            {status === 'submitting' ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {SIGNUP.submitting}
              </>
            ) : plan ? (
              `${SIGNUP.submit} — ${formatMoney(plan.price_cents)}/${plan.interval}`
            ) : (
              SIGNUP.submit
            )}
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
