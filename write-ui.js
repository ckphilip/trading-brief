const fs = require('fs');

fs.writeFileSync('src/app/globals.css', `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg: #F2F2F7;
  --surface: #FFFFFF;
  --surface2: #F2F2F7;
  --border: rgba(0,0,0,0.08);
  --text: #000000;
  --text-secondary: #6E6E73;
  --text-tertiary: #AEAEB2;
  --accent: #007AFF;
  --green: #34C759;
  --orange: #FF9500;
  --red: #FF3B30;
  --separator: rgba(60,60,67,0.12);
}
html { font-size: 16px; -webkit-font-smoothing: antialiased; }
body { background: var(--bg); color: var(--text); font-family: 'Inter', -apple-system, sans-serif; min-height: 100vh; }
* { -webkit-tap-highlight-color: transparent; }
`);

fs.writeFileSync('src/app/page.tsx', `
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
  const [dataSource, setDataSource] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [openYears, setOpenYears] = useState<Set<string>>(new Set());
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(new Set());

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    const { data } = await supabase.from('daily_reports').select('*').order('created_at', { ascending: false }).limit(200);
    if (data) setHistory(data);
  }

  async function generateBrief() {
    setBriefLoading(true); setBrief(''); setDataSource('');
    try {
      const rssRes = await fetch('/api/rss');
      const rssData = await rssRes.json();
      const res = await fetch('/api/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headlines: rssData.headlines, personalNote, source: rssData.source }),
      });
      const data = await res.json();
      setBrief(data.brief); setDataSource(data.source || ''); fetchHistory();
    } catch { setBrief('Error generating brief. Please try again.'); }
    setBriefLoading(false);
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

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7' }}>

      {/* Nav bar */}
      <div style={{ background: 'rgba(242,242,247,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(60,60,67,0.12)', padding: '12px 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#000', letterSpacing: -0.4 }}>Trading Brief</span>
          <span style={{ fontSize: 13, color: '#6E6E73', fontWeight: 400 }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 40px' }}>

        {/* Status cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'System', value: 'Online', dot: '#34C759' },
            { label: 'Constitution', value: 'Active', dot: '#007AFF' },
            { label: 'Feeds', value: '30 Global', dot: '#FF9500' },
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

        {/* Generate card */}
        <div style={{ background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '16px 20px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#000', marginBottom: 2 }}>Morning Brief</div>
            <div style={{ fontSize: 13, color: '#6E6E73', marginBottom: 16 }}>Generate your daily trading brief</div>
            <textarea
              value={personalNote}
              onChange={e => setPersonalNote(e.target.value)}
              placeholder="Personal observations for today..."
              style={{ width: '100%', background: '#F2F2F7', border: 'none', borderRadius: 12, padding: '12px 14px', color: '#000', fontSize: 15, fontFamily: 'Inter, sans-serif', height: 88, resize: 'none', outline: 'none', lineHeight: 1.5, marginBottom: 12 }}
            />
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            <button
              onClick={generateBrief}
              disabled={briefLoading}
              style={{ width: '100%', background: briefLoading ? '#AEAEB2' : '#007AFF', color: '#FFFFFF', border: 'none', borderRadius: 14, padding: '16px', fontSize: 17, fontWeight: 600, cursor: briefLoading ? 'not-allowed' : 'pointer', letterSpacing: -0.2 }}
            >
              {briefLoading ? 'Generating...' : 'Generate Morning Brief'}
            </button>
            {dataSource && <div style={{ marginTop: 8, fontSize: 12, color: '#AEAEB2', textAlign: 'center' }}>Source: {dataSource}</div>}
          </div>
          {brief && (
            <div style={{ borderTop: '1px solid rgba(60,60,67,0.12)', padding: '20px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#007AFF', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Brief Output</div>
              <div style={{ fontSize: 15, lineHeight: 1.8, color: '#000', whiteSpace: 'pre-wrap', fontWeight: 400 }}>{brief}</div>
            </div>
          )}
        </div>

        {/* Archive */}
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
                  <span style={{ fontSize: 22, color: '#AEAEB2', fontWeight: 300, lineHeight: 1 }}>{openYears.has(year) ? '−' : '+'}</span>
                </div>
                {openYears.has(year) && Object.entries(months).map(([month, weeks], mi) => (
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
                            <div onClick={() => setExpanded(expanded === report.id ? null : report.id)}
                              style={{ padding: '10px 20px 10px 56px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
                              <div>
                                <span style={{ fontSize: 13, color: '#000', fontWeight: 500 }}>{new Date(report.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                <span style={{ fontSize: 12, color: '#AEAEB2', marginLeft: 8 }}>{new Date(report.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
                                <path d={expanded === report.id ? 'M1 12L5 8L9 12' : 'M1 4L5 8L9 4'} stroke="#AEAEB2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            {expanded === report.id && (
                              <div style={{ padding: '16px 20px 16px 56px', background: '#F8F8F8', borderTop: '1px solid rgba(60,60,67,0.06)' }}>
                                <div style={{ fontSize: 14, lineHeight: 1.8, color: '#3C3C43', whiteSpace: 'pre-wrap' }}>{report.full_report}</div>
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

console.log('done');
