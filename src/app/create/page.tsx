'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import CreateRoomForm from '@/components/lobby/CreateRoomForm';

function CreateRoomContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const nickname = searchParams.get('nickname') || '';

  if (!nickname) {
    router.push('/');
    return null;
  }

  return (
    <main className="min-h-screen max-w-sm mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-stone-500 hover:text-stone-800"
        >
          &larr; Back
        </button>
        <h1 className="text-xl font-bold text-stone-900">Create Room</h1>
      </div>
      <CreateRoomForm nickname={nickname} />
    </main>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-500">Loading...</div>}>
      <CreateRoomContent />
    </Suspense>
  );
}
