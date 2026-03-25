'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [trades, setTrades] = useState<any[]>([]);
  const [ticker, setTicker] = useState('');
  const [setupType, setSetupType] = useState('Income');
  const [result, setResult] = useState('Open');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchTrades();
  }, []);

  async function fetchTrades() {
    const { data } = await supabase
      .from('trades')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setTrades(data);
  }

  async function addTrade() {
    if (!ticker || !date) {
      setMessage('Please fill in ticker and date.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('trades').insert([{
      ticker: ticker.toUpperCase(),
      setup_type: setupType,
      result,
      notes,
      date,
    }]);
    if (error) {
      setMessage('Error saving trade.');
    } else {
      setMessage('Trade saved!');
      setTicker('');
      setNotes('');
      setDate('');
      fetchTrades();
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Trading Brief — Admin</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Log your trades below.</p>
      <div style={{ background: '#f9f9f9', padding: 24, borderRadius: 8, marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Add New Trade</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Ticker</label>
            <input type="text" value={ticker} onChange={e => setTicker(e.target.value)} placeholder="e.g. AAPL"
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Setup Type</label>
            <select value={setupType} onChange={e => setSetupType(e.target.value)}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}>
              <option>Income</option>
              <option>Covered Call</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Result</label>
            <select value={result} onChange={e => setResult(e.target.value)}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}>
              <option>Open</option>
              <option>Win</option>
              <option>Loss</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..."
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', height: 80 }} />
        </div>
        <button onClick={addTrade} disabled={loading}
          style={{ background: '#000', color: '#fff', padding: '10px 24px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 14 }}>
          {loading ? 'Saving...' : 'Add Trade'}
        </button>
        {message && <p style={{ marginTop: 8, color: message.includes('Error') ? 'red' : 'green' }}>{message}</p>}
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Trade Log</h2>
      {trades.length === 0 ? (
        <p style={{ color: '#666' }}>No trades logged yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: 10, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Date</th>
              <th style={{ padding: 10, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Ticker</th>
              <th style={{ padding: 10, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Setup</th>
              <th style={{ padding: 10, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Result</th>
              <th style={{ padding: 10, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {trades.map(trade => (
              <tr key={trade.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>{trade.date}</td>
                <td style={{ padding: 10, fontWeight: 'bold' }}>{trade.ticker}</td>
                <td style={{ padding: 10 }}>{trade.setup_type}</td>
                <td style={{ padding: 10, color: trade.result === 'Win' ? 'green' : trade.result === 'Loss' ? 'red' : '#888' }}>
                  {trade.result}
                </td>
                <td style={{ padding: 10, color: '#666' }}>{trade.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}