'use client';

import { use } from 'react';
import { StudioHubContent } from '@/components/admin/studioHubContent';

export default function AdminStudioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <StudioHubContent studioId={id} />;
}
