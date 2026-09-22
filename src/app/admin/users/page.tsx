import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Stack } from '@/components/ui/layout';
import { Badge } from '@/components/ui/surface';
import { EmptyRow, Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/table';
import { ADMIN_USERS } from '@/content/admin';
import { requireAdmin } from '@/lib/auth-page';
import { listUsers } from '@/modules/admin/service';

export const metadata: Metadata = { title: 'Users' };

const T = ADMIN_USERS;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { admin } = await requireAdmin();
  const { q } = await searchParams;
  const { items } = await listUsers(admin, { q, limit: 100, offset: 0 });

  const rows = items as Array<{
    id: string;
    full_name: string;
    email: string;
    role: 'member' | 'admin';
    charity_id: string | null;
    created_at: string;
    subscription: { status: string; plan: { name: string } | null } | null;
  }>;

  return (
    <div className="container-page py-block">
      <Stack gap="lg" className="mb-block">
        <h1 className="type-h2 text-fg">{T.title}</h1>
        <form method="get" className="max-w-sm">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={T.searchPlaceholder}
              aria-label={T.searchPlaceholder}
              className="h-12 w-full rounded-lg border border-line bg-surface pr-4 pl-11 type-body text-fg outline-none transition-colors motion-base placeholder:text-fg-muted focus:border-action"
            />
          </div>
        </form>
      </Stack>

      <Table>
        <Thead>
          <Tr>
            <Th>{T.columns.name}</Th>
            <Th>{T.columns.subscription}</Th>
            <Th>{T.columns.joined}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={3}>{T.empty}</EmptyRow>
          ) : (
            rows.map((u) => (
              <Tr key={u.id}>
                <Td>
                  <Link href={`/admin/users/${u.id}`} className="font-semibold text-fg underline-offset-4 hover:underline">
                    {u.full_name || u.email}
                  </Link>
                  <p className="type-small text-fg-muted">{u.email}</p>
                </Td>
                <Td>
                  {u.subscription ? (
                    <Badge variant={u.subscription.status === 'active' ? 'accent' : 'neutral'}>
                      {u.subscription.plan?.name ?? u.subscription.status} {'·'} {u.subscription.status}
                    </Badge>
                  ) : (
                    <span className="text-fg-muted">{T.none}</span>
                  )}
                  {u.role === 'admin' && (
                    <Badge variant="accent" className="ml-2">
                      Admin
                    </Badge>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-fg-muted">{formatDate(u.created_at)}</Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
}
