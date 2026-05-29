'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import CreateRoomForm from '@/components/lobby/CreateRoomForm';
import Spinner from '@/components/ui/Spinner';

function CreateRoomContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const nickname = searchParams.get('nickname') || '';

  if (!nickname) {
    router.push('/');
    return null;
  }

  return (
    <main className="min-h-screen bg-go-bg max-w-sm mx-auto p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => router.back()}
          className="text-go-t3 hover:text-go-t2 text-sm transition-colors"
        >
          ← 뒤로
        </button>
        <h1 className="text-base font-semibold text-go-t1 tracking-tight">방 만들기</h1>
      </div>

      {/* Form card */}
      <div className="go-card p-5">
        <CreateRoomForm nickname={nickname} />
      </div>
    </main>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-go-bg flex items-center justify-center">
          <Spinner size="lg" />
        </main>
      }
    >
      <CreateRoomContent />
    </Suspense>
  );
}
