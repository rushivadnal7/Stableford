import type { Metadata } from 'next';
import { Grid, Stack } from '@/components/ui/layout';
import { Card } from '@/components/ui/surface';
import { Table, Tbody, Td, EmptyRow, Th, Thead, Tr } from '@/components/ui/table';
import { ADMIN_OVERVIEW } from '@/content/admin';
import { formatMoney } from '@/lib/format';
import { requireAdmin } from '@/lib/auth-page';
import { getReport, listAudit } from '@/modules/admin/service';

export const metadata: Metadata = { title: 'Admin overview' };

interface Report {
  total_users: number;
  active_subscribers: number;
  draws_published: number;
  total_prize_pool_cents: number;
  current_jackpot_cents: number;
  winners_total: number;
  pending_verifications: number;
  paid_out_cents: number;
  pending_payout_cents: number;
  charity_totals: Array<{ charity_id: string; name: string; subscription_cents: number; donation_cents: number; total_cents: number }>;
  draw_stats: Array<{ period: string; mode: string; active_subscribers: number; eligible_entries: number; total_pool_cents: number; rollover_out_cents: number; winners: number }>;
}

const T = ADMIN_OVERVIEW;

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="type-small text-fg-muted">{label}</p>
      <p className="type-num mt-2 text-2xl text-fg">{value}</p>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  const { admin } = await requireAdmin();
  const [report, audit] = await Promise.all([getReport(admin) as Promise<Report>, listAudit(admin, 15)]);

  return (
    <div className="container-page py-block">
      <Stack gap="lg" className="mb-block">
        <h1 className="type-h2 text-fg">{T.title}</h1>
      </Stack>

      <Grid cols={3}>
        <Stat label={T.stats.total_users} value={report.total_users} />
        <Stat label={T.stats.active_subscribers} value={report.active_subscribers} />
        <Stat label={T.stats.draws_published} value={report.draws_published} />
        <Stat label={T.stats.total_prize_pool_cents} value={formatMoney(report.total_prize_pool_cents)} />
        <Stat label={T.stats.current_jackpot_cents} value={formatMoney(report.current_jackpot_cents)} />
        <Stat label={T.stats.winners_total} value={report.winners_total} />
        <Stat label={T.stats.pending_verifications} value={report.pending_verifications} />
        <Stat label={T.stats.paid_out_cents} value={formatMoney(report.paid_out_cents)} />
        <Stat label={T.stats.pending_payout_cents} value={formatMoney(report.pending_payout_cents)} />
      </Grid>

      <Grid cols={2} className="mt-block items-start">
        <Card>
          <h2 className="type-h4 mb-4 text-fg">{T.charityTotals}</h2>
          {report.charity_totals.length === 0 ? (
            <p className="type-body text-fg-muted">{T.charityTotalsEmpty}</p>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Charity</Th>
                  <Th>Total</Th>
                </Tr>
              </Thead>
              <Tbody>
                {report.charity_totals.map((c) => (
                  <Tr key={c.charity_id}>
                    <Td>{c.name}</Td>
                    <Td className="type-num">{formatMoney(c.total_cents)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>

        <Card>
          <h2 className="type-h4 mb-4 text-fg">{T.drawStats}</h2>
          {report.draw_stats.length === 0 ? (
            <p className="type-body text-fg-muted">{T.drawStatsEmpty}</p>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Period</Th>
                  <Th>Pool</Th>
                  <Th>Winners</Th>
                </Tr>
              </Thead>
              <Tbody>
                {report.draw_stats.map((d) => (
                  <Tr key={d.period}>
                    <Td>{d.period}</Td>
                    <Td className="type-num">{formatMoney(d.total_pool_cents)}</Td>
                    <Td className="type-num">{d.winners}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </Grid>

      <Card className="mt-block">
        <h2 className="type-h4 mb-4 text-fg">{T.auditTitle}</h2>
        <Table>
          <Thead>
            <Tr>
              <Th>When</Th>
              <Th>Admin</Th>
              <Th>Action</Th>
              <Th>On</Th>
            </Tr>
          </Thead>
          <Tbody>
            {audit.length === 0 ? (
              <EmptyRow colSpan={4}>{T.auditEmpty}</EmptyRow>
            ) : (
              audit.map((entry: { id: number; created_at: string; action: string; entity: string; entity_id: string | null; actor: { full_name: string; email: string } | null }) => (
                <Tr key={entry.id}>
                  <Td className="whitespace-nowrap">{new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Td>
                  <Td>{entry.actor?.full_name || entry.actor?.email || '—'}</Td>
                  <Td>{entry.action}</Td>
                  <Td className="text-fg-muted">
                    {entry.entity}
                    {entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ''}
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
