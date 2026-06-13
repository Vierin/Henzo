'use client';

import { use } from 'react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { StudioHubContent } from '@/components/admin/studioHubContent';

export default function AdminStudioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <AdminGuard>
      <StudioHubContent studioId={id} />
    </AdminGuard>
  );
}
