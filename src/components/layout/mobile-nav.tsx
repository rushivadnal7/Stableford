'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { NAV } from '@/content/home';
import { ROUTES, signupHref } from '@/lib/routes';

/** The menu for screens below the desktop breakpoint. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((value) => !value)}
        className="grid size-touch place-items-center rounded-pill text-fg transition-[background-color,transform] motion-fast hover:bg-fg/8 active:scale-90"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>

      {open && (
        <nav id={panelId} aria-label="Mobile" className="absolute inset-x-0 top-full animate-fade-up border-b border-line bg-canvas shadow-lift">
          <ul className="container-page flex flex-col py-3">
            {NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={`${ROUTES.home}${link.href}`}
                  onClick={() => setOpen(false)}
                  className="type-h4 flex min-h-touch items-center border-b border-line py-4 text-fg transition-[color,transform] motion-base hover:translate-x-1 hover:text-accent-text active:bg-fg/5"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="flex flex-wrap items-center gap-3 pt-4 pb-2">
              <ButtonLink href={signupHref()} size="md" arrow onClick={() => setOpen(false)}>
                Subscribe
              </ButtonLink>
              <ButtonLink href={ROUTES.login} size="md" variant="secondary" onClick={() => setOpen(false)}>
                Sign in
              </ButtonLink>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
