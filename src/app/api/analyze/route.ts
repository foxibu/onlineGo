import { NextRequest, NextResponse } from 'next/server';

const KATAGO_URL = process.env.KATAGO_URL || 'http://katago:8080';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resp = await fetch(`${KATAGO_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(35_000),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: text }, { status: resp.status });
    }

    return NextResponse.json(await resp.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
