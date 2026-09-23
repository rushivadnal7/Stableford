import type { Metadata } from 'next';
import Link from 'next/link';
import { DrawCreateForm } from '@/components/admin/draw-create-form';
import { Stack } from '@/components/ui/layout';
import { Badge } from '@/components/ui/surface';
import { EmptyRow, Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/table';
import { ADMIN_DRAWS } from '@/content/admin';
import { formatMoney } from '@/lib/format';
import { requireAdmin } from '@/lib/auth-page';
import { listDraws } from '@/modules/draws/service';

export const metadata: Metadata = { title: 'Draws' };
const T = ADMIN_DRAWS;

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export default async function AdminDrawsPage() {
  const { admin } = await requireAdmin();
  const draws = await listDraws(admin);

  return (
    <div className="container-page py-block">
      <Stack gap="lg" className="mb-block">
        <h1 className="type-h2 text-fg">{T.title}</h1>
        <DrawCreateForm />
      </Stack>

      <Table>
        <Thead>
          <Tr>
            <Th>{T.columns.period}</Th>
            <Th>{T.columns.mode}</Th>
            <Th>{T.columns.status}</Th>
            <Th>{T.columns.pool}</Th>
            <Th>{T.columns.published}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {draws.length === 0 ? (
            <EmptyRow colSpan={5}>{T.empty}</EmptyRow>
          ) : (
            draws.map((d) => (
              <Tr key={d.id}>
                <Td>
                  <Link href={`/admin/draws/${d.id}`} className="font-semibold text-fg underline-offset-4 hover:underline">
                    {d.period}
                  </Link>
                </Td>
                <Td className="capitalize">
                  {d.mode}
                  {d.weighting ? ` (${d.weighting})` : ''}
                </Td>
                <Td>
                  <Badge variant={d.status === 'published' ? 'accent' : 'neutral'}>{T.statusLabel[d.status]}</Badge>
                </Td>
                <Td className="type-num">{formatMoney(d.total_pool_cents)}</Td>
                <Td className="text-fg-muted">{formatDate(d.published_at)}</Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
}
