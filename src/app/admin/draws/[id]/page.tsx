import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DrawWorkspace } from '@/components/admin/draw-workspace';
import { ADMIN_DRAW_DETAIL } from '@/content/admin';
import { requireAdmin } from '@/lib/auth-page';
import { getDrawDetail } from '@/modules/draws/service';

export const metadata: Metadata = { title: 'Draw' };

export default async function AdminDrawDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const detail = await getDrawDetail(admin, id).catch(() => null);
  if (!detail) notFound();

  return (
    <div className="container-page py-block">
      <Link href="/admin/draws" className="type-small mb-block inline-flex items-center gap-2 text-fg-muted transition-colors motion-base hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        {ADMIN_DRAW_DETAIL.back}
      </Link>
      <h1 className="type-h2 mb-block text-fg">{detail.draw.period}</h1>
      <DrawWorkspace initial={detail} />
    </div>
  );
}
