'use client';

import { useEffect, useRef } from 'react';
import { Color } from '@/lib/go/types';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

interface UsePushNotificationOptions {
  roomId: string;
  myColor: Color | null;
}

export function usePushNotification({ roomId, myColor }: UsePushNotificationOptions) {
  const subscribedRef = useRef(false);

  // 서비스 워커 등록 + push 구독 → DB 저장
  useEffect(() => {
    if (!myColor || subscribedRef.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!VAPID_PUBLIC_KEY) return;

    subscribedRef.current = true;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // 이미 알림 권한 거부됐으면 조용히 종료
        if (Notification.permission === 'denied') return;

        // 권한 요청 (처음이면 팝업)
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        // 서버에 구독 정보 저장
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, color: myColor, subscription: sub.toJSON() }),
        });
      } catch {
        // 실패해도 게임에는 영향 없음
      }
    })();
  }, [roomId, myColor]);
}

// 상대방에게 push 알림 전송
export async function notifyOpponent(
  roomId: string,
  myColor: Color,
  title: string,
  body: string
) {
  const targetColor: Color = myColor === 'black' ? 'white' : 'black';
  fetch('/api/push/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, targetColor, title, body }),
  }).catch(() => {});
}
