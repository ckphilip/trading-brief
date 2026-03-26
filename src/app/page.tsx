'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [trades, setTrades] = useState<any[]>([]);
  const [systemState, setSystemState] = useState<any>(null);
  const [ticker, setTicker] = useState('');
  const [setupType, setSetupType] = useState('Income');
  const [result, setResult] = useState('Open');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [personalNote, setPersonalNote] = useState('');

  useEffect(() => {
    fetchTrades();
    fetchSystemState();
  }, []);

  async function fetchTrades() {
    const { data } = await supabase
      .from('trades')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setTrades(data);
  }

  async function fetchSystemState() {
    const { data } = await supabase
      .from('system_state')
      .select('*')
      .eq('id', 1)
      .single();
    if (data) setSystemState(data);
  }

  async function addTrade() {
    if (!ticker || !date) { setMessage('Please fill in ticker and date.'); return; }
    setLoading(true);
    const isLoss = result === 'Loss';
    const isWin = result === 'Win';
    const isOpen = result === 'Open';
    const newActiveTrades = isOpen ? (systemState?.active_trades || 0) + 1 : systemState?.active_trades || 0;
    const newConsecutiveLosses = isLoss ? (systemState?.consecutive_losses || 0) + 1 : isWin ? 0 : systemState?.consecutive_losses || 0;
    const cooldownUntil = newConsecutiveLosses >= 2
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : systemState?.cooldown_until || null;
    const { error } = await supabase.from('trades').insert([{ ticker: ticker.toUpperCase(), setup_type: setupType, result, notes, date }]);
    if (!error) {
      await supabase.from('system_state').update({ active_trades: newActiveTrades, consecutive_losses: newConsecutiveLosses, cooldown_until: cooldownUntil }).eq('id', 1);
      setMessage('Trade saved!');
      setTicker(''); setNotes(''); setDate('');
      fetchTrades(); fetchSystemState();
    } else { setMessage('Error saving trade.'); }
    setLoading(false);
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
    } catch {
      setBrief('Error generating brief. Please try again.');
    }
    setBriefLoading(false);
  }

  const isOnCooldown = systemState?.cooldown_until && new Date(systemState.cooldown_until) > new Date();
  const canTrade = !isOnCooldown && (systemState?.active_trades || 0) < 3;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 4 }}>Trading Brief — Admin</h1>
      <p style={{ color: '#888', marginBottom: 32, fontSize: 14 }}>Your daily trading command centre.</p>

      {/* System Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 20, borderLeft: '4px solid #000' }}>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Active Trades</p>
          <p style={{ fontSize: 32, fontWeight: 'bold' }}>{systemState?.active_trades ?? 0}<span style={{ fontSize: 16, color: '#888' }}>/3</span></p>
        </div>
        <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 20, borderLeft: `4px solid ${(systemState?.consecutive_losses ?? 0) >= 2 ? '#e53e3e' : '#000'}` }}>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Consecutive Losses</p>
          <p style={{ fontSize: 32, fontWeight: 'bold', color: (systemState?.consecutive_losses ?? 0) >= 2 ? '#e53e3e' : '#000' }}>{systemState?.consecutive_losses ?? 0}</p>
        </div>
        <div style={{ background: isOnCooldown ? '#fff5f5' : '#f9f9f9', borderRadius: 8, padding: 20, borderLeft: `4px solid ${isOnCooldown ? '#e53e3e' : '#38a169'}` }}>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Status</p>
          <p style={{ fontSize: 18, fontWeight: 'bold', color: isOnCooldown ? '#e53e3e' : '#38a169' }}>
            {isOnCooldown ? `Cooldown until ${systemState.cooldown_until}` : canTrade ? 'Ready to Trade' : 'Max Trades Reached'}
          </p>
        </div>
      </div>

      {/* Generate Brief */}
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

      {/* Add Trade Form */}
      <div style={{ background: '#f9f9f9', padding: 24, borderRadius: 8, marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Log a Trade</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ticker</label>
            <input type="text" value={ticker} onChange={e => setTicker(e.target.value)} placeholder="e.g. AAPL"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Setup Type</label>
            <select value={setupType} onChange={e => setSetupType(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}>
              <option>Income</option>
              <option>Covered Call</option>
              <option>Iron Condor</option>
              <option>Credit Spread</option>
              <option>Cash Secured Put</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Result</label>
            <select value={result} onChange={e => setResult(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}>
              <option>Open</option>
              <option>Win</option>
              <option>Loss</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, height: 80, boxSizing: 'border-box' }} />
        </div>
        <button onClick={addTrade} disabled={loading}
          style={{ background: '#000', color: '#fff', padding: '12px 28px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }}>
          {loading ? 'Saving...' : 'Add Trade'}
        </button>
        {message && <p style={{ marginTop: 10, fontSize: 13, color: message.includes('Error') ? '#e53e3e' : '#38a169' }}>{message}</p>}
      </div>

      {/* Trade Log */}
      <h2 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Trade Log</h2>
      {trades.length === 0 ? (
        <p style={{ color: '#888', fontSize: 14 }}>No trades logged yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000' }}>
              {['Date', 'Ticker', 'Setup', 'Result', 'Notes'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#888' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.map(trade => (
              <tr key={trade.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px 12px', color: '#666' }}>{trade.date}</td>
                <td style={{ padding: '12px 12px', fontWeight: 'bold' }}>{trade.ticker}</td>
                <td style={{ padding: '12px 12px', color: '#666' }}>{trade.setup_type}</td>
                <td style={{ padding: '12px 12px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold',
                    background: trade.result === 'Win' ? '#f0fff4' : trade.result === 'Loss' ? '#fff5f5' : '#f7f7f7',
                    color: trade.result === 'Win' ? '#38a169' : trade.result === 'Loss' ? '#e53e3e' : '#888'
                  }}>{trade.result}</span>
                </td>
                <td style={{ padding: '12px 12px', color: '#888' }}>{trade.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}