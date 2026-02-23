import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { roomId, color, subscription } = await req.json();
    if (!roomId || !color || !subscription) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ room_id: roomId, color, subscription, updated_at: new Date().toISOString() },
               { onConflict: 'room_id,color' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
