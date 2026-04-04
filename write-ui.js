const fs = require('fs');

fs.writeFileSync('src/app/api/generate-brief/route.ts', `
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const resend = new Resend(process.env.RESEND_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  const { headlines, personalNote, source } = await request.json();
  const sourceLabel = source === 'firecrawl' ? 'Firecrawl (live web scrape)' : 'RSS feeds (global)';
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const todayShort = new Date().toDateString();

  const prompt = \`You are Philip's personal trading coach and morning brief generator. You think like a seasoned options income trader with decades of experience. You are strict, disciplined, and never sugarcoat reality.

CRITICAL: Today's actual date is \${todayDate}. Use this exact date in your brief header. Do not use any other date.

PHILIP'S TRADING CONSTITUTION

Philosophy:
- Objective is to MINIMISE LOSS, not maximise profit
- Whenever possible: LONG stocks, SHORT options
- Holding cash is better than losing cash
- When trade turns sour, exit cleanly
- When satisfied with profit, sell. Do not chase greed
- Wait for the fish to fall into the net. Never chase
- Never violate a hard rule and celebrate it

Money Management:
- Max risk per trade: 4% of total equity
- Max trade size: 10% of total equity
- Max monthly loss: 12% of total equity
- Max active trades: 3
- Max working capital: 30% of total equity
- Cash reserve: minimum 70%, sacred
- 2 consecutive losses = 2 week mandatory cooldown

Entry Rules:
- IV Rank above 30% to sell premium
- IV level below 60%
- Open Interest above 500
- Delta for CSP/CC: 0.30 to 0.40
- Delta for IC short strikes: 0.20 to 0.30
- DTE: 30 to 45 days entry, close or roll at 21 DTE
- Minimum ROI per day: 0.5%
- Only liquid underlyings: SPY, QQQ, IWM, DIA, SPX and large cap stocks

Profit Taking:
- 50% profit rule: close at 50% of max profit if in under 50% of trade duration
- 200% loss rule: close if short option reaches 200% of premium collected

Roll Rules:
- Roll only for net credit
- Never roll same position more than twice
- Roll at 21 DTE not at expiration

Hard Avoidance:
- Never hold short option through earnings, close 5 days before
- No new IC when VIX above 30
- No new positions during FOMC week
- Never force a trade

DATA SOURCE: \${sourceLabel}

TODAY'S MARKET HEADLINES (tagged by region):
\${headlines?.join('\\n') || 'No headlines available'}

Generate Philip's morning trading brief. Be direct, strict, coach-like. No fluff.

Format exactly like this:

MORNING BRIEF - \${todayDate}
Data source: \${sourceLabel}

MARKET CONTEXT
[3 to 5 bullet points covering US, Europe and Asia. Include source region for each point.]

TRADE IDEAS
[Suggest 2 to 3 high probability income setups. For each: Ticker, Strategy, Why now, Entry criteria, DTE, Delta target, Risk note.]

RATIONALE
[2 to 3 sentences. Coach style. Remind Philip of the most relevant rule for today.]\`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const briefContent = message.content[0].type === 'text' ? message.content[0].text : '';

  const { data: inserted } = await supabase.from('daily_reports').insert([{
    date: new Date().toISOString().split('T')[0],
    full_report: briefContent,
    decision: 'TRADE',
    personal_note: '',
  }]).select().single();

  try {
    await resend.emails.send({
      from: 'Trading Brief <brief@ngohiang.com>',
      to: process.env.EMAIL_TO!,
      subject: \`Morning Brief - \${todayShort}\`,
      html: \`<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h1 style="font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">Morning Brief - \${todayShort}</h1><pre style="white-space: pre-wrap; font-family: sans-serif; font-size: 14px; line-height: 1.8;">\${briefContent}</pre><p style="color: #888; font-size: 12px; margin-top: 24px;">Educational purposes only. Not financial advice.</p></div>\`,
    });
  } catch (emailError) {
    console.error('Email failed:', emailError);
  }

  return NextResponse.json({ brief: briefContent, source: sourceLabel, id: inserted?.id || null });
}
`);

console.log('generate-brief done');

fs.writeFileSync('src/app/api/session/route.ts', `
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
`);

