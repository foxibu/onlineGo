import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return NextResponse.json({ ok: false, reason: 'VAPID not configured' });
  }
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'go@example.com'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  try {
    const { roomId, targetColor, title, body, url } = await req.json();
    if (!roomId || !targetColor) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    // 대상 플레이어의 push subscription 조회
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('room_id', roomId)
      .eq('color', targetColor)
      .single();

    if (error || !data) return NextResponse.json({ ok: false, reason: 'no subscription' });

    await webpush.sendNotification(
      data.subscription,
      JSON.stringify({ title, body, url: url || `/room/${roomId}`, tag: roomId })
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    // 구독 만료 등의 오류는 무시
    return NextResponse.json({ ok: false, reason: String(e) });
  }
}
