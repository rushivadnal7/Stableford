'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Cluster } from '@/components/ui/layout';
import { ADMIN_NAV } from '@/content/admin';
import { cn } from '@/lib/cn';

/** Highlights the current section; `/admin/users/[id]` still highlights "Users". */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="container-page">
      <Cluster gap="sm" className="py-3">
        {ADMIN_NAV.map((item) => {
          const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'inline-flex min-h-touch items-center rounded-pill border px-4 type-label transition-colors motion-base',
                active ? 'border-action bg-action text-on-action' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </Cluster>
    </nav>
  );
}
