'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { NAV } from '@/content/home';
import { ROUTES } from '@/lib/routes';

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
        className="grid size-10 place-items-center rounded-pill text-fg transition-colors hover:bg-fg/8"
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
                  className="type-h4 block border-b border-line py-4 text-fg last:border-b-0"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-3">
              <Link href={ROUTES.login} onClick={() => setOpen(false)} className="type-label block py-3 text-fg-muted">
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
