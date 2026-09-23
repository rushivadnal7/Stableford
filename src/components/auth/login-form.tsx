'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FormNotice, TextInput } from '@/components/ui/field';
import { Stack } from '@/components/ui/layout';
import { Card } from '@/components/ui/surface';
import { LOGIN } from '@/content/auth';
import { ROUTES, signupHref } from '@/lib/routes';
import { browserClient } from '@/lib/supabase/browser';

type Mode = 'checking' | 'sign-in' | 'reset' | 'reset-sent' | 'set-new-password' | 'password-updated';

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Wrong email or password.';
  if (m.includes('email not confirmed')) return 'Confirm your email first — check your inbox for the link we sent.';
  if (m.includes('rate limit')) return 'Too many attempts. Wait a minute and try again.';
  return message;
}

export function LoginForm({ next }: { next: string }) {
  const ids = { email: useId(), password: useId(), resetEmail: useId(), newPassword: useId() };
  const supabase = browserClient();

  // The caller (an admin-only page redirecting here, a "next" deep link, etc.) always wins. Only
  // the plain, unspecified case — visiting /login directly, landing on the default dashboard — asks
  // who just signed in, so an admin goes straight to their panel instead of an empty member view.
  async function landingPath(userId: string): Promise<string> {
    if (next !== ROUTES.dashboard) return next;
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
    return data?.role === 'admin' ? ROUTES.admin : ROUTES.dashboard;
  }

  // A password-recovery link, or an email-confirmation link, lands here with a session Supabase's
  // client already established from the URL. Detect which, before showing the ordinary sign-in form.
  const [mode, setMode] = useState<Mode>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('set-new-password');
      } else if (event === 'SIGNED_IN' && session && mode === 'checking') {
        // A confirmation link, or an already-open session: go straight in.
        void landingPath(session.user.id).then((path) => (location.href = path));
      }
    });
    // If neither event fires shortly (a plain visit, no link), fall back to the sign-in form.
    const timer = setTimeout(() => setMode((m) => (m === 'checking' ? 'sign-in' : m)), 700);
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once; `mode` is read via the updater form above
  }, []);

  async function onSignIn(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      location.href = await landingPath(data.user.id);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? friendlyAuthError(err.message) : 'Something went wrong.');
    }
  }

  async function onRequestReset(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    // Supabase answers the same way whether or not the address has an account, so this can't be used
    // to check who is a member; the UI mirrors that (see LOGIN.reset.sent).
    await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo: `${location.origin}${ROUTES.login}` });
    setBusy(false);
    setMode('reset-sent');
  }

  async function onSetNewPassword(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const { data: updated, error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setMode('password-updated');
      const path = await landingPath(updated.user.id);
      setTimeout(() => (location.href = path), 1200);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? friendlyAuthError(err.message) : 'Something went wrong.');
    }
  }

  if (mode === 'checking') {
    return (
      <Card className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-fg-muted" aria-hidden />
      </Card>
    );
  }

  if (mode === 'set-new-password' || mode === 'password-updated') {
    return (
      <Card>
        <Stack gap="lg">
          <div>
            <h1 className="type-h3 text-fg">{LOGIN.setNew.title}</h1>
            <p className="type-body mt-2 text-fg-muted">{LOGIN.setNew.lead}</p>
          </div>
          {mode === 'password-updated' ? (
            <FormNotice tone="success">{LOGIN.setNew.success}</FormNotice>
          ) : (
            <form onSubmit={onSetNewPassword} noValidate>
              <Stack gap="lg">
                <Field label={LOGIN.fields.password} htmlFor={ids.newPassword} required>
                  <TextInput
                    id={ids.newPassword}
                    type="password"
                    name="new-password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </Field>
                {error && <FormNotice>{error}</FormNotice>}
                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : LOGIN.setNew.submit}
                </Button>
              </Stack>
            </form>
          )}
        </Stack>
      </Card>
    );
  }

  if (mode === 'reset' || mode === 'reset-sent') {
    return (
      <Card>
        <Stack gap="lg">
          <div>
            <h1 className="type-h3 text-fg">{LOGIN.reset.title}</h1>
            <p className="type-body mt-2 text-fg-muted">{LOGIN.reset.lead}</p>
          </div>
          {mode === 'reset-sent' ? (
            <FormNotice tone="success">{LOGIN.reset.sent(resetEmail)}</FormNotice>
          ) : (
            <form onSubmit={onRequestReset} noValidate>
              <Stack gap="lg">
                <Field label={LOGIN.fields.email} htmlFor={ids.resetEmail} required>
                  <TextInput
                    id={ids.resetEmail}
                    type="email"
                    autoComplete="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </Field>
                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : LOGIN.reset.submit}
                </Button>
              </Stack>
            </form>
          )}
          <button type="button" onClick={() => setMode('sign-in')} className="type-small inline-flex min-h-touch items-center self-start text-fg-muted underline underline-offset-4">
            {LOGIN.backToSignIn}
          </button>
        </Stack>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSignIn} noValidate>
        <Stack gap="lg">
          <Field label={LOGIN.fields.email} htmlFor={ids.email} required>
            <TextInput id={ids.email} type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={LOGIN.fields.password} htmlFor={ids.password} required>
            <TextInput
              id={ids.password}
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <button
            type="button"
            onClick={() => {
              setResetEmail(email);
              setMode('reset');
            }}
            className="type-small inline-flex min-h-touch items-center self-start text-fg-muted underline underline-offset-4"
          >
            {LOGIN.forgot}
          </button>

          {error && <FormNotice>{error}</FormNotice>}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {LOGIN.submitting}
              </>
            ) : (
              LOGIN.submit
            )}
          </Button>

          <p className="type-small text-center text-fg-muted">
            {LOGIN.noAccount}{' '}
            <a href={signupHref()} className="font-semibold text-accent-text underline underline-offset-4">
              {LOGIN.createAccount}
            </a>
          </p>
        </Stack>
      </form>
    </Card>
  );
}
