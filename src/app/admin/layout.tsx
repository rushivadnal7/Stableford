import type { ReactNode } from 'react';
import { AdminNav } from '@/components/admin/admin-nav';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { requireAdmin } from '@/lib/auth-page';

/** Gates the whole /admin section: signed in and role="admin", or redirected away. See requireAdmin(). */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireAdmin();
  return (
    <>
      <DashboardHeader name={profile.full_name || profile.email} />
      <div className="border-b border-line bg-canvas-alt">
        <AdminNav />
      </div>
      <main id="main">{children}</main>
    </>
  );
}
