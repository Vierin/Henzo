'use client';

import { useParams } from 'next/navigation';
import { EditTrainingForm } from '@/components/owner/editTrainingForm';

export default function EditTrainingPage() {
  const params = useParams<{ id: string }>();
  return <EditTrainingForm trainingId={params.id} />;
}
