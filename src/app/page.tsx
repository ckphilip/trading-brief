'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return start.toDateString() + ' - ' + end.toDateString();
}

export default function Home() {
  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [personalNote, setPersonalNote] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    const { data } = await supabase
      .from('daily_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);
    if (data) setHistory(data);
  }

  async function generateBrief() {
    setBriefLoading(true);
    setBrief('');
    try {
      const rssRes = await fetch('/api/rss');
      const rssData = await rssRes.json();
      const res = await fetch('/api/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headlines: rssData.headlines, personalNote }),
      });
      const data = await res.json();
      setBrief(data.brief);
      fetchHistory();
    } catch {
      setBrief('Error generating brief. Please try again.');
    }
    setBriefLoading(false);
  }

  const grouped = history.reduce((acc: Record<string, any[]>, report) => {
    const week = getWeekLabel(report.created_at);
    if (!acc[week]) acc[week] = [];
    acc[week].push(report);
    return acc;
  }, {});

  function toggleWeek(week: string) {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      next.has(week) ? next.delete(week) : next.add(week);
      return next;
    });
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 4 }}>Trading Brief</h1>
      <p style={{ color: '#888', marginBottom: 32, fontSize: 14 }}>Your daily morning brief powered by your Trading Constitution.</p>

      <div style={{ background: '#000', borderRadius: 8, padding: 24, marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, color: '#fff' }}>Morning Brief</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Add a personal note then generate your daily brief.</p>
        <textarea value={personalNote} onChange={e => setPersonalNote(e.target.value)}
          placeholder="Any personal observations for today... (optional)"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #333', background: '#111', color: '#fff', fontSize: 13, height: 70, boxSizing: 'border-box', marginBottom: 12 }} />
        <button onClick={generateBrief} disabled={briefLoading}
          style={{ background: '#fff', color: '#000', padding: '12px 28px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }}>
          {briefLoading ? 'Generating...' : 'Generate Morning Brief'}
        </button>
        {brief && (
          <div style={{ marginTop: 24, background: '#111', borderRadius: 6, padding: 20, color: '#e2e2e2', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {brief}
          </div>
        )}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Brief History</h2>
      {Object.keys(grouped).length === 0 ? (
        <p style={{ color: '#888', fontSize: 14 }}>No briefs generated yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(grouped).map(([week, reports]) => (
            <div key={week} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
              <div onClick={() => toggleWeek(week)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', background: '#f9f9f9' }}>
                <span style={{ fontWeight: 'bold', fontSize: 14 }}>Week of {week}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#888' }}>{reports.length} brief{reports.length > 1 ? 's' : ''}</span>
                  <span style={{ fontSize: 18, color: '#888' }}>{expandedWeeks.has(week) ? '−' : '+'}</span>
                </div>
              </div>
              {expandedWeeks.has(week) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {reports.map(report => (
                    <div key={report.id} style={{ borderTop: '1px solid #eee' }}>
                      <div onClick={() => setExpanded(expanded === report.id ? null : report.id)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', background: '#fff' }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 'bold' }}>{new Date(report.created_at).toDateString()}</span>
                          <span style={{ marginLeft: 10, fontSize: 12, color: '#aaa' }}>{new Date(report.created_at).toLocaleTimeString()}</span>
                        </div>
                        <span style={{ fontSize: 16, color: '#aaa' }}>{expanded === report.id ? '−' : '+'}</span>
                      </div>
                      {expanded === report.id && (
                        <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0', background: '#fafafa', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#333' }}>
                          {report.full_report}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
