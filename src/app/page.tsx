'use client';
import { useState } from 'react';

export default function Home() {
  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [personalNote, setPersonalNote] = useState('');

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
    } catch {
      setBrief('Error generating brief. Please try again.');
    }
    setBriefLoading(false);
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 4 }}>Trading Brief</h1>
      <p style={{ color: '#888', marginBottom: 32, fontSize: 14 }}>Your daily morning brief — powered by your Trading Constitution.</p>

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
    </div>
  );
}