console.log('session route done');

fs.writeFileSync('src/app/page.tsx', `
'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CORRECT_PIN = '1209';

function PinGate({ onUnlock }: { onUnlock: (token: string) => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (pin !== CORRECT_PIN) {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 2000);
      return;
    }
    setLoading(true);
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login' }),
    });
    const data = await res.json();
    localStorage.setItem('tb_token', data.token);
    onUnlock(data.token);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ background: '#FFFFFF', borderRadius: 24, padding: '40px 32px', width: 320, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#000', marginBottom: 6, letterSpacing: -0.4 }}>Trading Brief</div>
        <div style={{ fontSize: 14, color: '#6E6E73', marginBottom: 28 }}>Enter your PIN to continue</div>
        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="PIN"
          maxLength={6}
          style={{ width: '100%', background: error ? '#FFF2F2' : '#F2F2F7', border: error ? '1px solid #FF3B30' : '1px solid transparent', borderRadius: 12, padding: '14px 16px', fontSize: 20, textAlign: 'center', letterSpacing: 8, outline: 'none', marginBottom: 16, color: '#000', fontFamily: 'Inter, sans-serif' }}
          autoFocus
        />
        {error && <div style={{ fontSize: 13, color: '#FF3B30', marginBottom: 12 }}>Incorrect PIN. Try again.</div>}
        <button onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', background: loading ? '#AEAEB2' : '#007AFF', color: '#FFFFFF', border: 'none', borderRadius: 14, padding: '16px', fontSize: 17, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Unlocking...' : 'Unlock'}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [personalNote, setPersonalNote] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [currentReportId, setCurrentReportId] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [openYears, setOpenYears] = useState<Set<string>>(new Set());
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<number | null>(null);
  const tokenRef = useRef<string>('');

  useEffect(() => {
    async function checkSession() {
      const token = localStorage.getItem('tb_token');
      if (!token) { setChecking(false); return; }
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', token }),
      });
      const data = await res.json();
      if (data.valid) {
        tokenRef.current = token;
        setUnlocked(true);
        fetchHistory();
      } else {
        localStorage.removeItem('tb_token');
      }
      setChecking(false);
    }
    checkSession();
  }, []);

  async function handleUnlock(token: string) {
    tokenRef.current = token;
    setUnlocked(true);
    fetchHistory();
  }

  async function handleLogout() {
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    localStorage.removeItem('tb_token');
    setUnlocked(false);
    setBrief('');
    setHistory([]);
  }

  async function fetchHistory() {
    const { data } = await supabase.from('daily_reports').select('*').order('created_at', { ascending: false }).limit(200);
    if (data) setHistory(data);
  }

  async function generateBrief() {
    setBriefLoading(true); setBrief(''); setDataSource(''); setCurrentReportId(null); setPublished(false); setPersonalNote('');
    try {
      const rssRes = await fetch('/api/rss');
      const rssData = await rssRes.json();
      const res = await fetch('/api/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headlines: rssData.headlines, personalNote: '', source: rssData.source }),
      });
      const data = await res.json();
      setBrief(data.brief); setDataSource(data.source || ''); setCurrentReportId(data.id || null); fetchHistory();
    } catch { setBrief('Error generating brief. Please try again.'); }
    setBriefLoading(false);
  }

  async function publishNote() {
    if (!currentReportId) return;
    setPublishing(true);
    await supabase.from('daily_reports').update({ personal_note: personalNote }).eq('id', currentReportId);
    setPublished(true); setPublishing(false); fetchHistory();
  }

  async function deleteBrief(id: number) {
    if (!confirm('Delete this brief? This cannot be undone.')) return;
    setDeleting(id);
    await supabase.from('daily_reports').delete().eq('id', id);
    setHistory(prev => prev.filter(r => r.id !== id));
    if (expanded === id) setExpanded(null);
    setDeleting(null);
  }

  const grouped: Record<string, Record<string, Record<string, any[]>>> = {};
  history.forEach(report => {
    const d = new Date(report.created_at);
    const year = d.getFullYear().toString();
    const month = d.toLocaleString('default', { month: 'long' });
    const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay());
    const week = 'Week of ' + weekStart.toDateString();
    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][month]) grouped[year][month] = {};
    if (!grouped[year][month][week]) grouped[year][month][week] = [];
    grouped[year][month][week].push(report);
  });

  const toggle = (set: Set<string>, key: string, setter: Function) => {
    const next = new Set(set); next.has(key) ? next.delete(key) : next.add(key); setter(next);
  };

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#6E6E73' }}>Loading...</div>
    </div>
  );

  if (!unlocked) return <PinGate onUnlock={handleUnlock} />;

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7' }}>
      <div style={{ background: 'rgba(242,242,247,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(60,60,67,0.12)', padding: '12px 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#000', letterSpacing: -0.4 }}>Trading Brief</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: '#6E6E73' }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <button onClick={handleLogout}
              style={{ background: 'none', border: '1px solid rgba(60,60,67,0.2)', borderRadius: 8, padding: '6px 12px', fontSize: 13, color: '#6E6E73', cursor: 'pointer' }}>
              Lock
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'System', value: 'Online', dot: '#34C759' },
            { label: 'Constitution', value: 'Active', dot: '#007AFF' },
            { label: 'Feeds', value: '45 Global', dot: '#FF9500' },
          ].map((item, i) => (
            <div key={i} style={{ background: '#FFFFFF', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, color: '#6E6E73', fontWeight: 500, marginBottom: 6 }}>{item.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.dot }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#000' }}>{item.value}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#000', marginBottom: 2 }}>Morning Brief</div>
            <div style={{ fontSize: 13, color: '#6E6E73', marginBottom: 16 }}>Generate your daily trading brief then add your personal note before publishing</div>
            <button onClick={generateBrief} disabled={briefLoading}
              style={{ width: '100%', background: briefLoading ? '#AEAEB2' : '#007AFF', color: '#FFFFFF', border: 'none', borderRadius: 14, padding: '16px', fontSize: 17, fontWeight: 600, cursor: briefLoading ? 'not-allowed' : 'pointer', letterSpacing: -0.2 }}>
              {briefLoading ? 'Generating...' : 'Generate Morning Brief'}
            </button>
            {dataSource && <div style={{ marginTop: 8, fontSize: 12, color: '#AEAEB2', textAlign: 'center' }}>Source: {dataSource}</div>}
          </div>

          {brief && (
            <>
              <div style={{ borderTop: '1px solid rgba(60,60,67,0.12)', padding: '20px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#007AFF', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Brief Output</div>
                <div style={{ fontSize: 15, lineHeight: 1.8, color: '#000', whiteSpace: 'pre-wrap' }}>{brief}</div>
              </div>
              <div style={{ borderTop: '1px solid rgba(60,60,67,0.12)', padding: '20px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#000', marginBottom: 4 }}>Personal Note</div>
                <div style={{ fontSize: 13, color: '#6E6E73', marginBottom: 12 }}>Add your view after reading the brief, then publish to ngohiang.com/daily</div>
                <textarea value={personalNote} onChange={e => setPersonalNote(e.target.value)}
                  placeholder="Share your personal observation or view for today..."
                  style={{ width: '100%', background: '#F2F2F7', border: 'none', borderRadius: 12, padding: '12px 14px', color: '#000', fontSize: 15, fontFamily: 'Inter, sans-serif', height: 100, resize: 'none', outline: 'none', lineHeight: 1.5, marginBottom: 12 }} />
                <button onClick={publishNote} disabled={publishing || published}
                  style={{ width: '100%', background: published ? '#34C759' : publishing ? '#AEAEB2' : '#1A1A1A', color: '#FFFFFF', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 600, cursor: publishing || published ? 'not-allowed' : 'pointer' }}>
                  {published ? 'Published to ngohiang.com/daily' : publishing ? 'Publishing...' : 'Publish to Daily Page'}
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4 }}>Brief Archive</div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {Object.keys(grouped).length === 0 ? (
            <div style={{ padding: '20px', fontSize: 15, color: '#6E6E73', textAlign: 'center' }}>No briefs yet</div>
          ) : (
            Object.entries(grouped).map(([year, months], yi) => (
              <div key={year}>
                {yi > 0 && <div style={{ height: 1, background: 'rgba(60,60,67,0.12)', marginLeft: 20 }} />}
                <div onClick={() => toggle(openYears, year, setOpenYears)}
                  style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 17, fontWeight: 600, color: '#000' }}>{year}</span>
                  <span style={{ fontSize: 22, color: '#AEAEB2', fontWeight: 300 }}>{openYears.has(year) ? '−' : '+'}</span>
                </div>
                {openYears.has(year) && Object.entries(months).map(([month, weeks]) => (
                  <div key={month}>
                    <div style={{ height: 1, background: 'rgba(60,60,67,0.08)', marginLeft: 20 }} />
                    <div onClick={() => toggle(openMonths, year+month, setOpenMonths)}
                      style={{ padding: '12px 20px 12px 32px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
                      <span style={{ fontSize: 15, fontWeight: 500, color: '#000' }}>{month}</span>
                      <span style={{ fontSize: 20, color: '#AEAEB2', fontWeight: 300 }}>{openMonths.has(year+month) ? '−' : '+'}</span>
                    </div>
                    {openMonths.has(year+month) && Object.entries(weeks).map(([week, reports]) => (
                      <div key={week}>
                        <div style={{ height: 1, background: 'rgba(60,60,67,0.06)', marginLeft: 32 }} />
                        <div onClick={() => toggle(openWeeks, year+month+week, setOpenWeeks)}
                          style={{ padding: '10px 20px 10px 44px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: 13, color: '#6E6E73' }}>{week}</span>
                            <span style={{ fontSize: 12, color: '#AEAEB2', marginLeft: 8 }}>{(reports as any[]).length} brief{(reports as any[]).length > 1 ? 's' : ''}</span>
                          </div>
                          <span style={{ fontSize: 18, color: '#AEAEB2', fontWeight: 300 }}>{openWeeks.has(year+month+week) ? '−' : '+'}</span>
                        </div>
                        {openWeeks.has(year+month+week) && (reports as any[]).map((report: any) => (
                          <div key={report.id}>
                            <div style={{ height: 1, background: 'rgba(60,60,67,0.06)', marginLeft: 44 }} />
                            <div style={{ padding: '10px 20px 10px 56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
                              <div onClick={() => setExpanded(expanded === report.id ? null : report.id)} style={{ cursor: 'pointer', flex: 1 }}>
                                <span style={{ fontSize: 13, color: '#000', fontWeight: 500 }}>{new Date(report.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                <span style={{ fontSize: 12, color: '#AEAEB2', marginLeft: 8 }}>{new Date(report.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                {report.personal_note && <span style={{ fontSize: 11, color: '#34C759', marginLeft: 8 }}>Published</span>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button onClick={() => deleteBrief(report.id)} disabled={deleting === report.id}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#FF3B30', fontWeight: 500, padding: '4px 8px', borderRadius: 6 }}>
                                  {deleting === report.id ? '...' : 'Delete'}
                                </button>
                                <svg onClick={() => setExpanded(expanded === report.id ? null : report.id)} style={{ cursor: 'pointer' }} width="10" height="16" viewBox="0 0 10 16" fill="none">
                                  <path d={expanded === report.id ? 'M1 12L5 8L9 12' : 'M1 4L5 8L9 4'} stroke="#AEAEB2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                            </div>
                            {expanded === report.id && (
                              <div style={{ padding: '16px 20px 16px 56px', background: '#F8F8F8', borderTop: '1px solid rgba(60,60,67,0.06)' }}>
                                <div style={{ fontSize: 14, lineHeight: 1.8, color: '#3C3C43', whiteSpace: 'pre-wrap' }}>{report.full_report}</div>
                                {report.personal_note && (
                                  <div style={{ marginTop: 16, padding: '12px 16px', background: '#F0FFF4', borderRadius: 10, borderLeft: '3px solid #34C759' }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#34C759', marginBottom: 6 }}>PERSONAL NOTE</div>
                                    <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.6 }}>{report.personal_note}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 12, color: '#AEAEB2' }}>
          Trading Brief · For educational purposes only · Not financial advice
        </div>
      </div>
    </div>
  );
}
`);

console.log('page.tsx done');