
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function POST(request: Request) {
  const { action, token } = await request.json();

  if (action === 'login') {
    const newToken = generateToken();
    await supabase.from('app_sessions').update({ token: newToken }).eq('id', 1);
    return NextResponse.json({ token: newToken });
  }

  if (action === 'verify') {
    const { data } = await supabase.from('app_sessions').select('token').eq('id', 1).single();
    const valid = data?.token === token && token !== 'none';
    return NextResponse.json({ valid });
  }

  if (action === 'logout') {
    await supabase.from('app_sessions').update({ token: 'none' }).eq('id', 1);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' });
}
