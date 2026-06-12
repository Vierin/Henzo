import { Suspense } from 'react';
import { ClassShareLanding } from './classShareLanding';

export default function ClassSharePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      }
    >
      <ClassShareLanding />
    </Suspense>
  );
}
