import type { ReactNode } from 'react';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { requireUser } from '@/lib/auth-page';

/**
 * The shell for the signed-in area (currently just the dashboard). Every page under here requires a
 * session; check it once, here, rather than in each page. `requireUser()` redirects to /login if not.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireUser();
  return (
    <>
      <DashboardHeader name={profile.full_name || profile.email} />
      <main id="main">{children}</main>
    </>
  );
}
