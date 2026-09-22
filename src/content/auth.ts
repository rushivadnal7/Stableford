/** Copy for signup, login and the password-reset flow (kept together: they share the same form). */

export const SIGNUP = {
  eyebrow: 'Create your account',
  title: { before: 'Play, ', accent: 'give', after: ', win.' },
  lead: 'One subscription: track your scores, join the monthly draw and support a charity you choose.',
  sections: {
    account: { title: 'Your account', text: 'Just an email and a password to get started.' },
    plan: { title: 'Choose a plan', text: 'Both include every draw and the full dashboard.' },
    charity: { title: 'Choose a charity', text: 'Change this, or how much they get, any time from your dashboard.' },
  },
  fields: {
    fullName: 'Name',
    email: 'Email',
    password: 'Password',
    passwordHint: 'At least 8 characters.',
    charity: 'Your charity',
    charityPercent: 'Share to your charity',
  },
  terms: 'I agree to the terms and understand my card details go to Stripe, never to Stableford.',
  submit: 'Continue to payment',
  submitting: 'Creating your account…',
  haveAccount: 'Already have an account?',
  signIn: 'Sign in',
  confirmEmail: {
    title: 'Check your email',
    text: (email: string) => `We sent a confirmation link to ${email}. Open it to activate your account, then come back here to sign in.`,
  },
  errors: {
    weakPassword: 'Use at least 8 characters.',
    passwordMismatch: 'Passwords do not match.',
    termsRequired: 'Accept the terms to continue.',
  },
} as const;

export const LOGIN = {
  eyebrow: 'Welcome back',
  title: { before: 'Sign in to ', accent: 'Stableford' },
  lead: 'Enter your scores, check this month’s draw and manage your giving.',
  fields: { email: 'Email', password: 'Password' },
  submit: 'Sign in',
  submitting: 'Signing in…',
  forgot: 'Forgot your password?',
  backToSignIn: 'Back to sign in',
  noAccount: 'New to Stableford?',
  createAccount: 'Create an account',
  reset: {
    title: 'Reset your password',
    lead: 'Enter your email and we will send you a link to choose a new one.',
    submit: 'Send reset link',
    sent: (email: string) => `If ${email} has an account, a reset link is on its way.`,
  },
  setNew: {
    title: 'Choose a new password',
    lead: 'You followed a password reset link. Set a new password to finish.',
    submit: 'Save new password',
    success: 'Password updated. Signing you in…',
  },
} as const;
