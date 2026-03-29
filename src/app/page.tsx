'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [personalNote, setPersonalNote] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [openYears, setOpenYears] = useState<Set<string>>(new Set());
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(new Set());

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    const { data } = await supabase
      .from('daily_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
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

  const grouped: Record<string, Record<string, Record<string, any[]>>> = {};
  history.forEach(report => {
    const d = new Date(report.created_at);
    const year = d.getFullYear().toString();
    const month = d.toLocaleString('default', { month: 'long' });
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const week = 'Week of ' + weekStart.toDateString();
    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][month]) grouped[year][month] = {};
    if (!grouped[year][month][week]) grouped[year][month][week] = [];
    grouped[year][month][week].push(report);
  });

  const toggle = (set: Set<string>, key: string, setter: Function) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  };

  const rowStyle = (depth: number) => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px ' + (16 + depth * 12) + 'px',
    cursor: 'pointer',
    background: depth === 0 ? '#f0f0f0' : depth === 1 ? '#f9f9f9' : '#fff',
    borderTop: '1px solid #eee'
  });

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
        <p style={{ color: '#888', fontSize: 14 }}>No briefs yet.</p>
      ) : (
        <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
          {Object.entries(grouped).map(([year, months]) => (
            <div key={year}>
              <div onClick={() => toggle(openYears, year, setOpenYears)} style={rowStyle(0)}>
                <span style={{ fontWeight: 'bold', fontSize: 15 }}>{year}</span>
                <span style={{ color: '#888' }}>{openYears.has(year) ? '−' : '+'}</span>
              </div>
              {openYears.has(year) && Object.entries(months).map(([month, weeks]) => (
                <div key={month}>
                  <div onClick={() => toggle(openMonths, year+month, setOpenMonths)} style={rowStyle(1)}>
                    <span style={{ fontWeight: 'bold', fontSize: 14 }}>{month}</span>
                    <span style={{ color: '#aaa' }}>{openMonths.has(year+month) ? '−' : '+'}</span>
                  </div>
                  {openMonths.has(year+month) && Object.entries(weeks).map(([week, reports]) => (
                    <div key={week}>
                      <div onClick={() => toggle(openWeeks, year+month+week, setOpenWeeks)} style={rowStyle(2)}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 'bold' }}>{week}</span>
                          <span style={{ marginLeft: 8, fontSize: 11, color: '#aaa' }}>{reports.length} brief{reports.length > 1 ? 's' : ''}</span>
                        </div>
                        <span style={{ color: '#bbb' }}>{openWeeks.has(year+month+week) ? '−' : '+'}</span>
                      </div>
                      {openWeeks.has(year+month+week) && reports.map(report => (
                        <div key={report.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                          <div onClick={() => setExpanded(expanded === report.id ? null : report.id)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 52px', cursor: 'pointer', background: '#fff' }}>
                            <div>
                              <span style={{ fontSize: 13 }}>{new Date(report.created_at).toDateString()}</span>
                              <span style={{ marginLeft: 8, fontSize: 11, color: '#aaa' }}>{new Date(report.created_at).toLocaleTimeString()}</span>
                            </div>
                            <span style={{ fontSize: 14, color: '#bbb' }}>{expanded === report.id ? '−' : '+'}</span>
                          </div>
                          {expanded === report.id && (
                            <div style={{ padding: '16px 52px', borderTop: '1px solid #f5f5f5', background: '#fafafa', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#333' }}>
                              {report.full_report}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
